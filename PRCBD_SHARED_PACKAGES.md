# PRCBD: Shared Packages Structure
## Product Requirements Codeblocked Document

### 🎯 Executive Summary
Define a comprehensive shared packages architecture that maximizes code reuse, ensures consistency across applications, and provides a solid foundation for the Turborepo monorepo structure supporting agile-programmers and future applications.

### 📊 Success Metrics
```typescript
interface SharedPackagesMetrics {
  reusability: {
    codeSharing: ">70% shared across apps"
    duplicationReduction: "90% less duplicate code"
    componentReuse: "95% UI component sharing"
    utilitySharing: "100% common utilities shared"
  }
  maintainability: {
    singleSourceOfTruth: "One implementation per feature"
    versionConsistency: "Synchronized versions across apps"
    updatePropagation: "<5 minutes for changes"
    testCoverage: ">90% for all packages"
  }
  performance: {
    bundleOptimization: "60% smaller bundles via sharing"
    buildCaching: "80% cache hit rate"
    treeSha king: "Zero dead code in production"
    lazyLoading: "On-demand package loading"
  }
}
```

## 🏗️ Shared Packages Architecture

### Package Hierarchy
```
packages/
├── @agile/core/                 # Core business logic
├── @agile/types/                # Shared TypeScript types
├── @agile/utils/                # Common utilities
├── @agile/config/               # Configuration management
├── @agile/ui/                   # UI component library
├── @agile/hooks/                # React hooks collection
├── @agile/state/                # State management
├── @agile/threading/            # Multithreading module
├── @agile/worker-pool/          # Worker pool system
├── @agile/auth/                 # Authentication system
├── @agile/models/               # AI model adapters
├── @agile/tools/                # Tool implementations
├── @agile/agents/               # Agent system
├── @agile/testing/              # Testing utilities
├── @agile/logger/               # Logging system
├── @agile/metrics/              # Metrics & telemetry
├── @agile/i18n/                 # Internationalization
├── @agile/theme/                # Theming system
└── @agile/cli-kit/              # CLI building blocks
```

### Core Package (@agile/core)
```typescript
// packages/@agile/core/package.json
{
  "name": "@agile/core",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./orchestrator": {
      "types": "./dist/orchestrator.d.ts",
      "import": "./dist/orchestrator.mjs",
      "require": "./dist/orchestrator.js"
    },
    "./engine": {
      "types": "./dist/engine.d.ts",
      "import": "./dist/engine.mjs",
      "require": "./dist/engine.js"
    }
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  }
}

// packages/@agile/core/src/index.ts
export { Orchestrator } from './orchestrator'
export { ExecutionEngine } from './engine'
export { Pipeline } from './pipeline'
export { Scheduler } from './scheduler'
export { Registry } from './registry'

// packages/@agile/core/src/orchestrator/index.ts
import { ThreadPool } from '@agile/worker-pool'
import { AgentManager } from '@agile/agents'
import { ToolRegistry } from '@agile/tools'
import { StateManager } from '@agile/state'

export class Orchestrator {
  private threadPool: ThreadPool
  private agentManager: AgentManager
  private toolRegistry: ToolRegistry
  private stateManager: StateManager
  
  constructor(config: OrchestratorConfig) {
    this.threadPool = new ThreadPool(config.threading)
    this.agentManager = new AgentManager(config.agents)
    this.toolRegistry = new ToolRegistry(config.tools)
    this.stateManager = new StateManager(config.state)
  }
  
  async execute(command: Command): Promise<CommandResult> {
    // Validate command
    const validation = await this.validateCommand(command)
    if (!validation.valid) {
      throw new ValidationError(validation.errors)
    }
    
    // Create execution context
    const context = this.createContext(command)
    
    // Execute through pipeline
    const pipeline = this.buildPipeline(command)
    const result = await pipeline.execute(context)
    
    // Update state
    await this.stateManager.update(result)
    
    return result
  }
  
  private buildPipeline(command: Command): Pipeline {
    return new Pipeline()
      .use(this.parseStage())
      .use(this.planStage())
      .use(this.executeStage())
      .use(this.validateStage())
      .use(this.persistStage())
  }
}
```

### Types Package (@agile/types)
```typescript
// packages/@agile/types/src/index.ts

// Command Types
export interface Command {
  id: string
  type: CommandType
  payload: any
  metadata: CommandMetadata
  context: ExecutionContext
}

export enum CommandType {
  FILE = 'file',
  SHELL = 'shell',
  AI = 'ai',
  TOOL = 'tool',
  AGENT = 'agent'
}

// Model Types
export interface Model {
  id: string
  provider: Provider
  name: string
  capabilities: ModelCapabilities
  config: ModelConfig
}

export interface ModelCapabilities {
  streaming: boolean
  functionCalling: boolean
  vision: boolean
  audio: boolean
  maxTokens: number
  contextWindow: number
}

// Tool Types
export interface Tool<T = any, R = any> {
  name: string
  description: string
  schema: ToolSchema
  permissions: ToolPermissions
  execute: (params: T) => Promise<R>
}

// Agent Types
export interface Agent {
  id: string
  name: string
  description: string
  capabilities: string[]
  tools: string[]
  model?: string
  prompt: string
}

// Worker Types
export interface WorkerTask<T = any> {
  id: string
  type: TaskType
  priority: number
  payload: T
  timeout?: number
  retries?: number
}

// State Types
export interface AppState {
  theme: Theme
  models: Model[]
  activeModel: Model | null
  sessions: Session[]
  settings: Settings
}

// Shared Enums
export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}
```

### Utils Package (@agile/utils)
```typescript
// packages/@agile/utils/src/index.ts

// String utilities
export const string = {
  capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
  camelCase: (str: string) => str.replace(/-([a-z])/g, g => g[1].toUpperCase()),
  kebabCase: (str: string) => str.replace(/([A-Z])/g, '-$1').toLowerCase(),
  truncate: (str: string, length: number) => 
    str.length > length ? `${str.slice(0, length)}...` : str
}

// Array utilities
export const array = {
  chunk: <T>(arr: T[], size: number): T[][] => {
    return arr.reduce((chunks, item, index) => {
      const chunkIndex = Math.floor(index / size)
      if (!chunks[chunkIndex]) chunks[chunkIndex] = []
      chunks[chunkIndex].push(item)
      return chunks
    }, [] as T[][])
  },
  
  unique: <T>(arr: T[]): T[] => [...new Set(arr)],
  
  shuffle: <T>(arr: T[]): T[] => {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}

// Async utilities
export const async = {
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  retry: async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const { maxAttempts = 3, delay = 1000, backoff = 2 } = options
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        if (attempt === maxAttempts) throw error
        await async.sleep(delay * Math.pow(backoff, attempt - 1))
      }
    }
    throw new Error('Retry failed')
  },
  
  timeout: <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), ms)
      )
    ])
  }
}

// File system utilities
export const fs = {
  exists: async (path: string): Promise<boolean> => {
    try {
      await fsp.access(path)
      return true
    } catch {
      return false
    }
  },
  
  ensureDir: async (path: string): Promise<void> => {
    await fsp.mkdir(path, { recursive: true })
  },
  
  readJSON: async <T>(path: string): Promise<T> => {
    const content = await fsp.readFile(path, 'utf-8')
    return JSON.parse(content)
  },
  
  writeJSON: async (path: string, data: any): Promise<void> => {
    await fsp.writeFile(path, JSON.stringify(data, null, 2))
  }
}
```

### UI Package (@agile/ui)
```typescript
// packages/@agile/ui/src/components/index.ts
export { Box } from './Box'
export { Text } from './Text'
export { Input } from './Input'
export { Button } from './Button'
export { Spinner } from './Spinner'
export { Progress } from './Progress'
export { Table } from './Table'
export { List } from './List'
export { Modal } from './Modal'
export { Tabs } from './Tabs'

// packages/@agile/ui/src/components/Box.tsx
import React from 'react'
import { Box as InkBox, BoxProps as InkBoxProps } from 'ink'
import { useTheme } from '@agile/theme'

export interface BoxProps extends InkBoxProps {
  variant?: 'default' | 'bordered' | 'rounded' | 'shadow'
  bg?: string
  p?: number
  m?: number
}

export const Box: React.FC<BoxProps> = ({
  variant = 'default',
  bg,
  p,
  m,
  children,
  ...props
}) => {
  const theme = useTheme()
  
  const styles = {
    backgroundColor: bg || theme.colors.background,
    padding: p,
    margin: m,
    borderStyle: variant === 'bordered' ? 'single' : 
                 variant === 'rounded' ? 'round' : undefined,
    ...props
  }
  
  return <InkBox {...styles}>{children}</InkBox>
}

// packages/@agile/ui/src/components/CommandInput.tsx
import React, { useState, useCallback } from 'react'
import TextInput from 'ink-text-input'
import { Box } from './Box'
import { Text } from './Text'
import { useCommand } from '@agile/hooks'

export interface CommandInputProps {
  onSubmit: (command: string) => void
  placeholder?: string
  prefix?: string
}

export const CommandInput: React.FC<CommandInputProps> = ({
  onSubmit,
  placeholder = 'Enter command...',
  prefix = '>'
}) => {
  const { command, setCommand, history, navigateHistory } = useCommand()
  
  const handleSubmit = useCallback((value: string) => {
    onSubmit(value)
    setCommand('')
  }, [onSubmit, setCommand])
  
  return (
    <Box flexDirection="row">
      <Text color="cyan" bold>{prefix} </Text>
      <TextInput
        value={command}
        onChange={setCommand}
        onSubmit={handleSubmit}
        placeholder={placeholder}
      />
    </Box>
  )
}
```

### Hooks Package (@agile/hooks)
```typescript
// packages/@agile/hooks/src/index.ts
export { useAsync } from './useAsync'
export { useDebounce } from './useDebounce'
export { useThrottle } from './useThrottle'
export { useLocalStorage } from './useLocalStorage'
export { useKeyPress } from './useKeyPress'
export { useWorker } from './useWorker'
export { useModel } from './useModel'
export { useAgent } from './useAgent'

// packages/@agile/hooks/src/useWorker.ts
import { useEffect, useRef, useState } from 'react'
import { ThreadPool } from '@agile/worker-pool'

export function useWorker<T, R>(
  task: (data: T) => R,
  deps: any[] = []
) {
  const [result, setResult] = useState<R | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const poolRef = useRef<ThreadPool>()
  
  useEffect(() => {
    if (!poolRef.current) {
      poolRef.current = new ThreadPool({ size: 4 })
    }
    
    return () => {
      poolRef.current?.terminate()
    }
  }, [])
  
  const execute = useCallback(async (data: T) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await poolRef.current!.execute({
        id: `task-${Date.now()}`,
        type: 'compute',
        priority: 5,
        payload: { fn: task.toString(), data }
      })
      
      setResult(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, deps)
  
  return { execute, result, error, loading }
}

// packages/@agile/hooks/src/useModel.ts
import { useState, useCallback } from 'react'
import { ModelManager } from '@agile/models'

export function useModel(modelId?: string) {
  const [model, setModel] = useState(() => 
    ModelManager.getInstance().getModel(modelId)
  )
  const [streaming, setStreaming] = useState(false)
  
  const complete = useCallback(async (
    prompt: string,
    options?: CompletionOptions
  ) => {
    setStreaming(true)
    
    try {
      const response = await model.complete(prompt, {
        ...options,
        stream: true,
        onToken: (token) => {
          // Handle streaming tokens
        }
      })
      
      return response
    } finally {
      setStreaming(false)
    }
  }, [model])
  
  const switchModel = useCallback((newModelId: string) => {
    const newModel = ModelManager.getInstance().getModel(newModelId)
    setModel(newModel)
  }, [])
  
  return {
    model,
    complete,
    switchModel,
    streaming
  }
}
```

### Testing Package (@agile/testing)
```typescript
// packages/@agile/testing/src/index.ts
import { render as inkRender } from 'ink-testing-library'
import { vi } from 'vitest'

export { inkRender as render }
export { vi as mock }

// Test utilities
export const createMockModel = (overrides = {}) => ({
  id: 'test-model',
  name: 'Test Model',
  complete: vi.fn(),
  stream: vi.fn(),
  ...overrides
})

export const createMockWorker = (overrides = {}) => ({
  id: 'test-worker',
  execute: vi.fn(),
  terminate: vi.fn(),
  ...overrides
})

export const createMockAgent = (overrides = {}) => ({
  id: 'test-agent',
  name: 'Test Agent',
  execute: vi.fn(),
  ...overrides
})

// Test helpers
export const waitForAsync = (ms: number = 100) => 
  new Promise(resolve => setTimeout(resolve, ms))

export const mockFileSystem = () => {
  const files = new Map<string, string>()
  
  return {
    readFile: vi.fn((path: string) => {
      if (!files.has(path)) {
        throw new Error(`File not found: ${path}`)
      }
      return Promise.resolve(files.get(path))
    }),
    writeFile: vi.fn((path: string, content: string) => {
      files.set(path, content)
      return Promise.resolve()
    }),
    exists: vi.fn((path: string) => 
      Promise.resolve(files.has(path))
    ),
    files
  }
}
```

### Configuration Package (@agile/config)
```typescript
// packages/@agile/config/src/index.ts
import { z } from 'zod'

// Configuration schema
export const ConfigSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.enum(['development', 'staging', 'production'])
  }),
  features: z.object({
    threading: z.boolean().default(true),
    telemetry: z.boolean().default(true),
    experimental: z.boolean().default(false)
  }),
  performance: z.object({
    maxWorkers: z.number().default(8),
    cacheSize: z.number().default(1000),
    timeout: z.number().default(30000)
  }),
  models: z.array(z.object({
    id: z.string(),
    provider: z.string(),
    apiKey: z.string().optional(),
    endpoint: z.string().optional()
  }))
})

export type Config = z.infer<typeof ConfigSchema>

// Configuration manager
export class ConfigManager {
  private static instance: ConfigManager
  private config: Config
  
  static getInstance(): ConfigManager {
    if (!this.instance) {
      this.instance = new ConfigManager()
    }
    return this.instance
  }
  
  load(sources: ConfigSource[]): void {
    // Load from multiple sources in order
    let merged = {}
    
    for (const source of sources) {
      const data = source.load()
      merged = this.deepMerge(merged, data)
    }
    
    // Validate merged config
    this.config = ConfigSchema.parse(merged)
  }
  
  get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key]
  }
  
  set<K extends keyof Config>(key: K, value: Config[K]): void {
    this.config[key] = value
    this.emit('config:changed', { key, value })
  }
}
```

### Build Configuration
```javascript
// packages/tsup-config/index.js
export const defaultConfig = {
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'react',
    'ink',
    'worker_threads',
    'fs',
    'path',
    'os'
  ]
}

// packages/eslint-config/index.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/prop-types': 'off'
  }
}

// packages/vitest-config/index.js
export const defaultConfig = {
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', 'dist']
    }
  }
}
```

## 📦 Package Publishing

### Changesets Configuration
```json
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [
    ["@agile/*"]
  ],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### Version Management
```bash
# Add changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish packages
pnpm changeset publish
```

## 🎯 Expected Outcomes

1. **Code Reusability**: Maximum sharing across all applications
2. **Consistency**: Unified implementations and interfaces
3. **Maintainability**: Single source of truth for each feature
4. **Performance**: Optimized bundle sizes through sharing
5. **Developer Experience**: Clear package boundaries and APIs

This PRCBD provides a complete blueprint for structuring shared packages that will serve as the foundation for all applications in the agile-programmers ecosystem.