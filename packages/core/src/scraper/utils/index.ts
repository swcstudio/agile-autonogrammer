/**
 * Katalyst Web Scraper - Utility Functions
 * Collection of utility functions for web scraping operations
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, extname, resolve } from 'path';
import { URL } from 'url';
import type {
  BaseScrapingConfig,
  ExtractionRule,
  OutputFormat,
  RegexReplacement,
  ScrapedDataItem,
  TextProcessingConfig,
} from '../types.ts';

// ============================================================================
// URL Utilities
// ============================================================================

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize URL by removing fragments and query parameters if specified
 */
export function normalizeUrl(
  url: string,
  options: {
    removeQuery?: boolean;
    removeFragment?: boolean;
    removeTrailingSlash?: boolean;
  } = {}
): string {
  try {
    const urlObj = new URL(url);

    if (options.removeQuery) {
      urlObj.search = '';
    }

    if (options.removeFragment) {
      urlObj.hash = '';
    }

    let normalized = urlObj.toString();

    if (options.removeTrailingSlash && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return url;
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Convert relative URL to absolute URL
 */
export function resolveUrl(baseUrl: string, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

/**
 * Check if URL matches any of the given patterns
 */
export function matchesUrlPattern(url: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(url);
  });
}

// ============================================================================
// File Utilities
// ============================================================================

/**
 * Ensure directory exists, create if it doesn't
 */
export function ensureDirectory(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Read file with error handling
 */
export function readFileJson<T = any>(filePath: string): T {
  try {
    const content = readFileSync(resolve(filePath), 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error.message}`);
  }
}

/**
 * Write file with directory creation
 */
export function writeFileJson(filePath: string, data: any, prettyPrint = true): void {
  ensureDirectory(filePath);
  const content = JSON.stringify(data, null, prettyPrint ? 2 : 0);
  writeFileSync(resolve(filePath), content, 'utf-8');
}

/**
 * Get file extension
 */
export function getFileExtension(filePath: string): string {
  return extname(filePath).toLowerCase().slice(1);
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFilename(
  baseName: string,
  extension: string,
  timestamp = true
): string {
  const ts = timestamp ? `_${Date.now()}` : '';
  const random = Math.random().toString(36).substr(2, 6);
  return `${baseName}${ts}_${random}.${extension}`;
}

// ============================================================================
// Data Validation Utilities
// ============================================================================

/**
 * Validate scraping configuration
 */
export function validateConfig(config: BaseScrapingConfig): string[] {
  const errors: string[] = [];

  // Validate URL
  if (!config.url) {
    errors.push('URL is required');
  } else {
    const urls = Array.isArray(config.url) ? config.url : [config.url];
    for (const url of urls) {
      if (!isValidUrl(url)) {
        errors.push(`Invalid URL: ${url}`);
      }
    }
  }

  // Validate engine
  if (!config.engine) {
    errors.push('Scraping engine is required');
  }

  // Validate extraction rules
  if (!config.extraction?.rules?.length) {
    errors.push('At least one extraction rule is required');
  } else {
    config.extraction.rules.forEach((rule, index) => {
      if (!rule.name) {
        errors.push(`Extraction rule ${index}: name is required`);
      }
      if (!rule.selector) {
        errors.push(`Extraction rule ${index}: selector is required`);
      }
    });
  }

  // Validate output configuration
  if (config.output?.filePath && !config.output.format) {
    errors.push('Output format is required when output file is specified');
  }

  return errors;
}

/**
 * Validate extraction rule
 */
export function validateExtractionRule(rule: ExtractionRule): string[] {
  const errors: string[] = [];

  if (!rule.name?.trim()) {
    errors.push('Rule name is required');
  }

  if (!rule.selector?.trim()) {
    errors.push('Rule selector is required');
  }

  if (rule.type && !['text', 'number', 'boolean', 'url', 'email', 'date'].includes(rule.type)) {
    errors.push(`Invalid rule type: ${rule.type}`);
  }

  return errors;
}

// ============================================================================
// Text Processing Utilities
// ============================================================================

/**
 * Clean and normalize text content
 */
export function processText(text: string, config?: TextProcessingConfig): string {
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
    processed = decodeHtmlEntities(processed);
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
 * Decode HTML entities
 */
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  };

  return text.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

/**
 * Extract email addresses from text
 */
export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return text.match(emailRegex) || [];
}

/**
 * Extract phone numbers from text
 */
export function extractPhoneNumbers(text: string): string[] {
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  return text.match(phoneRegex) || [];
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return text.match(urlRegex) || [];
}

// ============================================================================
// Data Type Conversion Utilities
// ============================================================================

/**
 * Convert string to specified data type
 */
export function convertDataType(value: string, type: string, baseUrl?: string): any {
  switch (type) {
    case 'number':
      const num = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
      return isNaN(num) ? null : num;

    case 'boolean':
      return ['true', '1', 'yes', 'on', 'checked'].includes(value.toLowerCase());

    case 'url':
      try {
        if (value.startsWith('/') && baseUrl) {
          return new URL(value, new URL(baseUrl).origin).href;
        } else if (value.startsWith('//')) {
          const protocol = baseUrl ? new URL(baseUrl).protocol : 'https:';
          return `${protocol}${value}`;
        } else if (!value.startsWith('http')) {
          if (baseUrl) {
            return new URL(value, baseUrl).href;
          }
        }
        return new URL(value).href;
      } catch {
        return value;
      }

    case 'email':
      const emails = extractEmails(value);
      return emails.length > 0 ? emails[0] : null;

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

// ============================================================================
// Rate Limiting Utilities
// ============================================================================

/**
 * Rate limiter class
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.waitIfNeeded();
      }
    }

    this.requests.push(now);
  }
}

/**
 * Simple delay function
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.random() * (max - min) + min;
  return delay(ms);
}

// ============================================================================
// Retry Utilities
// ============================================================================

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

      await delay(delayMs);
    }
  }

  throw lastError;
}

// ============================================================================
// Progress Tracking Utilities
// ============================================================================

/**
 * Progress tracker class
 */
export class ProgressTracker {
  private total: number;
  private completed = 0;
  private failed = 0;
  private startTime: number;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  increment(): void {
    this.completed++;
  }

  incrementFailed(): void {
    this.failed++;
  }

  getProgress(): {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
    eta: number | null;
    elapsed: number;
  } {
    const elapsed = Date.now() - this.startTime;
    const processed = this.completed + this.failed;
    const percentage = this.total > 0 ? (processed / this.total) * 100 : 0;

    let eta: number | null = null;
    if (this.completed > 0 && processed < this.total) {
      const averageTime = elapsed / processed;
      const remaining = this.total - processed;
      eta = remaining * averageTime;
    }

    return {
      total: this.total,
      completed: this.completed,
      failed: this.failed,
      percentage,
      eta,
      elapsed,
    };
  }

  formatProgress(): string {
    const progress = this.getProgress();
    const percentage = Math.round(progress.percentage);
    const eta = progress.eta ? ` ETA: ${Math.round(progress.eta / 1000)}s` : '';

    return `Progress: ${percentage}% (${progress.completed}/${progress.total}) Failed: ${progress.failed}${eta}`;
  }
}

// ============================================================================
// Output Formatting Utilities
// ============================================================================

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: ScrapedDataItem[]): string {
  if (!data.length) return '';

  // Get all unique keys from all data items
  const allKeys = new Set<string>();
  data.forEach((item) => {
    Object.keys(item.data).forEach((key) => allKeys.add(key));
  });

  const headers = Array.from(allKeys);
  const csvRows = [headers.join(',')];

  for (const item of data) {
    const row = headers.map((header) => {
      const value = item.data[header] || '';
      // Escape values that contain commas, quotes, or newlines
      if (
        typeof value === 'string' &&
        (value.includes(',') || value.includes('"') || value.includes('\n'))
      ) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Convert data to XML format
 */
export function convertToXML(data: ScrapedDataItem[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<results>\n';

  for (const item of data) {
    xml += '  <item>\n';
    xml += `    <url><![CDATA[${item.url}]]></url>\n`;
    xml += `    <timestamp>${item.timestamp}</timestamp>\n`;
    xml += '    <data>\n';

    for (const [key, value] of Object.entries(item.data)) {
      const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '_');
      xml += `      <${safeKey}><![CDATA[${value}]]></${safeKey}>\n`;
    }

    xml += '    </data>\n';
    xml += '  </item>\n';
  }

  xml += '</results>';
  return xml;
}

/**
 * Convert data to YAML format
 */
export function convertToYAML(data: ScrapedDataItem[]): string {
  let yaml = '---\nresults:\n';

  for (const item of data) {
    yaml += `  - url: "${item.url}"\n`;
    yaml += `    timestamp: "${item.timestamp}"\n`;
    yaml += '    data:\n';

    for (const [key, value] of Object.entries(item.data)) {
      const yamlValue = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : value;
      yaml += `      ${key}: ${yamlValue}\n`;
    }
  }

  return yaml;
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Create standardized error
 */
export function createScrapingError(
  url: string,
  error: any,
  type = 'unknown_error'
): {
  url: string;
  type: string;
  message: string;
  statusCode?: number;
  timestamp: string;
} {
  return {
    url,
    type,
    message: error instanceof Error ? error.message : String(error),
    statusCode: error.status || error.statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  const statusCode = error.status || error.statusCode;

  if (statusCode && retryableStatuses.includes(statusCode)) {
    return true;
  }

  if (error.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
    return true;
  }

  return false;
}

// ============================================================================
// Configuration Utilities
// ============================================================================

/**
 * Merge configurations with deep merge
 */
export function mergeConfigs(
  base: Partial<BaseScrapingConfig>,
  override: Partial<BaseScrapingConfig>
): BaseScrapingConfig {
  return {
    ...base,
    ...override,
    request: { ...base.request, ...override.request },
    browser: { ...base.browser, ...override.browser },
    extraction: {
      ...base.extraction,
      ...override.extraction,
      rules: override.extraction?.rules || base.extraction?.rules || [],
    },
    rateLimit: { ...base.rateLimit, ...override.rateLimit },
    retry: { ...base.retry, ...override.retry },
    proxy: { ...base.proxy, ...override.proxy },
    bulk: { ...base.bulk, ...override.bulk },
    monitoring: { ...base.monitoring, ...override.monitoring },
  } as BaseScrapingConfig;
}

/**
 * Load configuration from various sources
 */
export function loadConfiguration(source: string | object): BaseScrapingConfig {
  if (typeof source === 'object') {
    return source as BaseScrapingConfig;
  }

  if (typeof source === 'string') {
    if (isValidUrl(source)) {
      // TODO: Load from URL
      throw new Error('Loading configuration from URL not yet implemented');
    } else {
      // Load from file
      return readFileJson<BaseScrapingConfig>(source);
    }
  }

  throw new Error('Invalid configuration source');
}

// ============================================================================
// Utility Exports
// ============================================================================

export const utils = {
  url: {
    isValid: isValidUrl,
    normalize: normalizeUrl,
    extractDomain,
    resolve: resolveUrl,
    matchesPattern: matchesUrlPattern,
  },
  file: {
    ensureDirectory,
    readJson: readFileJson,
    writeJson: writeFileJson,
    getExtension: getFileExtension,
    generateUniqueFilename,
  },
  validation: {
    validateConfig,
    validateExtractionRule,
  },
  text: {
    process: processText,
    decodeEntities: decodeHtmlEntities,
    extractEmails,
    extractPhoneNumbers,
    extractUrls,
  },
  data: {
    convertType: convertDataType,
  },
  rate: {
    RateLimiter,
    delay,
    randomDelay,
  },
  retry: {
    withBackoff: retryWithBackoff,
  },
  progress: {
    ProgressTracker,
  },
  format: {
    toCSV: convertToCSV,
    toXML: convertToXML,
    toYAML: convertToYAML,
  },
  error: {
    create: createScrapingError,
    isRetryable: isRetryableError,
  },
  config: {
    merge: mergeConfigs,
    load: loadConfiguration,
  },
};

export default utils;
