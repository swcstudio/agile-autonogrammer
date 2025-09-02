/**
 * Katalyst Web Scraper - Type Definitions
 * State-of-the-art TypeScript web scraping tool with support for static HTML,
 * dynamic content, bulk operations, and enterprise-grade features.
 */

// ============================================================================
// Core Scraper Types
// ============================================================================

/** Supported scraping engines */
export type ScrapingEngine = 'cheerio' | 'playwright' | 'puppeteer' | 'hybrid';

/** Supported browsers for automation */
export type BrowserType = 'chromium' | 'firefox' | 'webkit';

/** Output formats for scraped data */
export type OutputFormat = 'json' | 'csv' | 'xml' | 'yaml' | 'markdown' | 'html';

/** HTTP methods for requests */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** Log levels for the scraper */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

// ============================================================================
// Configuration Interfaces
// ============================================================================

/** Base configuration for all scraping operations */
export interface BaseScrapingConfig {
  /** Target URL(s) to scrape */
  url: string | string[];
  /** Scraping engine to use */
  engine: ScrapingEngine;
  /** Output configuration */
  output: OutputConfig;
  /** Request configuration */
  request?: RequestConfig;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Proxy configuration */
  proxy?: ProxyConfig;
  /** Browser automation settings (for Playwright/Puppeteer) */
  browser?: BrowserConfig;
  /** Content extraction rules */
  extraction: ExtractionConfig;
  /** Bulk scraping settings */
  bulk?: BulkScrapingConfig;
  /** Monitoring and logging */
  monitoring?: MonitoringConfig;
}

/** Request configuration */
export interface RequestConfig {
  /** HTTP method */
  method?: HttpMethod;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST/PUT requests) */
  body?: string | Record<string, unknown>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** User agent string */
  userAgent?: string;
  /** Cookies to include */
  cookies?: Cookie[];
  /** Follow redirects */
  followRedirects?: boolean;
  /** Maximum redirects to follow */
  maxRedirects?: number;
}

/** Cookie interface */
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/** Rate limiting configuration */
export interface RateLimitConfig {
  /** Requests per second */
  requestsPerSecond?: number;
  /** Requests per minute */
  requestsPerMinute?: number;
  /** Requests per hour */
  requestsPerHour?: number;
  /** Delay between requests in milliseconds */
  delay?: number;
  /** Random delay range [min, max] in milliseconds */
  randomDelay?: [number, number];
  /** Burst allowance */
  burst?: number;
}

/** Retry configuration */
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries?: number;
  /** Base delay between retries in milliseconds */
  baseDelay?: number;
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay?: number;
  /** HTTP status codes to retry */
  retryStatusCodes?: number[];
  /** Retry on network errors */
  retryOnNetworkError?: boolean;
}

/** Proxy configuration */
export interface ProxyConfig {
  /** Proxy server URL */
  server: string;
  /** Proxy username */
  username?: string;
  /** Proxy password */
  password?: string;
  /** Rotate proxies for bulk scraping */
  rotate?: boolean;
  /** List of proxy servers for rotation */
  proxyList?: string[];
}

/** Browser automation configuration */
export interface BrowserConfig {
  /** Browser type */
  type?: BrowserType;
  /** Run in headless mode */
  headless?: boolean;
  /** Browser launch arguments */
  args?: string[];
  /** Viewport size */
  viewport?: {
    width: number;
    height: number;
  };
  /** Wait conditions */
  wait?: WaitConfig;
  /** Screenshot configuration */
  screenshot?: ScreenshotConfig;
  /** JavaScript execution */
  javascript?: boolean;
  /** Load images */
  loadImages?: boolean;
  /** Device emulation */
  device?: string;
  /** Geolocation */
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  /** Timezone */
  timezone?: string;
}

/** Wait configuration for browser automation */
export interface WaitConfig {
  /** Wait for page load */
  pageLoad?: boolean;
  /** Wait for network idle */
  networkIdle?: boolean;
  /** Wait for specific selector */
  selector?: string;
  /** Wait for specific text content */
  text?: string;
  /** Custom wait function */
  customWait?: string;
  /** Maximum wait time in milliseconds */
  timeout?: number;
}

/** Screenshot configuration */
export interface ScreenshotConfig {
  /** Take screenshots */
  enabled?: boolean;
  /** Screenshot format */
  format?: 'png' | 'jpeg';
  /** Screenshot quality (for JPEG) */
  quality?: number;
  /** Full page screenshot */
  fullPage?: boolean;
  /** Screenshot path template */
  pathTemplate?: string;
}

/** Content extraction configuration */
export interface ExtractionConfig {
  /** Data extraction rules */
  rules: ExtractionRule[];
  /** Global selectors to ignore */
  ignoreSelectors?: string[];
  /** Text processing options */
  textProcessing?: TextProcessingConfig;
  /** Follow pagination */
  pagination?: PaginationConfig;
  /** Extract links */
  extractLinks?: LinkExtractionConfig;
}

/** Single extraction rule */
export interface ExtractionRule {
  /** Rule name/identifier */
  name: string;
  /** CSS selector or XPath */
  selector: string;
  /** Selector type */
  selectorType?: 'css' | 'xpath';
  /** Attribute to extract (default: text content) */
  attribute?: string;
  /** Data type */
  type?: 'text' | 'number' | 'boolean' | 'url' | 'email' | 'date';
  /** Whether this field is required */
  required?: boolean;
  /** Default value if not found */
  defaultValue?: unknown;
  /** Post-processing transformations */
  transform?: TransformConfig[];
  /** Extract multiple matches */
  multiple?: boolean;
  /** Nested extraction rules */
  nested?: ExtractionRule[];
}

/** Text processing configuration */
export interface TextProcessingConfig {
  /** Trim whitespace */
  trim?: boolean;
  /** Remove extra whitespace */
  normalizeWhitespace?: boolean;
  /** Convert to lowercase */
  toLowerCase?: boolean;
  /** Convert to uppercase */
  toUpperCase?: boolean;
  /** Remove HTML tags */
  stripHtml?: boolean;
  /** Decode HTML entities */
  decodeEntities?: boolean;
  /** Custom regex replacements */
  regexReplacements?: RegexReplacement[];
}

/** Regex replacement rule */
export interface RegexReplacement {
  pattern: string;
  replacement: string;
  flags?: string;
}

/** Data transformation configuration */
export interface TransformConfig {
  /** Transformation type */
  type: 'regex' | 'replace' | 'split' | 'join' | 'custom';
  /** Transformation parameters */
  params: Record<string, unknown>;
}

/** Pagination configuration */
export interface PaginationConfig {
  /** Enable pagination following */
  enabled: boolean;
  /** Next page selector */
  nextPageSelector?: string;
  /** Page number pattern */
  pageNumberPattern?: string;
  /** Maximum pages to scrape */
  maxPages?: number;
  /** Delay between pages in milliseconds */
  pageDelay?: number;
}

/** Link extraction configuration */
export interface LinkExtractionConfig {
  /** Enable link extraction */
  enabled: boolean;
  /** Link selectors */
  selectors?: string[];
  /** Filter patterns */
  filters?: string[];
  /** Follow extracted links */
  follow?: boolean;
  /** Maximum depth for link following */
  maxDepth?: number;
}

/** Bulk scraping configuration */
export interface BulkScrapingConfig {
  /** Enable bulk mode */
  enabled: boolean;
  /** Concurrency level */
  concurrency?: number;
  /** Batch size */
  batchSize?: number;
  /** Input source for URLs */
  inputSource?: InputSource;
  /** URL generation patterns */
  urlPatterns?: UrlPattern[];
  /** Progress tracking */
  progress?: ProgressConfig;
}

/** Input source for bulk scraping */
export interface InputSource {
  /** Source type */
  type: 'file' | 'csv' | 'json' | 'api' | 'sitemap';
  /** Source path or URL */
  source: string;
  /** Column/field name containing URLs */
  urlField?: string;
  /** Additional configuration */
  config?: Record<string, unknown>;
}

/** URL pattern for bulk generation */
export interface UrlPattern {
  /** Base URL template */
  template: string;
  /** Parameter ranges */
  parameters: UrlParameter[];
}

/** URL parameter definition */
export interface UrlParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'number' | 'string' | 'date';
  /** Value range */
  range: ParameterRange;
}

/** Parameter range definition */
export type ParameterRange =
  | { type: 'number'; min: number; max: number; step?: number }
  | { type: 'string'; values: string[] }
  | { type: 'date'; start: string; end: string; format?: string };

/** Progress tracking configuration */
export interface ProgressConfig {
  /** Enable progress tracking */
  enabled: boolean;
  /** Progress update interval */
  updateInterval?: number;
  /** Progress output format */
  format?: 'bar' | 'percentage' | 'detailed';
  /** Save progress to file */
  saveToFile?: string;
}

/** Output configuration */
export interface OutputConfig {
  /** Output format */
  format: OutputFormat;
  /** Output file path */
  filePath?: string;
  /** Pretty print JSON */
  prettyPrint?: boolean;
  /** Include metadata */
  includeMetadata?: boolean;
  /** Compression */
  compress?: boolean;
  /** Split large files */
  splitFiles?: boolean;
  /** Maximum file size for splitting */
  maxFileSize?: number;
}

/** Monitoring and logging configuration */
export interface MonitoringConfig {
  /** Log level */
  logLevel?: LogLevel;
  /** Log file path */
  logFile?: string;
  /** Enable performance metrics */
  metrics?: boolean;
  /** Metrics export configuration */
  metricsExport?: MetricsExportConfig;
  /** Error tracking */
  errorTracking?: ErrorTrackingConfig;
}

/** Metrics export configuration */
export interface MetricsExportConfig {
  /** Enable metrics export */
  enabled: boolean;
  /** Export format */
  format?: 'json' | 'csv' | 'prometheus';
  /** Export interval in milliseconds */
  interval?: number;
  /** Export file path */
  filePath?: string;
}

/** Error tracking configuration */
export interface ErrorTrackingConfig {
  /** Enable error tracking */
  enabled: boolean;
  /** Error log file */
  errorLogFile?: string;
  /** Include stack traces */
  includeStackTrace?: boolean;
  /** Error notification */
  notification?: NotificationConfig;
}

/** Notification configuration */
export interface NotificationConfig {
  /** Notification type */
  type: 'email' | 'webhook' | 'slack';
  /** Notification configuration */
  config: Record<string, unknown>;
}

// ============================================================================
// CLI Configuration
// ============================================================================

/** CLI command configuration */
export interface CliConfig {
  /** Command name */
  command: string;
  /** Command description */
  description: string;
  /** Command arguments */
  arguments?: CliArgument[];
  /** Command options */
  options?: CliOption[];
  /** Command examples */
  examples?: string[];
}

/** CLI argument definition */
export interface CliArgument {
  /** Argument name */
  name: string;
  /** Argument description */
  description: string;
  /** Is required */
  required?: boolean;
  /** Default value */
  defaultValue?: unknown;
}

/** CLI option definition */
export interface CliOption {
  /** Option flag */
  flag: string;
  /** Option description */
  description: string;
  /** Option type */
  type: 'string' | 'number' | 'boolean' | 'array';
  /** Default value */
  defaultValue?: unknown;
  /** Choices (for string/array types) */
  choices?: string[];
}

// ============================================================================
// Runtime Types
// ============================================================================

/** Scraping session information */
export interface ScrapingSession {
  /** Session ID */
  id: string;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Session configuration */
  config: BaseScrapingConfig;
  /** Session status */
  status: SessionStatus;
  /** Progress information */
  progress: SessionProgress;
  /** Error information */
  errors: ScrapingError[];
  /** Metrics */
  metrics: SessionMetrics;
}

/** Session status */
export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Session progress */
export interface SessionProgress {
  /** Total URLs to process */
  total: number;
  /** Completed URLs */
  completed: number;
  /** Failed URLs */
  failed: number;
  /** Current URL being processed */
  current?: string;
  /** Progress percentage */
  percentage: number;
  /** Estimated time remaining */
  eta?: number;
}

/** Session metrics */
export interface SessionMetrics {
  /** Total requests made */
  totalRequests: number;
  /** Successful requests */
  successfulRequests: number;
  /** Failed requests */
  failedRequests: number;
  /** Average response time */
  averageResponseTime: number;
  /** Data extracted count */
  dataExtracted: number;
  /** Bandwidth used */
  bandwidthUsed: number;
}

/** Scraping error */
export interface ScrapingError {
  /** Error ID */
  id: string;
  /** Error timestamp */
  timestamp: Date;
  /** URL that caused the error */
  url: string;
  /** Error type */
  type: ErrorType;
  /** Error message */
  message: string;
  /** Stack trace */
  stackTrace?: string;
  /** HTTP status code (if applicable) */
  statusCode?: number;
  /** Retry attempts */
  retryCount: number;
}

/** Error types */
export type ErrorType =
  | 'network_error'
  | 'timeout_error'
  | 'parser_error'
  | 'extraction_error'
  | 'browser_error'
  | 'rate_limit_error'
  | 'authentication_error'
  | 'unknown_error';

/** Scraped data item */
export interface ScrapedDataItem {
  /** Item ID */
  id: string;
  /** Source URL */
  url: string;
  /** Extraction timestamp */
  timestamp: Date;
  /** Extracted data */
  data: Record<string, unknown>;
  /** Metadata */
  metadata: ItemMetadata;
}

/** Item metadata */
export interface ItemMetadata {
  /** Response time */
  responseTime: number;
  /** HTTP status code */
  statusCode: number;
  /** Content type */
  contentType: string;
  /** Content length */
  contentLength: number;
  /** Last modified date */
  lastModified?: Date;
  /** ETag */
  etag?: string;
  /** Engine used */
  engine: ScrapingEngine;
  /** Browser used (if applicable) */
  browser?: BrowserType;
}

// ============================================================================
// Result Types
// ============================================================================

/** Scraping result */
export interface ScrapingResult {
  /** Operation success */
  success: boolean;
  /** Session information */
  session: ScrapingSession;
  /** Extracted data */
  data: ScrapedDataItem[];
  /** Summary statistics */
  summary: ResultSummary;
  /** Output file paths */
  outputFiles: string[];
}

/** Result summary */
export interface ResultSummary {
  /** Total URLs processed */
  totalUrls: number;
  /** Successful extractions */
  successfulExtractions: number;
  /** Failed extractions */
  failedExtractions: number;
  /** Total data items extracted */
  totalDataItems: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Average processing time per URL */
  averageTimePerUrl: number;
}

// ============================================================================
// Event Types
// ============================================================================

/** Scraping events */
export type ScrapingEvent =
  | SessionStartEvent
  | SessionEndEvent
  | UrlStartEvent
  | UrlEndEvent
  | DataExtractedEvent
  | ErrorEvent
  | ProgressEvent;

/** Base event interface */
export interface BaseEvent {
  /** Event type */
  type: string;
  /** Event timestamp */
  timestamp: Date;
  /** Session ID */
  sessionId: string;
}

/** Session start event */
export interface SessionStartEvent extends BaseEvent {
  type: 'session_start';
  config: BaseScrapingConfig;
}

/** Session end event */
export interface SessionEndEvent extends BaseEvent {
  type: 'session_end';
  result: ScrapingResult;
}

/** URL processing start event */
export interface UrlStartEvent extends BaseEvent {
  type: 'url_start';
  url: string;
}

/** URL processing end event */
export interface UrlEndEvent extends BaseEvent {
  type: 'url_end';
  url: string;
  success: boolean;
  data?: ScrapedDataItem;
  error?: ScrapingError;
}

/** Data extracted event */
export interface DataExtractedEvent extends BaseEvent {
  type: 'data_extracted';
  url: string;
  data: ScrapedDataItem;
}

/** Error event */
export interface ErrorEvent extends BaseEvent {
  type: 'error';
  error: ScrapingError;
}

/** Progress event */
export interface ProgressEvent extends BaseEvent {
  type: 'progress';
  progress: SessionProgress;
}

// ============================================================================
// Plugin System Types
// ============================================================================

/** Scraper plugin interface */
export interface ScraperPlugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin configuration schema */
  configSchema?: Record<string, unknown>;
  /** Plugin hooks */
  hooks: PluginHooks;
}

/** Plugin hook functions */
export interface PluginHooks {
  /** Before session start */
  beforeSessionStart?: (config: BaseScrapingConfig) => Promise<BaseScrapingConfig>;
  /** After session start */
  afterSessionStart?: (session: ScrapingSession) => Promise<void>;
  /** Before URL processing */
  beforeUrlProcess?: (url: string, config: BaseScrapingConfig) => Promise<string>;
  /** After URL processing */
  afterUrlProcess?: (url: string, data: ScrapedDataItem) => Promise<ScrapedDataItem>;
  /** Before data extraction */
  beforeDataExtraction?: (html: string, config: ExtractionConfig) => Promise<string>;
  /** After data extraction */
  afterDataExtraction?: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  /** On error */
  onError?: (error: ScrapingError) => Promise<void>;
  /** Before session end */
  beforeSessionEnd?: (session: ScrapingSession) => Promise<void>;
  /** After session end */
  afterSessionEnd?: (result: ScrapingResult) => Promise<ScrapingResult>;
}
