/**
 * Katalyst Web Scraper - Cheerio Engine
 * High-performance static HTML scraping engine using Cheerio and Axios
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { BaseScrapingEngine } from '../core/engine.ts';
import {
  type BaseScrapingConfig,
  type ExtractionRule,
  type ItemMetadata,
  RegexReplacement,
  type ScrapedDataItem,
  type TextProcessingConfig,
  type TransformConfig,
} from '../types.ts';

/**
 * Cheerio-based scraping engine for static HTML content
 */
export class CheerioEngine extends BaseScrapingEngine {
  private httpClient: AxiosInstance;
  private defaultHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  constructor(config: BaseScrapingConfig) {
    super(config);
    this.httpClient = this.createHttpClient();
  }

  /**
   * Initialize the Cheerio engine
   */
  async initialize(): Promise<void> {
    // Validate configuration
    if (!this.config.extraction?.rules?.length) {
      throw new Error('No extraction rules defined');
    }

    // Test connectivity if needed
    if (this.config.request?.timeout) {
      this.httpClient.defaults.timeout = this.config.request.timeout;
    }
  }

  /**
   * Scrape a single URL
   */
  async scrapeUrl(url: string): Promise<ScrapedDataItem> {
    const startTime = Date.now();

    // Prepare request configuration
    const requestConfig = this.buildRequestConfig(url);

    // Make HTTP request
    const response = await this.httpClient.request(requestConfig);
    const responseTime = Date.now() - startTime;

    // Extract data from HTML
    const extractedData = await this.extractData(response.data, url);

    // Create metadata
    const metadata: ItemMetadata = {
      responseTime,
      statusCode: response.status,
      contentType: response.headers['content-type'] || 'text/html',
      contentLength: response.data.length,
      lastModified: response.headers['last-modified'] ? new Date(response.headers['last-modified']) : undefined,
      etag: response.headers.etag,
      engine: 'cheerio',
    };

    return {
      id: this.generateItemId(),
      url,
      timestamp: new Date(),
      data: extractedData,
      metadata,
    };
  }

  /**
   * Extract data from HTML content using Cheerio
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

    // Execute hook for HTML preprocessing
    const processedHtml = await this.executeHook('beforeDataExtraction', html, this.config.extraction);
    if (processedHtml && processedHtml !== html) {
      const $ = cheerio.load(processedHtml);
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

    // Execute hook for post-processing
    const processedData = await this.executeHook('afterDataExtraction', data);
    return processedData || data;
  }

  /**
   * Process a single extraction rule
   */
  private async processExtractionRule(
    $: cheerio.CheerioAPI,
    rule: ExtractionRule,
    url: string
  ): Promise<unknown> {
    let elements: cheerio.Cheerio<cheerio.Element>;

    // Select elements based on selector type
    if (rule.selectorType === 'xpath') {
      // Note: Cheerio doesn't support XPath natively, but we can simulate basic XPath
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

    // Extract values
    const values: unknown[] = [];

    elements.each((index, element) => {
      let value: string | undefined;
      const $element = $(element);

      // Extract value based on attribute
      if (rule.attribute) {
        if (rule.attribute === 'text') {
          value = $element.text();
        } else if (rule.attribute === 'html') {
          value = $element.html() || undefined;
        } else if (rule.attribute === 'outerHTML') {
          value = $.html($element);
        } else {
          value = $element.attr(rule.attribute);
        }
      } else {
        value = $element.text();
      }

      if (value !== undefined) {
        // Apply text processing
        let processedValue = this.processText(value, this.config.extraction.textProcessing);

        // Apply transformations
        if (rule.transform) {
          processedValue = this.applyTransformations(processedValue, rule.transform);
        }

        // Convert to specified type
        const typedValue = this.convertToType(processedValue, rule.type, url);

        // Handle nested extraction
        if (rule.nested && rule.nested.length > 0) {
          const nestedData: Record<string, unknown> = {};
          for (const nestedRule of rule.nested) {
            try {
              const nestedValue = await this.processExtractionRule($element as any, nestedRule, url);
              nestedData[nestedRule.name] = nestedValue;
            } catch (error) {
              if (nestedRule.required) {
                throw error;
              }
              nestedData[nestedRule.name] = nestedRule.defaultValue;
            }
          }
          values.push(nestedData);
        } else {
          values.push(typedValue);
        }
      }
    });

    // Return single value or array based on rule configuration
    if (rule.multiple) {
      return values;
    } else {
      return values.length > 0 ? values[0] : rule.defaultValue;
    }
  }

  /**
   * Basic XPath simulation for Cheerio
   */
  private selectByXPath($: cheerio.CheerioAPI, xpath: string): cheerio.Cheerio<cheerio.Element> {
    // This is a simplified XPath to CSS selector conversion
    // Full XPath support would require a dedicated library

    let cssSelector = xpath;

    // Convert some basic XPath patterns to CSS selectors
    cssSelector = cssSelector.replace(/\/\//g, ' '); // Descendant
    cssSelector = cssSelector.replace(/\//g, ' > '); // Child
    cssSelector = cssSelector.replace(/\[@([^=]+)='([^']+)'\]/g, '[$1="$2"]'); // Attribute equals
    cssSelector = cssSelector.replace(/\[@([^=]+)\]/g, '[$1]'); // Attribute exists
    cssSelector = cssSelector.replace(/text\(\)/g, ''); // Remove text() function

    // Handle position selectors
    cssSelector = cssSelector.replace(/\[(\d+)\]/g, ':nth-child($1)');
    cssSelector = cssSelector.replace(/\[last\(\)\]/g, ':last-child');

    return $(cssSelector);
  }

  /**
   * Process text content
   */
  private processText(text: string, config?: TextProcessingConfig): string {
    if (!config) return text;

    let processed = text;

    if (config.trim) {
      processed = processed.trim();
    }

    if (config.normalizeWhitespace) {
      processed = processed.replace(/\s+/g, ' ');
    }

    if (config.stripHtml) {
      processed = processed.replace(/<[^>]*>/g, '');
    }

    if (config.decodeEntities) {
      processed = this.decodeHtmlEntities(processed);
    }

    if (config.toLowerCase) {
      processed = processed.toLowerCase();
    }

    if (config.toUpperCase) {
      processed = processed.toUpperCase();
    }

    if (config.regexReplacements) {
      for (const replacement of config.regexReplacements) {
        const regex = new RegExp(replacement.pattern, replacement.flags || 'g');
        processed = processed.replace(regex, replacement.replacement);
      }
    }

    return processed;
  }

  /**
   * Apply transformations to extracted data
   */
  private applyTransformations(value: string, transforms: TransformConfig[]): string {
    let result = value;

    for (const transform of transforms) {
      switch (transform.type) {
        case 'regex':
          const pattern = transform.params.pattern as string;
          const replacement = transform.params.replacement as string;
          const flags = transform.params.flags as string || 'g';
          result = result.replace(new RegExp(pattern, flags), replacement);
          break;

        case 'replace':
          const search = transform.params.search as string;
          const replaceWith = transform.params.replaceWith as string;
          result = result.replace(new RegExp(search, 'g'), replaceWith);
          break;

        case 'split':
          const delimiter = transform.params.delimiter as string;
          const index = transform.params.index as number;
          const parts = result.split(delimiter);
          result = parts[index] || result;
          break;

        case 'join':
          // Assuming the value is an array-like string
          const joinDelimiter = transform.params.delimiter as string;
          const array = result.split(/,|\n|\r\n/);
          result = array.join(joinDelimiter);
          break;

        case 'custom':
          // Custom transformation function
          const customFunction = transform.params.function as string;
          try {
            const func = new Function('value', customFunction);
            result = func(result);
          } catch (error) {
            console.warn('Custom transformation failed:', error);
          }
          break;
      }
    }

    return result;
  }

  /**
   * Convert string value to specified type
   */
  private convertToType(value: string, type?: string, url?: string): unknown {
    if (!type || type === 'text') {
      return value;
    }

    switch (type) {
      case 'number':
        const num = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? null : num;

      case 'boolean':
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());

      case 'url':
        try {
          // Handle relative URLs
          if (value.startsWith('/') && url) {
            const baseUrl = new URL(url);
            return new URL(value, baseUrl.origin).href;
          } else if (value.startsWith('//')) {
            const protocol = url ? new URL(url).protocol : 'https:';
            return `${protocol}${value}`;
          } else if (!value.startsWith('http')) {
            if (url) {
              return new URL(value, url).href;
            }
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
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }

  /**
   * Create HTTP client instance
   */
  private createHttpClient(): AxiosInstance {
    const config: AxiosRequestConfig = {
      timeout: this.config.request?.timeout || 30000,
      maxRedirects: this.config.request?.maxRedirects || 5,
      headers: {
        ...this.defaultHeaders,
        ...this.config.request?.headers,
      },
    };

    // Configure proxy
    if (this.config.proxy) {
      config.proxy = {
        host: new URL(this.config.proxy.server).hostname,
        port: Number.parseInt(new URL(this.config.proxy.server).port) || 8080,
        auth: this.config.proxy.username ? {
          username: this.config.proxy.username,
          password: this.config.proxy.password || '',
        } : undefined,
      };
    }

    const client = axios.create(config);

    // Add request interceptor for rate limiting and retries
    client.interceptors.request.use((config) => {
      // Add custom user agent if specified
      if (this.config.request?.userAgent) {
        config.headers!['User-Agent'] = this.config.request.userAgent;
      }

      return config;
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Enhance error with additional information
        if (error.response) {
          error.statusCode = error.response.status;
          error.statusText = error.response.statusText;
        }
        throw error;
      }
    );

    return client;
  }

  /**
   * Build request configuration for a specific URL
   */
  private buildRequestConfig(url: string): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
      url,
      method: this.config.request?.method || 'GET',
      headers: {},
    };

    // Add cookies
    if (this.config.request?.cookies) {
      const cookieString = this.config.request.cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      config.headers!['Cookie'] = cookieString;
    }

    // Add request body for POST/PUT requests
    if (this.config.request?.body && ['POST', 'PUT', 'PATCH'].includes(config.method!)) {
      if (typeof this.config.request.body === 'string') {
        config.data = this.config.request.body;
      } else {
        config.data = this.config.request.body;
        config.headers!['Content-Type'] = 'application/json';
      }
    }

    return config;
  }

  /**
   * Execute plugin hook (placeholder for future plugin system)
   */
  private async executeHook(hookName: string, ...args: any[]): Promise<any> {
    // This would be implemented to work with the plugin system
    // For now, it's a placeholder
    return undefined;
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
    // Close any persistent connections
    // Cheerio and Axios don't require explicit cleanup, but we can add logging
    console.debug('CheerioEngine cleanup completed');
  }
}
