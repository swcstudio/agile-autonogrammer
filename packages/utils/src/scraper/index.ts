/**
 * Katalyst Web Scraper - Main Entry Point
 * State-of-the-art TypeScript web scraping tool for Katalyst
 *
 * Features:
 * - Multiple scraping engines (Cheerio, Playwright, Puppeteer)
 * - CLI interface with comprehensive commands
 * - Bulk scraping capabilities
 * - Rate limiting and retry logic
 * - Proxy support and stealth features
 * - Multiple output formats
 * - Plugin system
 * - Enterprise-grade error handling
 */

// Export all types
export * from './types.ts';

// Export core engine classes
export {
  BaseScrapingEngine,
  ScrapingEngineFactory,
  ScraperManager,
} from './core/engine.ts';

// Export specific engine implementations
export { CheerioEngine } from './engines/cheerio-engine.ts';
export { PlaywrightEngine } from './engines/playwright-engine.ts';

// Export CLI interface
export {
  ScraperCLI,
  runCLI,
} from './cli/index.ts';

// Import required dependencies for factory functions
import { ScrapingEngineFactory } from './core/engine.ts';
import { CheerioEngine } from './engines/cheerio-engine.ts';
import { PlaywrightEngine } from './engines/playwright-engine.ts';
import type {
  BaseScrapingConfig,
  BrowserType,
  ExtractionRule,
  OutputFormat,
  ScrapingEngine as ScrapingEngineType,
  ScrapingResult,
} from './types.ts';

// Register engines with the factory
ScrapingEngineFactory.registerEngine('cheerio', CheerioEngine);
ScrapingEngineFactory.registerEngine('playwright', PlaywrightEngine);

/**
 * Quick scraper factory function for simple use cases
 */
export function createScraper(config: BaseScrapingConfig) {
  return ScrapingEngineFactory.createEngine(config);
}

/**
 * Convenience function for scraping a single URL with minimal configuration
 */
export async function scrapeUrl(
  url: string,
  options: {
    engine?: ScrapingEngineType;
    selectors?: Record<string, string>;
    outputFormat?: OutputFormat;
    browser?: BrowserType;
    headless?: boolean;
    timeout?: number;
  } = {}
): Promise<ScrapingResult> {
  const {
    engine = 'cheerio',
    selectors = { title: 'title', description: 'meta[name="description"]' },
    outputFormat = 'json',
    browser = 'chromium',
    headless = true,
    timeout = 30000,
  } = options;

  // Build extraction rules from selectors
  const rules: ExtractionRule[] = Object.entries(selectors).map(([name, selector]) => ({
    name,
    selector,
    attribute: 'text',
    type: 'text' as const,
  }));

  const config: BaseScrapingConfig = {
    url,
    engine,
    output: {
      format: outputFormat,
    },
    request: {
      timeout,
    },
    browser:
      engine === 'playwright'
        ? {
            type: browser,
            headless,
          }
        : undefined,
    extraction: {
      rules,
      textProcessing: {
        trim: true,
        normalizeWhitespace: true,
      },
    },
  };

  const scraper = createScraper(config);
  return await scraper.scrape();
}

/**
 * Convenience function for bulk scraping with minimal configuration
 */
export async function scrapeUrls(
  urls: string[],
  options: {
    engine?: ScrapingEngineType;
    selectors?: Record<string, string>;
    concurrency?: number;
    delay?: number;
    outputFormat?: OutputFormat;
    browser?: BrowserType;
    headless?: boolean;
  } = {}
): Promise<ScrapingResult> {
  const {
    engine = 'cheerio',
    selectors = { title: 'title', description: 'meta[name="description"]' },
    concurrency = 5,
    delay = 1000,
    outputFormat = 'json',
    browser = 'chromium',
    headless = true,
  } = options;

  // Build extraction rules from selectors
  const rules: ExtractionRule[] = Object.entries(selectors).map(([name, selector]) => ({
    name,
    selector,
    attribute: 'text',
    type: 'text' as const,
  }));

  const config: BaseScrapingConfig = {
    url: urls,
    engine,
    output: {
      format: outputFormat,
    },
    rateLimit: {
      delay,
    },
    browser:
      engine === 'playwright'
        ? {
            type: browser,
            headless,
          }
        : undefined,
    bulk: {
      enabled: true,
      concurrency,
      progress: {
        enabled: true,
        format: 'bar',
      },
    },
    extraction: {
      rules,
      textProcessing: {
        trim: true,
        normalizeWhitespace: true,
      },
    },
  };

  const scraper = createScraper(config);
  return await scraper.scrape();
}

/**
 * Convenience function for scraping with custom extraction rules
 */
export async function scrapeWithRules(
  url: string | string[],
  rules: ExtractionRule[],
  options: {
    engine?: ScrapingEngineType;
    outputFormat?: OutputFormat;
    browser?: BrowserType;
    headless?: boolean;
    timeout?: number;
    concurrency?: number;
  } = {}
): Promise<ScrapingResult> {
  const {
    engine = 'cheerio',
    outputFormat = 'json',
    browser = 'chromium',
    headless = true,
    timeout = 30000,
    concurrency = 5,
  } = options;

  const isMultipleUrls = Array.isArray(url);

  const config: BaseScrapingConfig = {
    url,
    engine,
    output: {
      format: outputFormat,
    },
    request: {
      timeout,
    },
    browser:
      engine === 'playwright'
        ? {
            type: browser,
            headless,
          }
        : undefined,
    bulk: isMultipleUrls
      ? {
          enabled: true,
          concurrency,
          progress: {
            enabled: true,
            format: 'bar',
          },
        }
      : undefined,
    extraction: {
      rules,
      textProcessing: {
        trim: true,
        normalizeWhitespace: true,
      },
    },
  };

  const scraper = createScraper(config);
  return await scraper.scrape();
}

/**
 * Utility function to create common extraction rules
 */
export const ExtractionRules = {
  /**
   * Common web page metadata
   */
  metadata: (): ExtractionRule[] => [
    {
      name: 'title',
      selector: 'title',
      attribute: 'text',
      type: 'text',
    },
    {
      name: 'description',
      selector: 'meta[name="description"]',
      attribute: 'content',
      type: 'text',
    },
    {
      name: 'keywords',
      selector: 'meta[name="keywords"]',
      attribute: 'content',
      type: 'text',
    },
    {
      name: 'canonical',
      selector: 'link[rel="canonical"]',
      attribute: 'href',
      type: 'url',
    },
  ],

  /**
   * Open Graph metadata
   */
  openGraph: (): ExtractionRule[] => [
    {
      name: 'og_title',
      selector: 'meta[property="og:title"]',
      attribute: 'content',
      type: 'text',
    },
    {
      name: 'og_description',
      selector: 'meta[property="og:description"]',
      attribute: 'content',
      type: 'text',
    },
    {
      name: 'og_image',
      selector: 'meta[property="og:image"]',
      attribute: 'content',
      type: 'url',
    },
    {
      name: 'og_url',
      selector: 'meta[property="og:url"]',
      attribute: 'content',
      type: 'url',
    },
  ],

  /**
   * Twitter Card metadata
   */
  twitterCard: (): ExtractionRule[] => [
    {
      name: 'twitter_title',
      selector: 'meta[name="twitter:title"]',
      attribute: 'content',
      type: 'text',
    },
    {
      name: 'twitter_description',
      selector: 'meta[name="twitter:description"]',
      attribute: 'content',
      type: 'text',
    },
    {
      name: 'twitter_image',
      selector: 'meta[name="twitter:image"]',
      attribute: 'content',
      type: 'url',
    },
  ],

  /**
   * All links on the page
   */
  links: (): ExtractionRule[] => [
    {
      name: 'links',
      selector: 'a[href]',
      attribute: 'href',
      type: 'url',
      multiple: true,
    },
  ],

  /**
   * All images on the page
   */
  images: (): ExtractionRule[] => [
    {
      name: 'images',
      selector: 'img[src]',
      attribute: 'src',
      type: 'url',
      multiple: true,
    },
  ],

  /**
   * Heading structure
   */
  headings: (): ExtractionRule[] => [
    {
      name: 'h1',
      selector: 'h1',
      attribute: 'text',
      type: 'text',
      multiple: true,
    },
    {
      name: 'h2',
      selector: 'h2',
      attribute: 'text',
      type: 'text',
      multiple: true,
    },
    {
      name: 'h3',
      selector: 'h3',
      attribute: 'text',
      type: 'text',
      multiple: true,
    },
  ],

  /**
   * Common e-commerce product data
   */
  product: (): ExtractionRule[] => [
    {
      name: 'product_name',
      selector: '[data-testid="product-name"], .product-name, .product-title, h1',
      attribute: 'text',
      type: 'text',
    },
    {
      name: 'price',
      selector: '[data-testid="price"], .price, .product-price',
      attribute: 'text',
      type: 'text',
    },
    {
      name: 'description',
      selector: '[data-testid="description"], .product-description, .description',
      attribute: 'text',
      type: 'text',
    },
    {
      name: 'images',
      selector: '.product-image img, .product-gallery img',
      attribute: 'src',
      type: 'url',
      multiple: true,
    },
  ],

  /**
   * Blog/article content
   */
  article: (): ExtractionRule[] => [
    {
      name: 'title',
      selector: 'h1, .article-title, .post-title',
      attribute: 'text',
      type: 'text',
    },
    {
      name: 'author',
      selector: '.author, .byline, [rel="author"]',
      attribute: 'text',
      type: 'text',
    },
    {
      name: 'publish_date',
      selector: '.publish-date, .date, time[datetime]',
      attribute: 'datetime',
      type: 'date',
    },
    {
      name: 'content',
      selector: '.article-content, .post-content, .content',
      attribute: 'text',
      type: 'text',
    },
  ],
};

/**
 * Default export - scraper factory
 */
export default {
  create: createScraper,
  scrapeUrl,
  scrapeUrls,
  scrapeWithRules,
  rules: ExtractionRules,
  engines: ScrapingEngineFactory,
};

/**
 * Version information
 */
export const VERSION = '1.0.0';

/**
 * Quick start example
 */
export const EXAMPLES = {
  basic: `
import { scrapeUrl } from '@katalyst/scraper';

const result = await scrapeUrl('https://example.com');
console.log(result.data);
  `,

  advanced: `
import { createScraper, ExtractionRules } from '@katalyst/scraper';

const scraper = createScraper({
  url: 'https://example.com',
  engine: 'playwright',
  browser: { type: 'chromium', headless: true },
  extraction: {
    rules: [
      ...ExtractionRules.metadata(),
      ...ExtractionRules.openGraph(),
      { name: 'custom', selector: '.special', attribute: 'text', type: 'text' }
    ]
  }
});

const result = await scraper.scrape();
  `,

  bulk: `
import { scrapeUrls } from '@katalyst/scraper';

const urls = ['https://example1.com', 'https://example2.com'];
const result = await scrapeUrls(urls, {
  concurrency: 3,
  delay: 1000,
  selectors: {
    title: 'h1',
    price: '.price'
  }
});
  `,

  cli: `
# Install globally
npm install -g @katalyst/scraper

# Basic usage
katalyst-scraper scrape https://example.com

# Advanced usage
katalyst-scraper scrape https://example.com -e playwright --browser firefox --screenshot

# Bulk scraping
katalyst-scraper bulk -i urls.txt --concurrency 10
  `,
};
