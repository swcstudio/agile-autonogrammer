/**
 * Advanced MDX Web Scraper with Multimodal Support
 * Scrapes websites and outputs clean MDX files with proper hierarchy
 */

import { createHash } from 'crypto';
import * as path from 'path';
import { URL } from 'url';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import fetch from 'node-fetch';
import TurndownService from 'turndown';
import * as gfm from 'turndown-plugin-gfm';
import {
  type BaseScrapingConfig,
  type ScrapedDataItem,
  ScrapingEngine as ScrapingEngineType,
  ScrapingResult,
} from '../types';
import { BaseScrapingEngine } from './engine';

interface MDXScrapingConfig extends BaseScrapingConfig {
  outputDir: string;
  baseUrl: string;
  depth: number;
  maxPages: number;
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

export class MDXScrapingEngine extends BaseScrapingEngine {
  private turndownService: TurndownService;
  private visitedUrls = new Set<string>();
  private pageQueue: Array<{ url: string; depth: number; parentUrl?: string }> = [];
  private scrapedPages: PageContent[] = [];
  private pageCounter = 0;
  private urlToFileMap = new Map<string, string>();

  constructor(config: MDXScrapingConfig) {
    super(config);

    // Initialize Turndown with GitHub Flavored Markdown
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    // Add GFM support for tables, strikethrough, etc.
    this.turndownService.use(gfm.gfm);

    // Custom rules for better MDX conversion
    this.setupTurndownRules();
  }

  private setupTurndownRules() {
    // Preserve code blocks with language hints
    this.turndownService.addRule('codeBlock', {
      filter: ['pre'],
      replacement: (content, node) => {
        const codeElement = node.querySelector('code');
        if (!codeElement) return content;

        const language = this.detectLanguage(codeElement);
        const code = codeElement.textContent || '';

        return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
      },
    });

    // Handle images with captions
    this.turndownService.addRule('figure', {
      filter: 'figure',
      replacement: (content, node) => {
        const img = node.querySelector('img');
        const figcaption = node.querySelector('figcaption');

        if (!img) return content;

        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        const caption = figcaption?.textContent || '';

        let mdx = `\n![${alt}](${src})`;
        if (caption) {
          mdx += `\n*${caption}*`;
        }
        return mdx + '\n';
      },
    });

    // Preserve video embeds
    this.turndownService.addRule('video', {
      filter: ['video', 'iframe'],
      replacement: (content, node) => {
        if (node.tagName === 'VIDEO') {
          const src = node.getAttribute('src') || '';
          const poster = node.getAttribute('poster') || '';
          return `\n<Video src="${src}" poster="${poster}" />\n`;
        } else if (node.tagName === 'IFRAME') {
          const src = node.getAttribute('src') || '';
          if (src.includes('youtube.com') || src.includes('vimeo.com')) {
            return `\n<VideoEmbed src="${src}" />\n`;
          }
        }
        return content;
      },
    });
  }

  private detectLanguage(codeElement: Element): string {
    const className = codeElement.getAttribute('class') || '';
    const langMatch = className.match(/language-(\w+)/);
    if (langMatch) return langMatch[1];

    // Try to detect from common patterns
    const code = codeElement.textContent || '';
    if (code.includes('function') || code.includes('const') || code.includes('let'))
      return 'javascript';
    if (code.includes('def ') || code.includes('import ')) return 'python';
    if (code.includes('<?php')) return 'php';
    if (code.includes('<html') || code.includes('</div>')) return 'html';
    if (code.includes('{') && code.includes(':') && code.includes('}')) return 'css';

    return '';
  }

  async initialize(): Promise<void> {
    const config = this.config as MDXScrapingConfig;

    // Create output directory structure
    await fs.mkdir(config.outputDir, { recursive: true });
    await fs.mkdir(path.join(config.outputDir, 'media'), { recursive: true });

    // Initialize with base URL
    this.pageQueue.push({ url: config.baseUrl, depth: 0 });
  }

  async scrapeUrl(url: string): Promise<ScrapedDataItem> {
    const queueItem = this.pageQueue.find((item) => item.url === url);
    const depth = queueItem?.depth || 0;
    const parentUrl = queueItem?.parentUrl;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MDXScraper/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const pageContent = await this.extractPageContent(html, url, depth, parentUrl);

      this.scrapedPages.push(pageContent);
      this.visitedUrls.add(url);

      // Add child URLs to queue if within depth limit
      if (depth < (this.config as MDXScrapingConfig).depth) {
        await this.queueChildUrls(html, url, depth);
      }

      // Save page as MDX
      await this.savePageAsMDX(pageContent);

      return {
        url,
        data: pageContent,
        timestamp: new Date(),
        metadata: {
          depth,
          title: pageContent.title,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  private async extractPageContent(
    html: string,
    url: string,
    depth: number,
    parentUrl?: string
  ): Promise<PageContent> {
    const $ = cheerio.load(html);
    const config = this.config as MDXScrapingConfig;

    // Extract metadata
    const title = $('title').text() || $('h1').first().text() || 'Untitled';
    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';

    // Remove script and style elements
    $('script, style, noscript').remove();

    // Extract main content
    const contentSelectors = ['main', 'article', '[role="main"]', '.content', '#content', 'body'];
    let contentElement = null;

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        contentElement = element;
        break;
      }
    }

    if (!contentElement) {
      contentElement = $('body');
    }

    // Extract images
    const images: PageContent['images'] = [];
    if (config.includeImages) {
      contentElement.find('img').each((_, img) => {
        const $img = $(img);
        const src = this.resolveUrl($img.attr('src') || '', url);
        if (src) {
          images.push({
            src,
            alt: $img.attr('alt') || '',
            caption: $img.attr('title') || $img.parent('figure').find('figcaption').text() || '',
          });
        }
      });
    }

    // Extract videos
    const videos: PageContent['videos'] = [];
    if (config.includeVideos) {
      // Native video elements
      contentElement.find('video').each((_, video) => {
        const $video = $(video);
        const src = this.resolveUrl(
          $video.attr('src') || $video.find('source').first().attr('src') || '',
          url
        );
        if (src) {
          videos.push({
            src,
            title: $video.attr('title') || '',
            thumbnail: $video.attr('poster') || '',
          });
        }
      });

      // YouTube/Vimeo embeds
      contentElement.find('iframe').each((_, iframe) => {
        const $iframe = $(iframe);
        const src = $iframe.attr('src') || '';
        if (src.match(/youtube\.com|vimeo\.com/)) {
          videos.push({
            src,
            title: $iframe.attr('title') || '',
            description: 'Embedded video',
          });
        }
      });
    }

    // Extract code blocks
    const codeBlocks: PageContent['codeBlocks'] = [];
    contentElement.find('pre code, .highlight pre, .code-block').each((_, elem) => {
      const $elem = $(elem);
      const code = $elem.text();
      const language = this.detectLanguageFromElement($elem);

      if (code.trim()) {
        codeBlocks.push({ language, code });
      }
    });

    // Convert to clean markdown
    const cleanHtml = contentElement.html() || '';
    const markdown = this.turndownService.turndown(cleanHtml);

    return {
      url,
      title,
      description,
      content: markdown,
      images,
      videos,
      codeBlocks,
      metadata: {
        author: $('meta[name="author"]').attr('content'),
        publishDate: $('meta[property="article:published_time"]').attr('content'),
        lastModified: $('meta[property="article:modified_time"]').attr('content'),
        tags: $('meta[name="keywords"]')
          .attr('content')
          ?.split(',')
          .map((t) => t.trim()),
      },
      depth,
      parentUrl,
    };
  }

  private detectLanguageFromElement($elem: cheerio.Cheerio): string {
    const classes = $elem.attr('class') || $elem.parent().attr('class') || '';
    const langMatch = classes.match(/language-(\w+)|lang-(\w+)|highlight-(\w+)/);
    return langMatch ? langMatch[1] || langMatch[2] || langMatch[3] : '';
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (!url) return '';

    try {
      return new URL(url, baseUrl).href;
    } catch {
      return '';
    }
  }

  private async queueChildUrls(
    html: string,
    parentUrl: string,
    currentDepth: number
  ): Promise<void> {
    const $ = cheerio.load(html);
    const config = this.config as MDXScrapingConfig;
    const baseUrlObj = new URL(config.baseUrl);

    $('a[href]').each((_, link) => {
      const href = $(link).attr('href');
      if (!href) return;

      const absoluteUrl = this.resolveUrl(href, parentUrl);
      if (!absoluteUrl) return;

      try {
        const urlObj = new URL(absoluteUrl);

        // Only crawl same domain
        if (urlObj.hostname !== baseUrlObj.hostname) return;

        // Skip already visited or queued
        if (this.visitedUrls.has(absoluteUrl)) return;
        if (this.pageQueue.some((item) => item.url === absoluteUrl)) return;

        // Skip non-HTML resources
        if (urlObj.pathname.match(/\.(pdf|zip|exe|dmg|mp4|mp3|jpg|jpeg|png|gif)$/i)) return;

        // Check max pages limit
        if (this.visitedUrls.size + this.pageQueue.length >= config.maxPages) return;

        this.pageQueue.push({
          url: absoluteUrl,
          depth: currentDepth + 1,
          parentUrl,
        });
      } catch {
        // Invalid URL, skip
      }
    });
  }

  private async savePageAsMDX(pageContent: PageContent): Promise<void> {
    const config = this.config as MDXScrapingConfig;
    this.pageCounter++;

    // Generate filename with hierarchy prefix
    const urlPath = new URL(pageContent.url).pathname;
    const sanitizedPath = urlPath
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/[^a-zA-Z0-9-_\/]/g, '-')
      .replace(/\/+/g, '/');

    const prefix = this.pageCounter.toString().padStart(3, '0');
    const filename = sanitizedPath ? `${prefix}-${sanitizedPath}.mdx` : `${prefix}-index.mdx`;
    const filepath = path.join(config.outputDir, filename);

    // Store URL to file mapping
    this.urlToFileMap.set(pageContent.url, filename);

    // Create directory if needed
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });

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

    // Add media sections if present
    if (pageContent.images.length > 0 && config.includeImages) {
      mdxContent += '\n\n## Images\n\n';
      for (const image of pageContent.images) {
        if (config.downloadMedia) {
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

    if (pageContent.videos.length > 0 && config.includeVideos) {
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
    await fs.writeFile(filepath, mdxContent, 'utf-8');
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

      const buffer = await response.buffer();
      const urlHash = createHash('md5').update(url).digest('hex');
      const ext = path.extname(new URL(url).pathname) || '.jpg';
      const filename = `${urlHash}${ext}`;
      const filepath = path.join('media', type, filename);
      const fullPath = path.join((this.config as MDXScrapingConfig).outputDir, filepath);

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, buffer);

      return filepath;
    } catch {
      return url; // Return original URL if download fails
    }
  }

  async extractData(html: string, url: string): Promise<Record<string, unknown>> {
    // This method is required by base class but not used in our implementation
    return {};
  }

  async cleanup(): Promise<void> {
    // Generate index file
    await this.generateIndexFile();

    // Clear memory
    this.visitedUrls.clear();
    this.pageQueue = [];
    this.scrapedPages = [];
    this.urlToFileMap.clear();
  }

  private async generateIndexFile(): Promise<void> {
    const config = this.config as MDXScrapingConfig;
    const indexPath = path.join(config.outputDir, 'index.mdx');

    let indexContent = `---
title: "Scraped Content Index"
baseUrl: "${config.baseUrl}"
totalPages: ${this.scrapedPages.length}
scrapeDate: "${new Date().toISOString()}"
---

# Scraped Content Index

This directory contains ${this.scrapedPages.length} pages scraped from [${config.baseUrl}](${config.baseUrl}).

## Pages by Depth

`;

    // Group pages by depth
    for (let depth = 0; depth <= config.depth; depth++) {
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

    await fs.writeFile(indexPath, indexContent, 'utf-8');
  }
}

// GitHub repository scraper extension
export class GitHubRepoScraper extends MDXScrapingEngine {
  private githubToken?: string;

  constructor(config: MDXScrapingConfig) {
    super(config);
    this.githubToken = config.githubToken;
  }

  async scrapeGitHubRepo(repoUrl: string): Promise<void> {
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!repoMatch) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = repoMatch;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const headers: any = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'MDXScraper/1.0',
    };

    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }

    try {
      // Get repository info
      const repoResponse = await fetch(apiUrl, { headers });
      const repoData = await repoResponse.json();

      // Get repository tree
      const treeUrl = `${apiUrl}/git/trees/${repoData.default_branch}?recursive=1`;
      const treeResponse = await fetch(treeUrl, { headers });
      const treeData = await treeResponse.json();

      // Process files
      for (const item of treeData.tree) {
        if (item.type === 'blob' && this.shouldProcessFile(item.path)) {
          await this.processGitHubFile(apiUrl, item.path, headers);
        }
      }

      // Create repository index
      await this.createRepoIndex(repoData);
    } catch (error) {
      throw new Error(`Failed to scrape GitHub repository: ${error.message}`);
    }
  }

  private shouldProcessFile(filepath: string): boolean {
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
    ];
    return extensions.some((ext) => filepath.endsWith(ext));
  }

  private async processGitHubFile(apiUrl: string, filepath: string, headers: any): Promise<void> {
    try {
      const contentUrl = `${apiUrl}/contents/${filepath}`;
      const response = await fetch(contentUrl, { headers });
      const data = await response.json();

      if (data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const config = this.config as MDXScrapingConfig;
        const outputPath = path.join(config.outputDir, 'github', filepath);

        await fs.mkdir(path.dirname(outputPath), { recursive: true });

        // Convert to MDX if markdown
        if (filepath.endsWith('.md')) {
          const mdxContent = `---
source: "github"
path: "${filepath}"
---

${content}
`;
          await fs.writeFile(outputPath + 'x', mdxContent, 'utf-8');
        } else {
          // For code files, wrap in MDX code block
          const language = path.extname(filepath).slice(1);
          const mdxContent = `---
source: "github"
path: "${filepath}"
type: "code"
language: "${language}"
---

# ${filepath}

\`\`\`${language}
${content}
\`\`\`
`;
          await fs.writeFile(outputPath + '.mdx', mdxContent, 'utf-8');
        }
      }
    } catch (error) {
      console.error(`Failed to process file ${filepath}: ${error.message}`);
    }
  }

  private async createRepoIndex(repoData: any): Promise<void> {
    const config = this.config as MDXScrapingConfig;
    const indexPath = path.join(config.outputDir, 'github', 'index.mdx');

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

    await fs.writeFile(indexPath, indexContent, 'utf-8');
  }
}
