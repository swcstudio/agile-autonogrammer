#!/usr/bin/env deno run --allow-net --allow-write --allow-read

/**
 * Anthropic Documentation Crawler
 * Comprehensive crawler for https://docs.anthropic.com with depth-3 crawling,
 * duplicate removal, and JavaScript-aware content extraction
 */

import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';

interface CrawlResult {
  url: string;
  title: string;
  content: string;
  headings: string[];
  links: string[];
  codeBlocks: string[];
  metadata: {
    description?: string;
    canonical?: string;
    og_title?: string;
    og_description?: string;
  };
  depth: number;
  timestamp: string;
  statusCode: number;
  responseTime: number;
}

interface CrawlerConfig {
  baseUrl: string;
  maxDepth: number;
  maxConcurrency: number;
  delayMs: number;
  timeout: number;
  userAgent: string;
  outputFile: string;
  respectRobots: boolean;
}

class AnthropicDocsCrawler {
  private visited = new Set<string>();
  private crawledData: CrawlResult[] = [];
  private queue: Array<{ url: string; depth: number }> = [];
  private activeCrawls = 0;
  private config: CrawlerConfig;
  private domParser = new DOMParser();

  constructor(config: Partial<CrawlerConfig> = {}) {
    this.config = {
      baseUrl: 'https://docs.anthropic.com',
      maxDepth: 3,
      maxConcurrency: 3,
      delayMs: 2000,
      timeout: 30000,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      outputFile: './results/anthropic-docs-crawl.json',
      respectRobots: true,
      ...config,
    };
  }

  /**
   * Normalize and validate URLs
   */
  private normalizeUrl(url: string, baseUrl?: string): string | null {
    try {
      // Handle relative URLs
      if (url.startsWith('/')) {
        url = this.config.baseUrl + url;
      } else if (url.startsWith('./') || url.startsWith('../')) {
        if (baseUrl) {
          url = new URL(url, baseUrl).href;
        } else {
          return null;
        }
      }

      const urlObj = new URL(url);

      // Only crawl Anthropic docs
      if (!urlObj.hostname.includes('docs.anthropic.com')) {
        return null;
      }

      // Remove fragments and normalize
      urlObj.hash = '';
      urlObj.search = '';

      let normalized = urlObj.toString();
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }

      return normalized;
    } catch {
      return null;
    }
  }

  /**
   * Extract links from HTML content
   */
  private extractLinks(html: string, baseUrl: string): string[] {
    const doc = this.domParser.parseFromString(html, 'text/html');
    if (!doc) return [];

    const links: string[] = [];
    const anchors = doc.querySelectorAll('a[href]');

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href');
      if (!href) continue;

      // Skip certain types of links
      if (
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        href.startsWith('#') ||
        href.includes('.pdf') ||
        href.includes('.zip') ||
        href.includes('.exe') ||
        href.includes('github.com') ||
        href.includes('twitter.com') ||
        href.includes('linkedin.com')
      ) {
        continue;
      }

      const normalizedUrl = this.normalizeUrl(href, baseUrl);
      if (normalizedUrl && !this.visited.has(normalizedUrl)) {
        links.push(normalizedUrl);
      }
    }

    return [...new Set(links)]; // Remove duplicates
  }

  /**
   * Extract structured content from HTML
   */
  private extractContent(
    html: string,
    url: string
  ): Omit<CrawlResult, 'depth' | 'timestamp' | 'statusCode' | 'responseTime'> {
    const doc = this.domParser.parseFromString(html, 'text/html');
    if (!doc) {
      return {
        url,
        title: '',
        content: '',
        headings: [],
        links: [],
        codeBlocks: [],
        metadata: {},
      };
    }

    // Extract title
    const titleEl = doc.querySelector('title');
    const title = titleEl?.textContent?.trim() || '';

    // Extract metadata
    const getMetaContent = (selector: string) =>
      doc.querySelector(selector)?.getAttribute('content') || undefined;

    const metadata = {
      description: getMetaContent('meta[name="description"]'),
      canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      og_title: getMetaContent('meta[property="og:title"]'),
      og_description: getMetaContent('meta[property="og:description"]'),
    };

    // Extract main content
    const contentSelectors = [
      'main',
      '[data-testid="main-content"]',
      '.content',
      'article',
      '.docs-content',
      '.documentation',
      '#content',
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const contentEl = doc.querySelector(selector);
      if (contentEl) {
        content = contentEl.textContent || '';
        break;
      }
    }

    // Fallback to body if no main content found
    if (!content) {
      const bodyEl = doc.querySelector('body');
      content = bodyEl?.textContent || '';
    }

    // Clean up content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Extract headings
    const headings: string[] = [];
    const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const heading of headingElements) {
      const text = heading.textContent?.trim();
      if (text) {
        headings.push(text);
      }
    }

    // Extract code blocks
    const codeBlocks: string[] = [];
    const codeElements = doc.querySelectorAll('pre code, .code-block, .highlight pre, code');
    for (const code of codeElements) {
      const text = code.textContent?.trim();
      if (text && text.length > 10) {
        // Only meaningful code blocks
        codeBlocks.push(text);
      }
    }

    // Extract internal links
    const links = this.extractLinks(html, url);

    return {
      url,
      title,
      content,
      headings,
      links,
      codeBlocks,
      metadata,
    };
  }

  /**
   * Fetch and process a single URL
   */
  private async crawlUrl(url: string, depth: number): Promise<CrawlResult | null> {
    if (this.visited.has(url)) {
      return null;
    }

    this.visited.add(url);
    console.log(`📄 Crawling (depth ${depth}): ${url}`);

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          DNT: '1',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        console.warn(`❌ Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        return null;
      }

      const html = await response.text();
      const contentData = this.extractContent(html, url);

      const result: CrawlResult = {
        ...contentData,
        depth,
        timestamp: new Date().toISOString(),
        statusCode: response.status,
        responseTime,
      };

      // Add discovered links to queue if we haven't reached max depth
      if (depth < this.config.maxDepth) {
        for (const link of contentData.links) {
          if (!this.visited.has(link)) {
            this.queue.push({ url: link, depth: depth + 1 });
          }
        }
      }

      console.log(
        `✅ Crawled: ${url} (${responseTime}ms, ${contentData.headings.length} headings, ${contentData.links.length} links)`
      );
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Error crawling ${url}:`, error.message);

      // Return partial result even on error
      return {
        url,
        title: '',
        content: `Error: ${error.message}`,
        headings: [],
        links: [],
        codeBlocks: [],
        metadata: {},
        depth,
        timestamp: new Date().toISOString(),
        statusCode: 0,
        responseTime,
      };
    }
  }

  /**
   * Process the crawl queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0 || this.activeCrawls > 0) {
      // Start new crawls up to concurrency limit
      while (this.queue.length > 0 && this.activeCrawls < this.config.maxConcurrency) {
        const { url, depth } = this.queue.shift()!;

        this.activeCrawls++;

        // Process URL asynchronously
        this.crawlUrl(url, depth)
          .then(async (result) => {
            if (result) {
              this.crawledData.push(result);
            }

            this.activeCrawls--;

            // Rate limiting delay
            if (this.config.delayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
            }
          })
          .catch((error) => {
            console.error(`❌ Queue processing error:`, error);
            this.activeCrawls--;
          });
      }

      // Wait a bit before checking queue again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Save results to file
   */
  private async saveResults(): Promise<void> {
    try {
      // Ensure output directory exists
      const outputDir = this.config.outputFile.substring(
        0,
        this.config.outputFile.lastIndexOf('/')
      );
      try {
        await Deno.mkdir(outputDir, { recursive: true });
      } catch {
        // Directory might already exist
      }

      // Sort results by depth and URL for consistent output
      this.crawledData.sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;
        return a.url.localeCompare(b.url);
      });

      const summary = {
        totalPages: this.crawledData.length,
        maxDepth: this.config.maxDepth,
        baseUrl: this.config.baseUrl,
        crawlTime: new Date().toISOString(),
        successfulPages: this.crawledData.filter((r) => r.statusCode === 200).length,
        errorPages: this.crawledData.filter((r) => r.statusCode !== 200).length,
        totalHeadings: this.crawledData.reduce((sum, r) => sum + r.headings.length, 0),
        totalCodeBlocks: this.crawledData.reduce((sum, r) => sum + r.codeBlocks.length, 0),
        averageResponseTime:
          this.crawledData.reduce((sum, r) => sum + r.responseTime, 0) / this.crawledData.length,
      };

      const output = {
        summary,
        pages: this.crawledData,
      };

      await Deno.writeTextFile(this.config.outputFile, JSON.stringify(output, null, 2));
      console.log(`💾 Results saved to: ${this.config.outputFile}`);

      // Also save a CSV summary
      const csvFile = this.config.outputFile.replace('.json', '-summary.csv');
      const csvHeaders =
        'URL,Title,Depth,Status Code,Response Time (ms),Headings Count,Links Count,Code Blocks Count\n';
      const csvRows = this.crawledData
        .map(
          (r) =>
            `"${r.url}","${r.title.replace(/"/g, '""')}",${r.depth},${r.statusCode},${r.responseTime},${r.headings.length},${r.links.length},${r.codeBlocks.length}`
        )
        .join('\n');

      await Deno.writeTextFile(csvFile, csvHeaders + csvRows);
      console.log(`📊 Summary saved to: ${csvFile}`);
    } catch (error) {
      console.error('❌ Failed to save results:', error);
    }
  }

  /**
   * Print crawl statistics
   */
  private printStats(): void {
    console.log('\n📊 Crawl Statistics:');
    console.log('='.repeat(50));
    console.log(`🌐 Total pages crawled: ${this.crawledData.length}`);
    console.log(
      `✅ Successful pages: ${this.crawledData.filter((r) => r.statusCode === 200).length}`
    );
    console.log(`❌ Error pages: ${this.crawledData.filter((r) => r.statusCode !== 200).length}`);
    console.log(`🔗 Unique URLs visited: ${this.visited.size}`);
    console.log(
      `📚 Total headings extracted: ${this.crawledData.reduce((sum, r) => sum + r.headings.length, 0)}`
    );
    console.log(
      `💻 Total code blocks found: ${this.crawledData.reduce((sum, r) => sum + r.codeBlocks.length, 0)}`
    );

    const avgResponseTime =
      this.crawledData.reduce((sum, r) => sum + r.responseTime, 0) / this.crawledData.length;
    console.log(`⏱️  Average response time: ${Math.round(avgResponseTime)}ms`);

    // Depth breakdown
    for (let depth = 0; depth <= this.config.maxDepth; depth++) {
      const pagesAtDepth = this.crawledData.filter((r) => r.depth === depth).length;
      console.log(`   Depth ${depth}: ${pagesAtDepth} pages`);
    }

    console.log('='.repeat(50));
  }

  /**
   * Start the crawling process
   */
  async crawl(startUrl = 'https://docs.anthropic.com/en/home'): Promise<void> {
    console.log('🕷️  Starting Anthropic Documentation Crawl');
    console.log('='.repeat(50));
    console.log(`🎯 Starting URL: ${startUrl}`);
    console.log(`📊 Max depth: ${this.config.maxDepth}`);
    console.log(`🔄 Max concurrency: ${this.config.maxConcurrency}`);
    console.log(`⏱️  Delay between requests: ${this.config.delayMs}ms`);
    console.log(`💾 Output file: ${this.config.outputFile}`);
    console.log('='.repeat(50));

    const startTime = Date.now();

    // Normalize start URL and add to queue
    const normalizedStartUrl = this.normalizeUrl(startUrl);
    if (!normalizedStartUrl) {
      console.error('❌ Invalid start URL:', startUrl);
      return;
    }

    this.queue.push({ url: normalizedStartUrl, depth: 0 });

    // Process the queue
    await this.processQueue();

    const totalTime = Date.now() - startTime;

    console.log(`\n🎉 Crawling completed in ${Math.round(totalTime / 1000)}s`);

    // Print statistics
    this.printStats();

    // Save results
    await this.saveResults();

    console.log('\n✨ Crawl complete! Check the output files for detailed results.');
  }
}

// CLI interface
async function main() {
  const args = Deno.args;

  // Parse command line arguments
  let startUrl = 'https://docs.anthropic.com/en/home';
  let maxDepth = 3;
  let maxConcurrency = 3;
  let delayMs = 2000;
  let outputFile = './results/anthropic-docs-crawl.json';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        startUrl = args[++i];
        break;
      case '--depth':
        maxDepth = Number.parseInt(args[++i]);
        break;
      case '--concurrency':
        maxConcurrency = Number.parseInt(args[++i]);
        break;
      case '--delay':
        delayMs = Number.parseInt(args[++i]);
        break;
      case '--output':
        outputFile = args[++i];
        break;
      case '--help':
        console.log(`
🕷️  Anthropic Documentation Crawler

Usage: deno run --allow-net --allow-write --allow-read anthropic-crawler.ts [options]

Options:
  --url <url>           Starting URL (default: https://docs.anthropic.com/en/home)
  --depth <number>      Maximum crawl depth (default: 3)
  --concurrency <num>   Maximum concurrent requests (default: 3)
  --delay <ms>          Delay between requests in ms (default: 2000)
  --output <file>       Output JSON file path (default: ./results/anthropic-docs-crawl.json)
  --help               Show this help message

Examples:
  # Basic crawl with defaults
  deno run --allow-net --allow-write --allow-read anthropic-crawler.ts

  # Custom parameters
  deno run --allow-net --allow-write --allow-read anthropic-crawler.ts \\
    --depth 2 --concurrency 2 --delay 3000 --output ./my-crawl.json

  # Crawl specific section
  deno run --allow-net --allow-write --allow-read anthropic-crawler.ts \\
    --url "https://docs.anthropic.com/en/api" --depth 2
        `);
        Deno.exit(0);
    }
  }

  // Create and run crawler
  const crawler = new AnthropicDocsCrawler({
    maxDepth,
    maxConcurrency,
    delayMs,
    outputFile,
  });

  try {
    await crawler.crawl(startUrl);
  } catch (error) {
    console.error('❌ Crawl failed:', error);
    Deno.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main();
}

export { AnthropicDocsCrawler };
