/**
 * Advanced Logger with Multiple Transports
 * Supports structured logging, log levels, and various outputs
 */

import { EventEmitter } from 'events';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  SILENT = 6
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  metadata?: Record<string, any>;
  context?: string;
  stack?: string;
  duration?: number;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  hostname?: string;
  pid?: number;
  tags?: string[];
}

export interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  transports?: Transport[];
  metadata?: Record<string, any>;
  format?: LogFormatter;
  filters?: LogFilter[];
  errorHandler?: (error: Error) => void;
  exitOnFatal?: boolean;
  bufferSize?: number;
  flushInterval?: number;
}

export interface Transport {
  name: string;
  level?: LogLevel;
  write(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

export interface LogFilter {
  filter(entry: LogEntry): boolean;
}

/**
 * Console Transport
 */
export class ConsoleTransport implements Transport {
  name = 'console';
  level?: LogLevel;
  private colors = {
    [LogLevel.TRACE]: '\x1b[90m',   // Gray
    [LogLevel.DEBUG]: '\x1b[36m',   // Cyan
    [LogLevel.INFO]: '\x1b[32m',    // Green
    [LogLevel.WARN]: '\x1b[33m',    // Yellow
    [LogLevel.ERROR]: '\x1b[31m',   // Red
    [LogLevel.FATAL]: '\x1b[35m',   // Magenta
  };
  private reset = '\x1b[0m';

  constructor(options: { level?: LogLevel; colors?: boolean } = {}) {
    this.level = options.level;
  }

  write(entry: LogEntry): void {
    const method = this.getConsoleMethod(entry.level);
    const color = this.colors[entry.level] || '';
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}]` : '';
    
    const prefix = `${color}${timestamp} ${level.padEnd(5)} ${context}${this.reset}`;
    
    if (entry.data) {
      console[method](prefix, entry.message, entry.data);
    } else {
      console[method](prefix, entry.message);
    }
    
    if (entry.stack) {
      console[method](entry.stack);
    }
  }

  private getConsoleMethod(level: LogLevel): 'log' | 'info' | 'warn' | 'error' {
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        return 'log';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return 'error';
      default:
        return 'log';
    }
  }
}

/**
 * File Transport
 */
export class FileTransport implements Transport {
  name = 'file';
  level?: LogLevel;
  private buffer: LogEntry[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private intervalId?: NodeJS.Timeout;
  private filename: string;

  constructor(options: {
    filename: string;
    level?: LogLevel;
    bufferSize?: number;
    flushInterval?: number;
  }) {
    this.filename = options.filename;
    this.level = options.level;
    this.bufferSize = options.bufferSize || 100;
    this.flushInterval = options.flushInterval || 5000;
    
    this.startAutoFlush();
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = this.buffer.splice(0, this.buffer.length);
    const lines = entries.map(entry => JSON.stringify(entry)).join('\n');
    
    // In a real implementation, this would write to a file
    // For now, we'll just log it
    console.log(`[FileTransport] Would write ${entries.length} entries to ${this.filename}`);
  }

  private startAutoFlush(): void {
    this.intervalId = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  close(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.flush();
  }
}

/**
 * HTTP Transport
 */
export class HTTPTransport implements Transport {
  name = 'http';
  level?: LogLevel;
  private buffer: LogEntry[] = [];
  private bufferSize: number;
  private flushInterval: number;
  private intervalId?: NodeJS.Timeout;
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(options: {
    endpoint: string;
    headers?: Record<string, string>;
    level?: LogLevel;
    bufferSize?: number;
    flushInterval?: number;
  }) {
    this.endpoint = options.endpoint;
    this.headers = options.headers || {};
    this.level = options.level;
    this.bufferSize = options.bufferSize || 50;
    this.flushInterval = options.flushInterval || 10000;
    
    this.startAutoFlush();
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const entries = this.buffer.splice(0, this.buffer.length);
    
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify({ logs: entries })
      });
    } catch (error) {
      console.error('Failed to send logs to HTTP endpoint:', error);
      // Re-add to buffer for retry
      this.buffer.unshift(...entries);
    }
  }

  private startAutoFlush(): void {
    this.intervalId = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  close(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.flush();
  }
}

/**
 * JSON Formatter
 */
export class JSONFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }
}

/**
 * Pretty Formatter
 */
export class PrettyFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const context = entry.context ? `[${entry.context}]` : '';
    const message = entry.message;
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    
    return `${timestamp} ${level} ${context} ${message}${data}`;
  }
}

/**
 * Main Logger Class
 */
export class Logger extends EventEmitter {
  private options: Required<LoggerOptions>;
  private transports: Transport[];
  private contextStack: string[] = [];
  private timers: Map<string, number> = new Map();
  private groups: string[] = [];
  private metadata: Record<string, any> = {};

  constructor(options: LoggerOptions = {}) {
    super();
    
    this.options = {
      level: options.level ?? LogLevel.INFO,
      context: options.context ?? '',
      transports: options.transports ?? [new ConsoleTransport()],
      metadata: options.metadata ?? {},
      format: options.format ?? new PrettyFormatter(),
      filters: options.filters ?? [],
      errorHandler: options.errorHandler ?? console.error,
      exitOnFatal: options.exitOnFatal ?? false,
      bufferSize: options.bufferSize ?? 100,
      flushInterval: options.flushInterval ?? 5000
    };
    
    this.transports = this.options.transports;
    this.metadata = this.options.metadata;
    
    // Setup error handling
    this.setupErrorHandling();
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any, metadata?: Record<string, any>): void {
    if (level < this.options.level) return;
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      metadata: { ...this.metadata, ...metadata },
      context: this.contextStack.join(' > ') || this.options.context,
      correlationId: this.metadata.correlationId,
      userId: this.metadata.userId,
      sessionId: this.metadata.sessionId,
      requestId: this.metadata.requestId,
      hostname: typeof window === 'undefined' ? require('os').hostname() : window.location.hostname,
      pid: typeof process !== 'undefined' ? process.pid : undefined,
      tags: this.metadata.tags
    };
    
    // Apply filters
    for (const filter of this.options.filters) {
      if (!filter.filter(entry)) return;
    }
    
    // Add stack trace for errors
    if (data instanceof Error) {
      entry.stack = data.stack;
      entry.data = {
        name: data.name,
        message: data.message,
        ...data
      };
    }
    
    // Write to transports
    for (const transport of this.transports) {
      if (transport.level === undefined || level >= transport.level) {
        try {
          transport.write(entry);
        } catch (error) {
          this.options.errorHandler(error as Error);
        }
      }
    }
    
    // Emit log event
    this.emit('log', entry);
    
    // Exit on fatal
    if (level === LogLevel.FATAL && this.options.exitOnFatal) {
      this.flush();
      if (typeof process !== 'undefined') {
        process.exit(1);
      }
    }
  }

  /**
   * Log levels
   */
  trace(message: string, data?: any, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, data, metadata);
  }

  debug(message: string, data?: any, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data, metadata);
  }

  info(message: string, data?: any, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data, metadata);
  }

  warn(message: string, data?: any, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data, metadata);
  }

  error(message: string, data?: any, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, data, metadata);
  }

  fatal(message: string, data?: any, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, data, metadata);
  }

  /**
   * Create child logger with context
   */
  child(context: string, metadata?: Record<string, any>): Logger {
    const childOptions = {
      ...this.options,
      context: this.options.context ? `${this.options.context} > ${context}` : context,
      metadata: { ...this.metadata, ...metadata }
    };
    
    return new Logger(childOptions);
  }

  /**
   * Push context
   */
  pushContext(context: string): void {
    this.contextStack.push(context);
  }

  /**
   * Pop context
   */
  popContext(): string | undefined {
    return this.contextStack.pop();
  }

  /**
   * Start timer
   */
  time(label: string): void {
    this.timers.set(label, performance.now());
    this.debug(`Timer started: ${label}`);
  }

  /**
   * End timer
   */
  timeEnd(label: string): void {
    const start = this.timers.get(label);
    if (start) {
      const duration = performance.now() - start;
      this.timers.delete(label);
      this.debug(`Timer ended: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    }
  }

  /**
   * Log timer
   */
  timeLog(label: string): void {
    const start = this.timers.get(label);
    if (start) {
      const duration = performance.now() - start;
      this.debug(`Timer: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    }
  }

  /**
   * Start group
   */
  group(label: string): void {
    this.groups.push(label);
    this.pushContext(label);
    this.debug(`Group started: ${label}`);
  }

  /**
   * End group
   */
  groupEnd(): void {
    const label = this.groups.pop();
    if (label) {
      this.popContext();
      this.debug(`Group ended: ${label}`);
    }
  }

  /**
   * Profile function
   */
  profile<T extends (...args: any[]) => any>(fn: T, name?: string): T {
    const fnName = name || fn.name || 'anonymous';
    
    return ((...args: Parameters<T>) => {
      this.time(fnName);
      
      try {
        const result = fn(...args);
        
        if (result instanceof Promise) {
          return result.finally(() => {
            this.timeEnd(fnName);
          });
        }
        
        this.timeEnd(fnName);
        return result;
      } catch (error) {
        this.timeEnd(fnName);
        this.error(`Error in ${fnName}:`, error);
        throw error;
      }
    }) as T;
  }

  /**
   * Set metadata
   */
  setMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * Clear metadata
   */
  clearMetadata(): void {
    this.metadata = {};
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /**
   * Add transport
   */
  addTransport(transport: Transport): void {
    this.transports.push(transport);
  }

  /**
   * Remove transport
   */
  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.transports.map(t => t.flush?.())
    );
  }

  /**
   * Close all transports
   */
  async close(): Promise<void> {
    await Promise.all(
      this.transports.map(t => t.close?.())
    );
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Uncaught error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection:', event.reason);
      });
    }
    
    if (typeof process !== 'undefined') {
      process.on('uncaughtException', (error) => {
        this.fatal('Uncaught exception:', error);
      });
      
      process.on('unhandledRejection', (reason) => {
        this.error('Unhandled promise rejection:', reason);
      });
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Create logger instance
 */
export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}