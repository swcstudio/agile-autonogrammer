/**
 * Tool system type definitions
 */

import { z } from 'zod'

/**
 * Base tool interfaces
 */
export interface Tool<TInputSchema extends z.ZodSchema = z.ZodSchema, TOutput = any> {
  name: string
  description: string | (() => Promise<string>)
  inputSchema: TInputSchema
  isReadOnly(): boolean
  isConcurrencySafe(): boolean
  userFacingName(): string
  isEnabled(): Promise<boolean>
  needsPermissions?(input: z.infer<TInputSchema>): boolean
  renderToolUseMessage(input: z.infer<TInputSchema>, options: RenderOptions): string
  renderToolResultMessage(output: TOutput): React.ReactNode
  renderToolUseRejectedMessage(): React.ReactNode
  validateInput(input: z.infer<TInputSchema>): Promise<ValidationResult>
  call(input: z.infer<TInputSchema>, context: ToolExecutionContext): AsyncGenerator<ToolResult<TOutput>>
  renderResultForAssistant(data: TOutput): any
}

/**
 * Tool execution interfaces
 */
export interface ToolExecutionContext {
  readFileTimestamps: Record<string, number>
  userId?: string
  sessionId?: string
  workingDirectory: string
  permissions: PermissionSet
  abortSignal?: AbortSignal
  metadata?: Record<string, any>
}

export interface ToolResult<T = any> {
  type: 'result' | 'progress' | 'error' | 'warning' | 'info'
  data: T
  resultForAssistant?: any
  progress?: ProgressInfo
  metadata?: Record<string, any>
}

export interface ProgressInfo {
  current: number
  total: number
  message?: string
  percentage?: number
}

/**
 * Validation interfaces
 */
export interface ValidationResult {
  result: boolean
  message?: string
  meta?: Record<string, any>
}

/**
 * Permission interfaces
 */
export interface PermissionSet {
  fileSystem: FileSystemPermissions
  network: NetworkPermissions
  process: ProcessPermissions
  system: SystemPermissions
}

export interface FileSystemPermissions {
  read: string[]
  write: string[]
  execute: string[]
  delete: string[]
}

export interface NetworkPermissions {
  allowedDomains: string[]
  allowedPorts: number[]
  allowOutbound: boolean
  allowInbound: boolean
}

export interface ProcessPermissions {
  allowSpawn: boolean
  allowedCommands: string[]
  maxProcesses: number
}

export interface SystemPermissions {
  allowEnvironmentAccess: boolean
  allowSystemInfo: boolean
  allowUserInfo: boolean
}

/**
 * Render options
 */
export interface RenderOptions {
  verbose: boolean
  showTimestamps: boolean
  colorOutput: boolean
  maxWidth?: number
  format?: OutputFormat
}

export type OutputFormat = 'text' | 'json' | 'yaml' | 'table' | 'tree'

/**
 * File operation interfaces
 */
export interface FileOperationOptions {
  encoding?: BufferEncoding
  maxFileSize?: number
  timeout?: number
  backupOriginal?: boolean
  createDirectories?: boolean
}

export interface FileContent {
  filePath: string
  content: string
  numLines: number
  startLine?: number
  totalLines: number
  encoding?: string
  lastModified?: number
}

export interface FileInfo {
  path: string
  exists: boolean
  isFile: boolean
  isDirectory: boolean
  size: number
  lastModified: number
  permissions: {
    readable: boolean
    writable: boolean
    executable: boolean
  }
}

/**
 * Search and grep interfaces
 */
export interface SearchOptions {
  pattern: string
  glob?: string
  type?: string
  path?: string
  caseSensitive?: boolean
  wholeWords?: boolean
  regex?: boolean
  multiline?: boolean
  contextLines?: {
    before?: number
    after?: number
    around?: number
  }
  maxResults?: number
  includeLineNumbers?: boolean
}

export interface SearchResult {
  file: string
  line?: number
  column?: number
  match: string
  context?: {
    before: string[]
    after: string[]
  }
  metadata?: Record<string, any>
}

export interface SearchSummary {
  totalFiles: number
  totalMatches: number
  executionTime: number
  truncated: boolean
  pattern: string
  options: SearchOptions
}

/**
 * Command execution interfaces
 */
export interface CommandOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  maxBuffer?: number
  shell?: boolean | string
  input?: string
  ignoreErrors?: boolean
  capture?: 'stdout' | 'stderr' | 'both' | 'none'
}

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
  executionTime: number
  command: string
  workingDirectory: string
  timedOut: boolean
  killed: boolean
}

/**
 * Memory and state interfaces
 */
export interface MemoryEntry {
  key: string
  value: any
  type: MemoryEntryType
  timestamp: number
  ttl?: number
  tags?: string[]
  metadata?: Record<string, any>
}

export type MemoryEntryType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'binary'

export interface MemoryOptions {
  ttl?: number
  tags?: string[]
  overwrite?: boolean
  compress?: boolean
  encrypt?: boolean
}

export interface MemoryQuery {
  keys?: string[]
  tags?: string[]
  pattern?: string
  type?: MemoryEntryType
  since?: number
  limit?: number
}

/**
 * Agent interfaces
 */
export interface AgentDefinition {
  name: string
  description: string
  version: string
  author?: string
  capabilities: string[]
  tools: string[] | '*'
  model?: string
  systemPrompt: string
  parameters?: Record<string, any>
  metadata?: Record<string, any>
}

export interface AgentContext {
  agentId: string
  sessionId: string
  conversationHistory: Message[]
  memory: Record<string, any>
  tools: Tool[]
  permissions: PermissionSet
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * Model interfaces
 */
export interface ModelConfig {
  name: string
  provider: ModelProvider
  endpoint?: string
  apiKey?: string
  model: string
  parameters?: ModelParameters
  capabilities: ModelCapabilities
}

export type ModelProvider = 
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'local'
  | 'custom'

export interface ModelParameters {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stopSequences?: string[]
}

export interface ModelCapabilities {
  textGeneration: boolean
  codeGeneration: boolean
  functionCalling: boolean
  vision: boolean
  multimodal: boolean
  streaming: boolean
  maxContextLength: number
}

/**
 * Web and network interfaces
 */
export interface WebFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: string | Buffer
  timeout?: number
  followRedirects?: boolean
  maxRedirects?: number
  validateSSL?: boolean
  userAgent?: string
}

export interface WebFetchResult {
  url: string
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  redirected: boolean
  finalUrl?: string
  executionTime: number
}

/**
 * Testing interfaces
 */
export interface TestCase {
  name: string
  description?: string
  input: any
  expectedOutput: any
  expectedError?: string
  timeout?: number
  tags?: string[]
}

export interface TestResult {
  testName: string
  success: boolean
  output?: any
  error?: Error
  executionTime: number
  assertions: AssertionResult[]
}

export interface AssertionResult {
  type: AssertionType
  success: boolean
  message: string
  actual?: any
  expected?: any
}

export type AssertionType = 
  | 'equals'
  | 'deepEquals'
  | 'contains'
  | 'matches'
  | 'throws'
  | 'type'
  | 'custom'

/**
 * Security interfaces
 */
export interface SecurityPolicy {
  allowedOrigins: string[]
  maxRequestSize: number
  rateLimits: RateLimit[]
  encryptionRequired: boolean
  auditLogging: boolean
}

export interface RateLimit {
  endpoint: string
  maxRequests: number
  windowMs: number
  skipSuccessful?: boolean
}

export interface AuditEvent {
  timestamp: number
  userId?: string
  action: string
  resource: string
  success: boolean
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Configuration interfaces
 */
export interface ToolConfig {
  enabled: boolean
  permissions: Partial<PermissionSet>
  parameters?: Record<string, any>
  rateLimit?: RateLimit
  caching?: CacheConfig
  logging?: LoggingConfig
}

export interface CacheConfig {
  enabled: boolean
  ttl: number
  maxSize: number
  strategy: CacheStrategy
}

export type CacheStrategy = 'lru' | 'fifo' | 'lifo' | 'ttl'

export interface LoggingConfig {
  level: LogLevel
  format: LogFormat
  destination: LogDestination
  includeStackTrace: boolean
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogFormat = 'text' | 'json' | 'structured'
export type LogDestination = 'console' | 'file' | 'syslog' | 'remote'

/**
 * Event system interfaces
 */
export interface ToolEvent {
  type: ToolEventType
  toolName: string
  timestamp: number
  data: any
  metadata?: Record<string, any>
}

export type ToolEventType = 
  | 'execution:start'
  | 'execution:end'
  | 'execution:error'
  | 'validation:failed'
  | 'permission:denied'
  | 'cache:hit'
  | 'cache:miss'

/**
 * Plugin interfaces
 */
export interface ToolPlugin {
  name: string
  version: string
  author?: string
  description?: string
  tools: Tool[]
  dependencies?: string[]
  initialize?(config: Record<string, any>): Promise<void>
  destroy?(): Promise<void>
}

export interface PluginManager {
  loadPlugin(plugin: ToolPlugin): Promise<void>
  unloadPlugin(name: string): Promise<void>
  getPlugin(name: string): ToolPlugin | undefined
  listPlugins(): ToolPlugin[]
  isPluginLoaded(name: string): boolean
}

/**
 * Utility types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type ToolRegistry = Map<string, Tool>
export type PermissionCheck = (resource: string, action: string) => Promise<boolean>