/**
 * Katalyst Web Scraper - Playwright Engine
 * Advanced browser automation engine for dynamic content scraping
 */

import * as cheerio from 'cheerio';
import {
  type Browser,
  type BrowserContext,
  type Page,
  chromium,
  devices,
  firefox,
  webkit,
} from 'playwright';
import { BaseScrapingEngine } from '../core/engine.ts';
import {
  type BaseScrapingConfig,
  BrowserType,
  Cookie,
  type ExtractionRule,
  type ItemMetadata,
  type ScrapedDataItem,
  ScreenshotConfig,
  WaitConfig,
} from '../types.ts';

/**
 * Playwright-based scraping engine for dynamic content and browser automation
 */
export class PlaywrightEngine extends BaseScrapingEngine {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private screenshots: string[] = [];

  constructor(config: BaseScrapingConfig) {
    super(config);
  }

  /**
   * Initialize the Playwright engine
   */
  async initialize(): Promise<void> {
    // Validate configuration
    if (!this.config.extraction?.rules?.length) {
      throw new Error('No extraction rules defined');
    }

    await this.launchBrowser();
    await this.createBrowserContext();
    await this.createPage();
  }

  /**
   * Scrape a single URL using Playwright
   */
  async scrapeUrl(url: string): Promise<ScrapedDataItem> {
    if (!this.page) {
      throw new Error('Playwright page not initialized');
    }

    const startTime = Date.now();

    try {
      // Navigate to the URL
      const response = await this.navigateToUrl(url);

      // Wait for content to load
      await this.waitForContent();

      // Execute custom JavaScript if needed
      await this.executeCustomJavaScript();

      // Take screenshot if enabled
      if (this.config.browser?.screenshot?.enabled) {
        await this.takeScreenshot(url);
      }

      // Get page content
      const html = await this.page.content();
      const responseTime = Date.now() - startTime;

      // Extract data from HTML
      const extractedData = await this.extractData(html, url);

      // Create metadata
      const metadata: ItemMetadata = {
        responseTime,
        statusCode: response?.status() || 200,
        contentType: response?.headers()['content-type'] || 'text/html',
        contentLength: html.length,
        lastModified: response?.headers()['last-modified']
          ? new Date(response.headers()['last-modified'])
          : undefined,
        etag: response?.headers().etag,
        engine: 'playwright',
        browser: this.config.browser?.type || 'chromium',
      };

      return {
        id: this.generateItemId(),
        url,
        timestamp: new Date(),
        data: extractedData,
        metadata,
      };
    } catch (error) {
      throw new Error(`Failed to scrape ${url}: ${error}`);
    }
  }

  /**
   * Extract data from HTML content using Cheerio (same as CheerioEngine but with Playwright-rendered HTML)
   */
  async extractData(html: string, url: string): Promise<Record<string, unknown>> {
    const $ = cheerio.load(html);
    const data: Record<string, unknown> = {};

    // Apply global ignore selectors
    if (this.config.extraction.ignoreSelectors) {
      for (const selector of this.config.extraction.ignoreSelectors) {
        $(selector).remove();
      }
    }

    // Process extraction rules
    for (const rule of this.config.extraction.rules) {
      try {
        const extractedValue = await this.processExtractionRule($, rule, url);
        data[rule.name] = extractedValue;
      } catch (error) {
        if (rule.required) {
          throw new Error(`Failed to extract required field '${rule.name}': ${error}`);
        }
        data[rule.name] = rule.defaultValue;
      }
    }

    return data;
  }

  /**
   * Launch browser instance
   */
  private async launchBrowser(): Promise<void> {
    const browserType = this.config.browser?.type || 'chromium';
    const headless = this.config.browser?.headless !== false;
    const args = this.config.browser?.args || [];

    // Add stealth mode arguments
    const stealthArgs = [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
    ];

    const launchOptions = {
      headless,
      args: [...stealthArgs, ...args],
      devtools: !headless && process.env.NODE_ENV === 'development',
    };

    switch (browserType) {
      case 'chromium':
        this.browser = await chromium.launch(launchOptions);
        break;
      case 'firefox':
        this.browser = await firefox.launch(launchOptions);
        break;
      case 'webkit':
        this.browser = await webkit.launch(launchOptions);
        break;
      default:
        throw new Error(`Unsupported browser type: ${browserType}`);
    }
  }

  /**
   * Create browser context with configuration
   */
  private async createBrowserContext(): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not launched');
    }

    const contextOptions: any = {
      viewport: this.config.browser?.viewport || { width: 1920, height: 1080 },
      userAgent: this.config.request?.userAgent,
      extraHTTPHeaders: this.config.request?.headers || {},
      ignoreHTTPSErrors: true,
      javaScriptEnabled: this.config.browser?.javascript !== false,
    };

    // Set device emulation
    if (this.config.browser?.device) {
      const device = devices[this.config.browser.device];
      if (device) {
        Object.assign(contextOptions, device);
      }
    }

    // Set geolocation
    if (this.config.browser?.geolocation) {
      contextOptions.geolocation = this.config.browser.geolocation;
      contextOptions.permissions = ['geolocation'];
    }

    // Set timezone
    if (this.config.browser?.timezone) {
      contextOptions.timezoneId = this.config.browser.timezone;
    }

    // Configure proxy
    if (this.config.proxy) {
      const proxyUrl = new URL(this.config.proxy.server);
      contextOptions.proxy = {
        server: this.config.proxy.server,
        username: this.config.proxy.username,
        password: this.config.proxy.password,
      };
    }

    this.context = await this.browser.newContext(contextOptions);

    // Set cookies
    if (this.config.request?.cookies) {
      const cookies = this.config.request.cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain:
          cookie.domain ||
          new URL(Array.isArray(this.config.url) ? this.config.url[0] : this.config.url).hostname,
        path: cookie.path || '/',
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None' | undefined,
      }));
      await this.context.addCookies(cookies);
    }

    // Setup request interception for monitoring
    this.context.on('request', (request) => {
      this.session.metrics.totalRequests++;
    });

    this.context.on('response', (response) => {
      if (response.status() >= 200 && response.status() < 300) {
        this.session.metrics.successfulRequests++;
      } else {
        this.session.metrics.failedRequests++;
      }
    });
  }

  /**
   * Create a new page
   */
  private async createPage(): Promise<void> {
    if (!this.context) {
      throw new Error('Browser context not created');
    }

    this.page = await this.context.newPage();

    // Set timeout
    this.page.setDefaultTimeout(this.config.request?.timeout || 30000);

    // Block images if configured
    if (this.config.browser?.loadImages === false) {
      await this.page.route('**/*.{png,jpg,jpeg,gif,svg,webp}', (route) => route.abort());
    }

    // Setup console logging
    this.page.on('console', (msg) => {
      if (this.config.monitoring?.logLevel === 'debug') {
        console.log(`Browser console [${msg.type()}]: ${msg.text()}`);
      }
    });

    // Setup error handling
    this.page.on('pageerror', (error) => {
      console.warn('Page error:', error.message);
    });
  }

  /**
   * Navigate to URL with error handling
   */
  private async navigateToUrl(url: string) {
    if (!this.page) {
      throw new Error('Page not created');
    }

    const navigationOptions = {
      waitUntil: 'domcontentloaded' as const,
      timeout: this.config.request?.timeout || 30000,
    };

    return await this.page.goto(url, navigationOptions);
  }

  /**
   * Wait for content based on configuration
   */
  private async waitForContent(): Promise<void> {
    if (!this.page || !this.config.browser?.wait) {
      return;
    }

    const waitConfig = this.config.browser.wait;

    // Wait for page load
    if (waitConfig.pageLoad) {
      await this.page.waitForLoadState('load');
    }

    // Wait for network idle
    if (waitConfig.networkIdle) {
      await this.page.waitForLoadState('networkidle');
    }

    // Wait for specific selector
    if (waitConfig.selector) {
      await this.page.waitForSelector(waitConfig.selector, {
        timeout: waitConfig.timeout || 10000,
      });
    }

    // Wait for specific text
    if (waitConfig.text) {
      await this.page.waitForFunction(
        (text) => document.body.innerText.includes(text),
        waitConfig.text,
        { timeout: waitConfig.timeout || 10000 }
      );
    }

    // Execute custom wait function
    if (waitConfig.customWait) {
      await this.page.waitForFunction(waitConfig.customWait, {
        timeout: waitConfig.timeout || 10000,
      });
    }
  }

  /**
   * Execute custom JavaScript if configured
   */
  private async executeCustomJavaScript(): Promise<void> {
    if (!this.page) return;

    // This could be extended to support custom JavaScript execution
    // For now, we'll add some common optimizations

    // Remove ads and popups
    await this.page.evaluate(() => {
      const selectors = [
        '[id*="ad"]',
        '[class*="ad"]',
        '[id*="popup"]',
        '[class*="popup"]',
        '[id*="modal"]',
        '[class*="modal"]',
        '.advertisement',
        '.sponsored',
      ];

      selectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });
      });
    });

    // Scroll to load lazy content
    await this.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * Take screenshot
   */
  private async takeScreenshot(url: string): Promise<void> {
    if (!this.page || !this.config.browser?.screenshot?.enabled) {
      return;
    }

    const screenshotConfig = this.config.browser.screenshot;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const urlSlug = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-');

    const filename =
      screenshotConfig.pathTemplate?.replace('{timestamp}', timestamp)?.replace('{url}', urlSlug) ||
      `screenshot-${urlSlug}-${timestamp}.${screenshotConfig.format || 'png'}`;

    const screenshotOptions = {
      path: filename,
      type: screenshotConfig.format || ('png' as 'png' | 'jpeg'),
      quality: screenshotConfig.quality,
      fullPage: screenshotConfig.fullPage !== false,
    };

    await this.page.screenshot(screenshotOptions);
    this.screenshots.push(filename);
  }

  /**
   * Process extraction rule (similar to CheerioEngine but adapted for Playwright context)
   */
  private async processExtractionRule(
    $: cheerio.CheerioAPI,
    rule: ExtractionRule,
    url: string
  ): Promise<unknown> {
    // Use the same extraction logic as CheerioEngine since we're using Cheerio on the HTML
    let elements: cheerio.Cheerio<cheerio.Element>;

    if (rule.selectorType === 'xpath') {
      elements = this.selectByXPath($, rule.selector);
    } else {
      elements = $(rule.selector);
    }

    if (elements.length === 0) {
      if (rule.required) {
        throw new Error(`No elements found for selector: ${rule.selector}`);
      }
      return rule.defaultValue;
    }

    const values: unknown[] = [];

    elements.each((index, element) => {
      let value: string | undefined;
      const $element = $(element);

      if (rule.attribute) {
        if (rule.attribute === 'text') {
          value = $element.text();
        } else if (rule.attribute === 'html') {
          value = $element.html() || undefined;
        } else {
          value = $element.attr(rule.attribute);
        }
      } else {
        value = $element.text();
      }

      if (value !== undefined) {
        const processedValue = this.processText(value);
        const typedValue = this.convertToType(processedValue, rule.type, url);
        values.push(typedValue);
      }
    });

    return rule.multiple ? values : values.length > 0 ? values[0] : rule.defaultValue;
  }

  /**
   * Basic XPath to CSS selector conversion
   */
  private selectByXPath($: cheerio.CheerioAPI, xpath: string): cheerio.Cheerio<cheerio.Element> {
    let cssSelector = xpath;
    cssSelector = cssSelector.replace(/\/\//g, ' ');
    cssSelector = cssSelector.replace(/\//g, ' > ');
    cssSelector = cssSelector.replace(/\[@([^=]+)='([^']+)'\]/g, '[$1="$2"]');
    cssSelector = cssSelector.replace(/\[@([^=]+)\]/g, '[$1]');
    cssSelector = cssSelector.replace(/text\(\)/g, '');
    cssSelector = cssSelector.replace(/\[(\d+)\]/g, ':nth-child($1)');
    return $(cssSelector);
  }

  /**
   * Process text content
   */
  private processText(text: string): string {
    const config = this.config.extraction.textProcessing;
    if (!config) return text;

    let processed = text;

    if (config.trim) processed = processed.trim();
    if (config.normalizeWhitespace) processed = processed.replace(/\s+/g, ' ');
    if (config.stripHtml) processed = processed.replace(/<[^>]*>/g, '');
    if (config.toLowerCase) processed = processed.toLowerCase();
    if (config.toUpperCase) processed = processed.toUpperCase();

    return processed;
  }

  /**
   * Convert to specified data type
   */
  private convertToType(value: string, type?: string, url?: string): unknown {
    if (!type || type === 'text') return value;

    switch (type) {
      case 'number':
        const num = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? null : num;
      case 'boolean':
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
      case 'url':
        try {
          if (value.startsWith('/') && url) {
            return new URL(value, new URL(url).origin).href;
          }
          return new URL(value).href;
        } catch {
          return value;
        }
      case 'email':
        const emailMatch = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return emailMatch ? emailMatch[0] : null;
      case 'date':
        try {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date.toISOString();
        } catch {
          return null;
        }
      default:
        return value;
    }
  }

  /**
   * Generate unique item ID
   */
  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      console.debug('PlaywrightEngine cleanup completed');
    } catch (error) {
      console.warn('Error during PlaywrightEngine cleanup:', error);
    }
  }

  /**
   * Get screenshots taken during scraping
   */
  getScreenshots(): string[] {
    return [...this.screenshots];
  }

  /**
   * Execute JavaScript in browser context
   */
  async executeJavaScript(script: string): Promise<any> {
    if (!this.page) {
      throw new Error('Page not available');
    }
    return await this.page.evaluate(script);
  }

  /**
   * Click element by selector
   */
  async clickElement(selector: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }
    await this.page.click(selector);
  }

  /**
   * Type text into input field
   */
  async typeText(selector: string, text: string): Promise<void> {
    if (!this.page) {
      throw new Error('Page not available');
    }
    await this.page.fill(selector, text);
  }

  /**
   * Get current page title
   */
  async getPageTitle(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }
    return await this.page.title();
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl(): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }
    return this.page.url();
  }
}
