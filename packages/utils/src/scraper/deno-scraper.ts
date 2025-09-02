#!/usr/bin/env -S deno run --allow-net --allow-write --allow-read --allow-env

/**
 * Advanced MDX Web Scraper for Deno
 * Multimodal scraping with proper hierarchy and MDX output
 */

import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { ensureDir } from 'https://deno.land/std@0.224.0/fs/mod.ts';
import { dirname, extname, join } from 'https://deno.land/std@0.224.0/path/mod.ts';
import { DOMParser, type Element } from 'https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts';

interface ScraperConfig {
  baseUrl: string;
  depth: number;
  maxPages: number;
  outputDir: string;
  includeImages: boolean;
  includeVideos: boolean;
  downloadMedia: boolean;
  githubToken?: string;
}

interface PageContent {
  url: string;
  title: string;
  description: string;
  content: string;
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  videos: Array<{
    src: string;
    title?: string;
    description?: string;
    thumbnail?: string;
  }>;
  codeBlocks: Array<{
    language: string;
    code: string;
  }>;
  metadata: {
    author?: string;
    publishDate?: string;
    lastModified?: string;
    tags?: string[];
  };
  depth: number;
  parentUrl?: string;
}

class MDXWebScraper {
  private config: ScraperConfig;
  private visitedUrls = new Set<string>();
  private pageQueue: Array<{ url: string; depth: number; parentUrl?: string }> = [];
  private scrapedPages: PageContent[] = [];
  private pageCounter = 0;
  private urlToFileMap = new Map<string, string>();
  private domParser = new DOMParser();

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  async initialize() {
    await ensureDir(this.config.outputDir);
    await ensureDir(join(this.config.outputDir, 'media', 'images'));
    await ensureDir(join(this.config.outputDir, 'media', 'videos'));

    // Add initial URL to queue
    this.pageQueue.push({ url: this.config.baseUrl, depth: 0 });
  }

  async scrape() {
    console.log('🕷️  Starting MDX Web Scraper');
    console.log('='.repeat(50));
    console.log(`🎯 Base URL: ${this.config.baseUrl}`);
    console.log(`📊 Max depth: ${this.config.depth}`);
    console.log(`📄 Max pages: ${this.config.maxPages}`);
    console.log(`💾 Output directory: ${this.config.outputDir}`);
    console.log('='.repeat(50));

    const startTime = Date.now();

    while (this.pageQueue.length > 0 && this.visitedUrls.size < this.config.maxPages) {
      const item = this.pageQueue.shift()!;

      if (this.visitedUrls.has(item.url)) continue;

      try {
        await this.scrapePage(item);
      } catch (error) {
        console.error(`❌ Failed to scrape ${item.url}:`, error.message);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const totalTime = Date.now() - startTime;

    console.log(`\n🎉 Scraping completed in ${Math.round(totalTime / 1000)}s`);
    console.log(`📄 Total pages scraped: ${this.scrapedPages.length}`);

    // Generate index
    await this.generateIndex();

    console.log(`\n✨ Output saved to: ${this.config.outputDir}`);
    console.log(`📄 View the index at: ${join(this.config.outputDir, 'index.mdx')}`);
  }

  private async scrapePage(item: { url: string; depth: number; parentUrl?: string }) {
    console.log(`📄 Scraping (depth ${item.depth}): ${item.url}`);

    this.visitedUrls.add(item.url);

    const response = await fetch(item.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MDXScraper/1.0; +https://github.com/swcstudio)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const pageContent = await this.extractPageContent(html, item.url, item.depth, item.parentUrl);

    this.scrapedPages.push(pageContent);

    // Save page as MDX
    await this.savePageAsMDX(pageContent);

    // Add child URLs to queue if within depth limit
    if (item.depth < this.config.depth) {
      await this.queueChildUrls(html, item.url, item.depth);
    }

    console.log(`✅ Saved: ${this.urlToFileMap.get(item.url)}`);
  }

  private async extractPageContent(
    html: string,
    url: string,
    depth: number,
    parentUrl?: string
  ): Promise<PageContent> {
    const doc = this.domParser.parseFromString(html, 'text/html');
    if (!doc) throw new Error('Failed to parse HTML');

    // Extract metadata
    const title =
      doc.querySelector('title')?.textContent || doc.querySelector('h1')?.textContent || 'Untitled';

    const description =
      this.getMetaContent(doc, 'description') ||
      this.getMetaContent(doc, 'og:description', 'property') ||
      '';

    // Extract main content
    const contentElement = this.findMainContent(doc);

    // Clean content
    this.removeUnwantedElements(contentElement);

    // Extract images
    const images = this.config.includeImages ? this.extractImages(contentElement, url) : [];

    // Extract videos
    const videos = this.config.includeVideos ? this.extractVideos(contentElement, url) : [];

    // Extract code blocks
    const codeBlocks = this.extractCodeBlocks(contentElement);

    // Convert to markdown
    const markdown = this.htmlToMarkdown(contentElement);

    return {
      url,
      title: this.cleanText(title),
      description: this.cleanText(description),
      content: markdown,
      images,
      videos,
      codeBlocks,
      metadata: {
        author: this.getMetaContent(doc, 'author'),
        publishDate: this.getMetaContent(doc, 'article:published_time', 'property'),
        lastModified: this.getMetaContent(doc, 'article:modified_time', 'property'),
        tags: this.getMetaContent(doc, 'keywords')
          ?.split(',')
          .map((t) => t.trim()),
      },
      depth,
      parentUrl,
    };
  }

  private getMetaContent(doc: Document, name: string, attr = 'name'): string | undefined {
    const meta = doc.querySelector(`meta[${attr}="${name}"]`);
    return meta?.getAttribute('content') || undefined;
  }

  private findMainContent(doc: Document): Element {
    const selectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.docs-content',
      '.documentation',
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) return element as Element;
    }

    return doc.body as Element;
  }

  private removeUnwantedElements(element: Element) {
    const unwantedSelectors = [
      'script',
      'style',
      'noscript',
      'nav',
      'header',
      'footer',
      '.sidebar',
      '.navigation',
    ];

    for (const selector of unwantedSelectors) {
      const elements = element.querySelectorAll(selector);
      for (const el of elements) {
        el.remove();
      }
    }
  }

  private extractImages(element: Element, baseUrl: string): PageContent['images'] {
    const images: PageContent['images'] = [];
    const imgElements = element.querySelectorAll('img');

    for (const img of imgElements) {
      const src = this.resolveUrl(img.getAttribute('src') || '', baseUrl);
      if (src) {
        images.push({
          src,
          alt: img.getAttribute('alt') || '',
          caption: img.getAttribute('title') || this.findImageCaption(img) || '',
        });
      }
    }

    return images;
  }

  private findImageCaption(img: Element): string {
    const parent = img.parentElement;
    if (parent?.tagName === 'FIGURE') {
      const figcaption = parent.querySelector('figcaption');
      return figcaption?.textContent || '';
    }
    return '';
  }

  private extractVideos(element: Element, baseUrl: string): PageContent['videos'] {
    const videos: PageContent['videos'] = [];

    // Native video elements
    const videoElements = element.querySelectorAll('video');
    for (const video of videoElements) {
      const src = this.resolveUrl(
        video.getAttribute('src') || video.querySelector('source')?.getAttribute('src') || '',
        baseUrl
      );

      if (src) {
        videos.push({
          src,
          title: video.getAttribute('title') || '',
          thumbnail: video.getAttribute('poster') || '',
        });
      }
    }

    // iframe embeds
    const iframes = element.querySelectorAll('iframe');
    for (const iframe of iframes) {
      const src = iframe.getAttribute('src') || '';
      if (src.match(/youtube\.com|vimeo\.com|youtu\.be/)) {
        videos.push({
          src,
          title: iframe.getAttribute('title') || '',
          description: 'Embedded video',
        });
      }
    }

    return videos;
  }

  private extractCodeBlocks(element: Element): PageContent['codeBlocks'] {
    const codeBlocks: PageContent['codeBlocks'] = [];
    const codeElements = element.querySelectorAll('pre code, .highlight pre, .code-block');

    for (const codeEl of codeElements) {
      const code = codeEl.textContent || '';
      if (code.trim()) {
        const language = this.detectLanguage(codeEl);
        codeBlocks.push({ language, code: code.trim() });
      }
    }

    return codeBlocks;
  }

  private detectLanguage(element: Element): string {
    const className =
      element.getAttribute('class') || element.parentElement?.getAttribute('class') || '';

    const match = className.match(/language-(\w+)|lang-(\w+)|highlight-(\w+)/);
    if (match) return match[1] || match[2] || match[3];

    // Try to detect from content
    const code = element.textContent || '';
    if (code.includes('function') || code.includes('const ')) return 'javascript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('<?php')) return 'php';
    if (code.includes('<html') || code.includes('</div>')) return 'html';

    return '';
  }

  private htmlToMarkdown(element: Element): string {
    let markdown = '';

    const processNode = (node: Node): string => {
      if (node.nodeType === 3) {
        // Text node
        return this.cleanText(node.textContent || '');
      }

      if (node.nodeType !== 1) return ''; // Not an element

      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      const content = Array.from(el.childNodes).map(processNode).join('');

      switch (tag) {
        case 'h1':
          return `\n# ${content}\n\n`;
        case 'h2':
          return `\n## ${content}\n\n`;
        case 'h3':
          return `\n### ${content}\n\n`;
        case 'h4':
          return `\n#### ${content}\n\n`;
        case 'h5':
          return `\n##### ${content}\n\n`;
        case 'h6':
          return `\n###### ${content}\n\n`;
        case 'p':
          return `\n${content}\n\n`;
        case 'br':
          return '\n';
        case 'strong':
        case 'b':
          return `**${content}**`;
        case 'em':
        case 'i':
          return `*${content}*`;
        case 'code':
          if (el.parentElement?.tagName === 'PRE') return content;
          return `\`${content}\``;
        case 'pre':
          return `\n\`\`\`\n${content}\n\`\`\`\n\n`;
        case 'a':
          const href = el.getAttribute('href');
          return href ? `[${content}](${href})` : content;
        case 'img':
          const src = el.getAttribute('src');
          const alt = el.getAttribute('alt') || '';
          return src ? `![${alt}](${src})` : '';
        case 'ul':
        case 'ol':
          const items = Array.from(el.querySelectorAll('li'));
          return (
            '\n' +
            items
              .map((li, i) => {
                const prefix = tag === 'ol' ? `${i + 1}. ` : '- ';
                return prefix + processNode(li).trim();
              })
              .join('\n') +
            '\n\n'
          );
        case 'blockquote':
          return '\n> ' + content.split('\n').join('\n> ') + '\n\n';
        case 'hr':
          return '\n---\n\n';
        case 'table':
          return this.tableToMarkdown(el);
        default:
          return content;
      }
    };

    markdown = processNode(element);

    // Clean up excessive newlines
    return markdown.replace(/\n{3,}/g, '\n\n').trim();
  }

  private tableToMarkdown(table: Element): string {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    let markdown = '\n';
    const headers = Array.from(rows[0].querySelectorAll('th, td'));

    if (headers.length > 0) {
      markdown +=
        '| ' + headers.map((h) => this.cleanText(h.textContent || '')).join(' | ') + ' |\n';
      markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

      for (let i = 1; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td'));
        markdown +=
          '| ' + cells.map((c) => this.cleanText(c.textContent || '')).join(' | ') + ' |\n';
      }
    }

    return markdown + '\n';
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (!url) return '';

    try {
      return new URL(url, baseUrl).href;
    } catch {
      return '';
    }
  }

  private async queueChildUrls(html: string, parentUrl: string, currentDepth: number) {
    const doc = this.domParser.parseFromString(html, 'text/html');
    if (!doc) return;

    const links = doc.querySelectorAll('a[href]');
    const baseUrlObj = new URL(this.config.baseUrl);

    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href) continue;

      const absoluteUrl = this.resolveUrl(href, parentUrl);
      if (!absoluteUrl) continue;

      try {
        const urlObj = new URL(absoluteUrl);

        // Only crawl same domain
        if (urlObj.hostname !== baseUrlObj.hostname) continue;

        // Skip already visited or queued
        if (this.visitedUrls.has(absoluteUrl)) continue;
        if (this.pageQueue.some((item) => item.url === absoluteUrl)) continue;

        // Skip non-HTML resources
        if (urlObj.pathname.match(/\.(pdf|zip|exe|dmg|mp4|mp3|jpg|jpeg|png|gif|css|js)$/i))
          continue;

        // Check max pages limit
        if (this.visitedUrls.size + this.pageQueue.length >= this.config.maxPages) continue;

        this.pageQueue.push({
          url: absoluteUrl,
          depth: currentDepth + 1,
          parentUrl,
        });
      } catch {
        // Invalid URL, skip
      }
    }
  }

  private async savePageAsMDX(pageContent: PageContent) {
    this.pageCounter++;

    // Generate filename with hierarchy prefix
    const urlPath = new URL(pageContent.url).pathname;
    const sanitizedPath =
      urlPath
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .replace(/[^a-zA-Z0-9-_\/]/g, '-')
        .replace(/\/+/g, '/') || 'index';

    const prefix = this.pageCounter.toString().padStart(3, '0');
    const filename = `${prefix}-${sanitizedPath}.mdx`;
    const filepath = join(this.config.outputDir, filename);

    // Store URL to file mapping
    this.urlToFileMap.set(pageContent.url, filename);

    // Create directory if needed
    await ensureDir(dirname(filepath));

    // Generate MDX content
    let mdxContent = this.generateMDXFrontmatter(pageContent);

    // Add title
    mdxContent += `# ${pageContent.title}\n\n`;

    // Add description if available
    if (pageContent.description) {
      mdxContent += `> ${pageContent.description}\n\n`;
    }

    // Add breadcrumb navigation
    if (pageContent.parentUrl) {
      const parentFile = this.urlToFileMap.get(pageContent.parentUrl);
      if (parentFile) {
        mdxContent += `[← Back to parent](./${parentFile})\n\n`;
      }
    }

    // Add main content
    mdxContent += pageContent.content;

    // Add media sections
    if (pageContent.images.length > 0 && this.config.includeImages) {
      mdxContent += '\n\n## Images\n\n';
      for (const image of pageContent.images) {
        if (this.config.downloadMedia) {
          const localPath = await this.downloadMedia(image.src, 'images');
          mdxContent += `![${image.alt}](./${localPath})`;
        } else {
          mdxContent += `![${image.alt}](${image.src})`;
        }
        if (image.caption) {
          mdxContent += `\n*${image.caption}*`;
        }
        mdxContent += '\n\n';
      }
    }

    if (pageContent.videos.length > 0 && this.config.includeVideos) {
      mdxContent += '\n\n## Videos\n\n';
      for (const video of pageContent.videos) {
        mdxContent += `<VideoEmbed\n`;
        mdxContent += `  src="${video.src}"\n`;
        if (video.title) mdxContent += `  title="${video.title}"\n`;
        if (video.description) mdxContent += `  description="${video.description}"\n`;
        if (video.thumbnail) mdxContent += `  thumbnail="${video.thumbnail}"\n`;
        mdxContent += `/>\n\n`;
      }
    }

    // Write file
    await Deno.writeTextFile(filepath, mdxContent);
  }

  private generateMDXFrontmatter(pageContent: PageContent): string {
    const frontmatter: any = {
      title: pageContent.title,
      url: pageContent.url,
      depth: pageContent.depth,
      scrapeDate: new Date().toISOString(),
    };

    if (pageContent.description) frontmatter.description = pageContent.description;
    if (pageContent.metadata.author) frontmatter.author = pageContent.metadata.author;
    if (pageContent.metadata.publishDate)
      frontmatter.publishDate = pageContent.metadata.publishDate;
    if (pageContent.metadata.lastModified)
      frontmatter.lastModified = pageContent.metadata.lastModified;
    if (pageContent.metadata.tags?.length) frontmatter.tags = pageContent.metadata.tags;

    let mdx = '---\n';
    for (const [key, value] of Object.entries(frontmatter)) {
      if (Array.isArray(value)) {
        mdx += `${key}:\n`;
        for (const item of value) {
          mdx += `  - ${item}\n`;
        }
      } else {
        mdx += `${key}: ${JSON.stringify(value)}\n`;
      }
    }
    mdx += '---\n\n';

    return mdx;
  }

  private async downloadMedia(url: string, type: 'images' | 'videos'): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) return url;

      const buffer = await response.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashString = encodeBase64(new Uint8Array(hashBuffer)).replace(/[/+=]/g, '');
      const ext = extname(new URL(url).pathname) || '.jpg';
      const filename = `${hashString.substring(0, 16)}${ext}`;
      const filepath = join('media', type, filename);
      const fullPath = join(this.config.outputDir, filepath);

      await ensureDir(dirname(fullPath));
      await Deno.writeFile(fullPath, new Uint8Array(buffer));

      return filepath;
    } catch {
      return url; // Return original URL if download fails
    }
  }

  private async generateIndex() {
    const indexPath = join(this.config.outputDir, 'index.mdx');

    let indexContent = `---
title: "Scraped Content Index"
baseUrl: "${this.config.baseUrl}"
totalPages: ${this.scrapedPages.length}
scrapeDate: "${new Date().toISOString()}"
---

# Scraped Content Index

This directory contains ${this.scrapedPages.length} pages scraped from [${this.config.baseUrl}](${this.config.baseUrl}).

## Pages by Depth

`;

    // Group pages by depth
    for (let depth = 0; depth <= this.config.depth; depth++) {
      const pagesAtDepth = this.scrapedPages.filter((p) => p.depth === depth);
      if (pagesAtDepth.length === 0) continue;

      indexContent += `\n### Depth ${depth} (${pagesAtDepth.length} pages)\n\n`;

      for (const page of pagesAtDepth) {
        const filename = this.urlToFileMap.get(page.url);
        if (filename) {
          indexContent += `- [${page.title}](./${filename})\n`;
        }
      }
    }

    await Deno.writeTextFile(indexPath, indexContent);
  }
}

// Interactive CLI
async function runInteractiveCLI() {
  console.log('🕷️  Welcome to the Advanced MDX Web Scraper!\n');

  const config: ScraperConfig = {
    baseUrl: '',
    depth: 3,
    maxPages: 2000,
    outputDir: './docs',
    includeImages: true,
    includeVideos: true,
    downloadMedia: false,
  };

  // Get base URL
  config.baseUrl =
    prompt('Enter the base URL to scrape (default: https://docs.anthropic.com/en/):') ||
    'https://docs.anthropic.com/en/';

  // Get depth
  const depthInput = prompt('Maximum crawl depth (default: 3):');
  if (depthInput) config.depth = Number.parseInt(depthInput);

  // Get max pages
  const maxPagesInput = prompt('Maximum number of pages to scrape (default: 2000):');
  if (maxPagesInput) config.maxPages = Number.parseInt(maxPagesInput);

  // Get output directory
  const urlObj = new URL(config.baseUrl);
  const defaultDir = `./docs/${urlObj.hostname.replace(/\./g, '-')}`;
  config.outputDir = prompt(`Output directory (default: ${defaultDir}):`) || defaultDir;

  // Media options
  const includeImages = confirm('Extract images? (y/n, default: y)');
  config.includeImages = includeImages !== false;

  const includeVideos = confirm('Extract videos? (y/n, default: y)');
  config.includeVideos = includeVideos !== false;

  if (config.includeImages || config.includeVideos) {
    const downloadMedia = confirm('Download media files locally? (y/n, default: n)');
    config.downloadMedia = downloadMedia === true;
  }

  // Show summary
  console.log('\n📋 Scraping Configuration:');
  console.log('-'.repeat(40));
  console.log(`URL: ${config.baseUrl}`);
  console.log(`Depth: ${config.depth}`);
  console.log(`Max Pages: ${config.maxPages}`);
  console.log(`Output Directory: ${config.outputDir}`);
  console.log(`Include Images: ${config.includeImages ? '✓' : '✗'}`);
  console.log(`Include Videos: ${config.includeVideos ? '✓' : '✗'}`);
  console.log(`Download Media: ${config.downloadMedia ? '✓' : '✗'}`);
  console.log('-'.repeat(40));

  const start = confirm('\nStart scraping with these settings? (y/n)');
  if (!start) {
    console.log('❌ Scraping cancelled.');
    return;
  }

  // Run scraper
  const scraper = new MDXWebScraper(config);
  await scraper.initialize();
  await scraper.scrape();
}

// GitHub repository scraper
async function scrapeGitHubRepo(repoUrl: string, outputDir: string, token?: string) {
  const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!repoMatch) {
    throw new Error('Invalid GitHub repository URL');
  }

  const [, owner, repo] = repoMatch;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'MDXScraper/1.0',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  console.log(`🔧 Scraping GitHub repository: ${owner}/${repo}`);

  try {
    // Get repository info
    const repoResponse = await fetch(apiUrl, { headers });
    const repoData = await repoResponse.json();

    // Get repository tree
    const treeUrl = `${apiUrl}/git/trees/${repoData.default_branch}?recursive=1`;
    const treeResponse = await fetch(treeUrl, { headers });
    const treeData = await treeResponse.json();

    await ensureDir(outputDir);
    await ensureDir(join(outputDir, 'github'));

    let fileCount = 0;

    // Process files
    for (const item of treeData.tree) {
      if (item.type === 'blob' && shouldProcessFile(item.path)) {
        await processGitHubFile(apiUrl, item.path, headers, outputDir);
        fileCount++;

        if (fileCount % 10 === 0) {
          console.log(`  Processed ${fileCount} files...`);
        }
      }
    }

    // Create repository index
    await createRepoIndex(repoData, outputDir);

    console.log(`✅ Scraped ${fileCount} files from ${owner}/${repo}`);
  } catch (error) {
    throw new Error(`Failed to scrape GitHub repository: ${error.message}`);
  }
}

function shouldProcessFile(filepath: string): boolean {
  const extensions = [
    '.md',
    '.mdx',
    '.txt',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.py',
    '.go',
    '.rs',
    '.java',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.json',
    '.yaml',
    '.yml',
    '.toml',
  ];
  return extensions.some((ext) => filepath.endsWith(ext));
}

async function processGitHubFile(
  apiUrl: string,
  filepath: string,
  headers: HeadersInit,
  outputDir: string
) {
  try {
    const contentUrl = `${apiUrl}/contents/${filepath}`;
    const response = await fetch(contentUrl, { headers });
    const data = await response.json();

    if (data.content) {
      const content = atob(data.content);
      const outputPath = join(outputDir, 'github', filepath);

      await ensureDir(dirname(outputPath));

      // Convert to MDX if markdown
      if (filepath.endsWith('.md')) {
        const mdxContent = `---
source: "github"
path: "${filepath}"
---

${content}
`;
        await Deno.writeTextFile(outputPath + 'x', mdxContent);
      } else {
        // For code files, wrap in MDX code block
        const ext = extname(filepath).slice(1);
        const mdxContent = `---
source: "github"
path: "${filepath}"
type: "code"
language: "${ext}"
---

# ${filepath}

\`\`\`${ext}
${content}
\`\`\`
`;
        await Deno.writeTextFile(outputPath + '.mdx', mdxContent);
      }
    }
  } catch (error) {
    console.error(`Failed to process file ${filepath}: ${error.message}`);
  }
}

async function createRepoIndex(repoData: any, outputDir: string) {
  const indexPath = join(outputDir, 'github', 'index.mdx');

  const indexContent = `---
repository: "${repoData.full_name}"
description: "${repoData.description || ''}"
stars: ${repoData.stargazers_count}
language: "${repoData.language || 'Unknown'}"
defaultBranch: "${repoData.default_branch}"
---

# ${repoData.name}

${repoData.description || 'No description available'}

- **Owner**: [${repoData.owner.login}](${repoData.owner.html_url})
- **Stars**: ${repoData.stargazers_count}
- **Forks**: ${repoData.forks_count}
- **Language**: ${repoData.language || 'Unknown'}
- **License**: ${repoData.license?.name || 'No license'}

[View on GitHub](${repoData.html_url})
`;

  await Deno.writeTextFile(indexPath, indexContent);
}

// Main entry point
if (import.meta.main) {
  const args = Deno.args;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🕷️  MDX Web Scraper

Usage: 
  deno run --allow-net --allow-write --allow-read deno-scraper.ts [options]

Options:
  --url <url>        Base URL to scrape
  --depth <n>        Maximum crawl depth (default: 3)
  --max <n>          Maximum pages to scrape (default: 2000)
  --output <dir>     Output directory (default: ./docs)
  --github <url>     Scrape a GitHub repository
  --token <token>    GitHub personal access token
  --help, -h         Show this help message

Examples:
  # Interactive mode
  deno run --allow-net --allow-write --allow-read deno-scraper.ts

  # Direct mode
  deno run --allow-net --allow-write --allow-read deno-scraper.ts \\
    --url https://docs.anthropic.com/en/ --depth 3 --max 2000

  # GitHub repository
  deno run --allow-net --allow-write --allow-read deno-scraper.ts \\
    --github https://github.com/anthropics/anthropic-sdk-typescript
`);
    Deno.exit(0);
  }

  // Check for GitHub mode
  const githubIndex = args.indexOf('--github');
  if (githubIndex !== -1 && args[githubIndex + 1]) {
    const repoUrl = args[githubIndex + 1];
    const tokenIndex = args.indexOf('--token');
    const token = tokenIndex !== -1 ? args[tokenIndex + 1] : undefined;
    const outputIndex = args.indexOf('--output');
    const output = outputIndex !== -1 ? args[outputIndex + 1] : './docs/github-repo';

    await scrapeGitHubRepo(repoUrl, output, token);
  } else if (args.includes('--url')) {
    // Direct mode with command line args
    const urlIndex = args.indexOf('--url');
    const config: ScraperConfig = {
      baseUrl: args[urlIndex + 1],
      depth: 3,
      maxPages: 2000,
      outputDir: './docs',
      includeImages: true,
      includeVideos: true,
      downloadMedia: false,
    };

    const depthIndex = args.indexOf('--depth');
    if (depthIndex !== -1) config.depth = Number.parseInt(args[depthIndex + 1]);

    const maxIndex = args.indexOf('--max');
    if (maxIndex !== -1) config.maxPages = Number.parseInt(args[maxIndex + 1]);

    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1) config.outputDir = args[outputIndex + 1];

    const scraper = new MDXWebScraper(config);
    await scraper.initialize();
    await scraper.scrape();
  } else {
    // Interactive mode
    await runInteractiveCLI();
  }
}

export { MDXWebScraper, scrapeGitHubRepo };
