export interface LoggerConfig {
  namespace?: string
  level?: LogLevel
  enableColors?: boolean
  enableTimestamp?: boolean
  outputFunction?: (message: string) => void
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: number
  namespace?: string
}

export class Logger {
  private config: Required<LoggerConfig>
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  }

  private colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m'  // Red
  }

  private reset = '\x1b[0m'

  constructor(config: LoggerConfig = {}) {
    this.config = {
      namespace: config.namespace || 'Logger',
      level: config.level || 'info',
      enableColors: config.enableColors ?? true,
      enableTimestamp: config.enableTimestamp ?? true,
      outputFunction: config.outputFunction || console.log
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data)
  }

  info(message: string, data?: any): void {
    this.log('info', message, data)
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data)
  }

  error(message: string, data?: any): void {
    this.log('error', message, data)
  }

  log(level: LogLevel, message: string, data?: any): void {
    if (this.logLevels[level] < this.logLevels[this.config.level]) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      namespace: this.config.namespace
    }

    const formattedMessage = this.formatMessage(entry)
    this.config.outputFunction(formattedMessage)
  }

  private formatMessage(entry: LogEntry): string {
    let message = ''

    // Add timestamp
    if (this.config.enableTimestamp) {
      const timestamp = new Date(entry.timestamp).toISOString()
      message += `[${timestamp}] `
    }

    // Add level with colors
    const levelText = entry.level.toUpperCase().padEnd(5)
    if (this.config.enableColors) {
      message += `${this.colors[entry.level]}${levelText}${this.reset} `
    } else {
      message += `${levelText} `
    }

    // Add namespace
    if (entry.namespace) {
      if (this.config.enableColors) {
        message += `\x1b[90m[${entry.namespace}]\x1b[0m `
      } else {
        message += `[${entry.namespace}] `
      }
    }

    // Add message
    message += entry.message

    // Add data if present
    if (entry.data !== undefined) {
      if (typeof entry.data === 'object') {
        message += ` ${JSON.stringify(entry.data, null, 2)}`
      } else {
        message += ` ${entry.data}`
      }
    }

    return message
  }

  child(namespace: string): Logger {
    const childNamespace = this.config.namespace 
      ? `${this.config.namespace}:${namespace}`
      : namespace

    return new Logger({
      ...this.config,
      namespace: childNamespace
    })
  }

  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  getLevel(): LogLevel {
    return this.config.level
  }

  isLevelEnabled(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.config.level]
  }
}