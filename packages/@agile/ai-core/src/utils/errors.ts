/**
 * AI Error Utilities
 * Standardized error creation and handling for AI operations
 */

import type { AIError, ModelProvider } from '../types';

/**
 * Create a standardized AI error
 */
export function createAIError(
  message: string,
  code: AIError['code'],
  provider: ModelProvider,
  statusCode?: number,
  retryAfter?: number
): AIError {
  const error = new Error(message) as AIError;
  error.code = code;
  error.provider = provider;
  error.statusCode = statusCode;
  error.retryAfter = retryAfter;
  
  // Set the name for better stack traces
  error.name = `AIError[${code}]`;
  
  return error;
}

/**
 * Determine error code from HTTP status
 */
export function getErrorCodeFromStatus(status: number): AIError['code'] {
  switch (status) {
    case 401:
    case 403:
      return 'AUTH_ERROR';
    case 429:
      return 'RATE_LIMIT';
    case 413:
      return 'CONTEXT_LENGTH';
    case 400:
      return 'CONTENT_FILTER';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'NETWORK_ERROR';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Extract retry-after value from error response
 */
export function extractRetryAfter(headers: Headers | Record<string, string>): number | undefined {
  const retryAfterHeader = headers instanceof Headers 
    ? headers.get('retry-after')
    : headers['retry-after'] || headers['Retry-After'];

  if (retryAfterHeader) {
    const seconds = parseInt(retryAfterHeader, 10);
    return isNaN(seconds) ? undefined : seconds * 1000; // Convert to milliseconds
  }

  return undefined;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AIError): boolean {
  return error.code === 'RATE_LIMIT' || error.code === 'NETWORK_ERROR';
}

/**
 * Check if error is a client error (4xx)
 */
export function isClientError(error: AIError): boolean {
  return error.statusCode ? error.statusCode >= 400 && error.statusCode < 500 : false;
}

/**
 * Check if error is a server error (5xx)
 */
export function isServerError(error: AIError): boolean {
  return error.statusCode ? error.statusCode >= 500 : false;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: AIError): string {
  const parts = [
    `[${error.code}]`,
    `Provider: ${error.provider}`,
    `Message: ${error.message}`,
  ];

  if (error.statusCode) {
    parts.push(`Status: ${error.statusCode}`);
  }

  if (error.retryAfter) {
    parts.push(`Retry After: ${error.retryAfter}ms`);
  }

  return parts.join(' | ');
}

/**
 * Create error from fetch response
 */
export async function createErrorFromResponse(
  response: Response,
  provider: ModelProvider
): Promise<AIError> {
  const status = response.status;
  const code = getErrorCodeFromStatus(status);
  const retryAfter = extractRetryAfter(response.headers);

  let message = `HTTP ${status}: ${response.statusText}`;

  try {
    const body = await response.text();
    if (body) {
      // Try to parse JSON error message
      try {
        const parsed = JSON.parse(body);
        message = parsed.error?.message || parsed.message || message;
      } catch {
        // Use raw text if not JSON
        message = body.slice(0, 200); // Limit length
      }
    }
  } catch {
    // Ignore body parsing errors
  }

  return createAIError(message, code, provider, status, retryAfter);
}

/**
 * Sanitize error message for user display
 */
export function sanitizeErrorMessage(error: AIError): string {
  // Remove sensitive information like API keys
  let message = error.message;

  // Common patterns to sanitize
  const patterns = [
    /sk-[a-zA-Z0-9]+/g, // OpenAI API keys
    /Bearer\s+[a-zA-Z0-9-_]+/g, // Bearer tokens
    /api[_-]?key[:\s=]+[a-zA-Z0-9-_]+/gi, // Generic API key patterns
  ];

  for (const pattern of patterns) {
    message = message.replace(pattern, '[REDACTED]');
  }

  return message;
}

/**
 * Error aggregation for batch operations
 */
export class ErrorAggregator {
  private errors: AIError[] = [];

  add(error: AIError): void {
    this.errors.push(error);
  }

  has(): boolean {
    return this.errors.length > 0;
  }

  getAll(): AIError[] {
    return [...this.errors];
  }

  getByProvider(): Record<ModelProvider, AIError[]> {
    const byProvider = {} as Record<ModelProvider, AIError[]>;

    for (const error of this.errors) {
      if (!byProvider[error.provider]) {
        byProvider[error.provider] = [];
      }
      byProvider[error.provider].push(error);
    }

    return byProvider;
  }

  getByCode(): Record<AIError['code'], AIError[]> {
    const byCode = {} as Record<AIError['code'], AIError[]>;

    for (const error of this.errors) {
      if (!byCode[error.code]) {
        byCode[error.code] = [];
      }
      byCode[error.code].push(error);
    }

    return byCode;
  }

  getSummary(): string {
    if (this.errors.length === 0) {
      return 'No errors';
    }

    const byCode = this.getByCode();
    const summary = Object.entries(byCode)
      .map(([code, errors]) => `${code}: ${errors.length}`)
      .join(', ');

    return `${this.errors.length} error(s) - ${summary}`;
  }

  clear(): void {
    this.errors = [];
  }
}

/**
 * Rate limit tracker for providers
 */
export class RateLimitTracker {
  private limits = new Map<ModelProvider, RateLimitInfo>();

  update(provider: ModelProvider, error: AIError): void {
    if (error.code !== 'RATE_LIMIT') {
      return;
    }

    const info: RateLimitInfo = {
      provider,
      hitAt: Date.now(),
      retryAfter: error.retryAfter || 60000, // Default 1 minute
      statusCode: error.statusCode || 429,
    };

    this.limits.set(provider, info);
  }

  isLimited(provider: ModelProvider): boolean {
    const limit = this.limits.get(provider);
    if (!limit) {
      return false;
    }

    return Date.now() < limit.hitAt + limit.retryAfter;
  }

  getRetryAfter(provider: ModelProvider): number | null {
    const limit = this.limits.get(provider);
    if (!limit) {
      return null;
    }

    const remaining = limit.hitAt + limit.retryAfter - Date.now();
    return remaining > 0 ? remaining : null;
  }

  clear(provider?: ModelProvider): void {
    if (provider) {
      this.limits.delete(provider);
    } else {
      this.limits.clear();
    }
  }
}

interface RateLimitInfo {
  provider: ModelProvider;
  hitAt: number;
  retryAfter: number;
  statusCode: number;
}