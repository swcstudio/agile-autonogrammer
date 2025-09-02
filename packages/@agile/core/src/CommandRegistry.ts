import { EventEmitter } from 'eventemitter3'
import type { CommandDefinition, CommandContext, CommandResult } from '@agile/types'

export interface CommandRegistryConfig {
  enableMetrics?: boolean
  maxCommands?: number
  commandTimeout?: number
  enableValidation?: boolean
}

export interface CommandMetrics {
  name: string
  executionCount: number
  totalExecutionTime: number
  averageExecutionTime: number
  successCount: number
  failureCount: number
  lastExecuted: number
}

export interface RegisteredCommand extends CommandDefinition {
  registeredAt: number
  metrics: CommandMetrics
}

export class CommandRegistry extends EventEmitter<{
  'command:registered': [{ command: RegisteredCommand }]
  'command:overridden': [{ name: string; previousDefinition: RegisteredCommand | undefined }]
  'command:unregistered': [{ name: string; command: RegisteredCommand }]
  'command:executing': [{ name: string; args: any[]; context: CommandContext }]
  'command:executed': [{ name: string; result: CommandResult }]
  'command:failed': [{ name: string; error: any; result: CommandResult }]
  'registry:cleared': []
}> {
  private commands: Map<string, RegisteredCommand> = new Map()
  private config: CommandRegistryConfig

  constructor(config: CommandRegistryConfig = {}) {
    super()
    
    this.config = {
      enableMetrics: config.enableMetrics ?? true,
      maxCommands: config.maxCommands || 100,
      commandTimeout: config.commandTimeout || 30000,
      enableValidation: config.enableValidation ?? true
    }

    this.registerBuiltinCommands()
  }

  register(definition: CommandDefinition): void {
    if (this.commands.size >= this.config.maxCommands!) {
      throw new Error('Maximum number of commands reached')
    }

    this.validateCommandDefinition(definition)

    if (this.commands.has(definition.name)) {
      this.emit('command:overridden', { 
        name: definition.name,
        previousDefinition: this.commands.get(definition.name)
      })
    }

    const registeredCommand: RegisteredCommand = {
      ...definition,
      registeredAt: Date.now(),
      metrics: {
        name: definition.name,
        executionCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        successCount: 0,
        failureCount: 0,
        lastExecuted: 0
      }
    }

    this.commands.set(definition.name, registeredCommand)
    this.emit('command:registered', { command: registeredCommand })
  }

  getCommand(name: string): RegisteredCommand | undefined {
    return this.commands.get(name)
  }

  hasCommand(name: string): boolean {
    return this.commands.has(name)
  }

  listCommands(): RegisteredCommand[] {
    return Array.from(this.commands.values())
  }

  listCommandNames(): string[] {
    return Array.from(this.commands.keys())
  }

  unregister(name: string): boolean {
    const command = this.commands.get(name)
    if (!command) {
      return false
    }

    this.commands.delete(name)
    this.emit('command:unregistered', { name, command })
    return true
  }

  async executeCommand(
    name: string, 
    args: any[], 
    context: CommandContext
  ): Promise<CommandResult> {
    const command = this.commands.get(name)
    if (!command) {
      throw new Error(`Command not found: ${name}`)
    }

    const startTime = Date.now()
    
    // Update metrics
    if (this.config.enableMetrics) {
      command.metrics.executionCount++
      command.metrics.lastExecuted = startTime
    }

    this.emit('command:executing', { name, args, context })

    try {
      // Validate arguments if schema is provided
      if (this.config.enableValidation && command.schema) {
        this.validateCommandArgs(args, command.schema)
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(command, args, context)
      const executionTime = Date.now() - startTime

      // Update success metrics
      if (this.config.enableMetrics) {
        command.metrics.successCount++
        command.metrics.totalExecutionTime += executionTime
        command.metrics.averageExecutionTime = 
          command.metrics.totalExecutionTime / command.metrics.executionCount
      }

      const commandResult: CommandResult = {
        success: true,
        result,
        executionTime,
        command: name,
        metadata: {
          args,
          context: context.id
        }
      }

      this.emit('command:executed', { name, result: commandResult })
      return commandResult
      
    } catch (error) {
      const executionTime = Date.now() - startTime

      // Update failure metrics
      if (this.config.enableMetrics) {
        command.metrics.failureCount++
        command.metrics.totalExecutionTime += executionTime
        command.metrics.averageExecutionTime = 
          command.metrics.totalExecutionTime / command.metrics.executionCount
      }

      const commandResult: CommandResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        command: name,
        metadata: {
          args,
          context: context.id
        }
      }

      this.emit('command:failed', { name, error, result: commandResult })
      return commandResult
    }
  }

  private async executeWithTimeout(
    command: RegisteredCommand,
    args: any[],
    context: CommandContext
  ): Promise<any> {
    const timeout = command.timeout || this.config.commandTimeout!

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Command ${command.name} timed out after ${timeout}ms`))
      }, timeout)

      try {
        const result = await command.execute(args, context)
        clearTimeout(timeoutId)
        resolve(result)
      } catch (error) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  private validateCommandDefinition(definition: CommandDefinition): void {
    if (!definition.name || typeof definition.name !== 'string') {
      throw new Error('Command must have a valid name')
    }

    if (!/^[a-zA-Z][a-zA-Z0-9._-]*$/.test(definition.name)) {
      throw new Error('Command name must start with a letter and contain only letters, numbers, dots, underscores, and hyphens')
    }

    if (!definition.execute || typeof definition.execute !== 'function') {
      throw new Error('Command must have an execute function')
    }

    if (definition.timeout && (typeof definition.timeout !== 'number' || definition.timeout <= 0)) {
      throw new Error('Command timeout must be a positive number')
    }

    if (definition.schema && typeof definition.schema !== 'object') {
      throw new Error('Command schema must be an object')
    }
  }

  private validateCommandArgs(args: any[], schema: any): void {
    try {
      // Basic argument validation
      if (schema.minArgs && args.length < schema.minArgs) {
        throw new Error(`Command requires at least ${schema.minArgs} arguments`)
      }

      if (schema.maxArgs && args.length > schema.maxArgs) {
        throw new Error(`Command accepts at most ${schema.maxArgs} arguments`)
      }

      // Type validation for each argument
      if (schema.types && Array.isArray(schema.types)) {
        for (let i = 0; i < schema.types.length && i < args.length; i++) {
          const expectedType = schema.types[i]
          const actualType = typeof args[i]
          
          if (expectedType !== 'any' && actualType !== expectedType) {
            throw new Error(`Argument ${i + 1} must be of type ${expectedType}, got ${actualType}`)
          }
        }
      }

      // Custom validation function
      if (schema.validate && typeof schema.validate === 'function') {
        const validationResult = schema.validate(args)
        if (validationResult !== true) {
          throw new Error(typeof validationResult === 'string' ? validationResult : 'Invalid arguments')
        }
      }
    } catch (error) {
      throw new Error(`Argument validation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private registerBuiltinCommands(): void {
    // Register built-in utility commands
    this.register({
      name: 'help',
      description: 'Show help information for commands',
      execute: async (args: string[]) => {
        const commandName = args[0]
        
        if (commandName) {
          const command = this.getCommand(commandName)
          if (!command) {
            throw new Error(`Command not found: ${commandName}`)
          }
          
          return {
            name: command.name,
            description: command.description,
            schema: command.schema,
            examples: command.examples || []
          }
        }
        
        return {
          commands: this.listCommands().map(cmd => ({
            name: cmd.name,
            description: cmd.description
          }))
        }
      },
      schema: {
        maxArgs: 1,
        types: ['string']
      },
      examples: ['help', 'help mycommand']
    })

    this.register({
      name: 'list-commands',
      description: 'List all registered commands',
      execute: async () => {
        return {
          commands: this.listCommands().map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            registeredAt: cmd.registeredAt,
            executionCount: cmd.metrics.executionCount
          }))
        }
      }
    })

    this.register({
      name: 'command-metrics',
      description: 'Get metrics for a command',
      execute: async (args: string[]) => {
        const commandName = args[0]
        if (!commandName) {
          throw new Error('Command name is required')
        }
        
        const command = this.getCommand(commandName)
        if (!command) {
          throw new Error(`Command not found: ${commandName}`)
        }
        
        return {
          name: command.name,
          metrics: command.metrics
        }
      },
      schema: {
        minArgs: 1,
        maxArgs: 1,
        types: ['string']
      },
      examples: ['command-metrics mycommand']
    })

    this.register({
      name: 'echo',
      description: 'Echo the provided arguments',
      execute: async (args: any[]) => {
        return args.length === 1 ? args[0] : args
      },
      examples: ['echo hello', 'echo hello world']
    })

    this.register({
      name: 'noop',
      description: 'No operation - does nothing successfully',
      execute: async () => {
        return { message: 'No operation completed' }
      }
    })
  }

  getMetrics(): { [commandName: string]: CommandMetrics } {
    const metrics: { [commandName: string]: CommandMetrics } = {}
    
    for (const [name, command] of this.commands.entries()) {
      metrics[name] = { ...command.metrics }
    }
    
    return metrics
  }

  getCommandMetrics(name: string): CommandMetrics | undefined {
    const command = this.commands.get(name)
    return command ? { ...command.metrics } : undefined
  }

  getStatus() {
    const totalCommands = this.commands.size
    const recentlyUsedCommands = Array.from(this.commands.values())
      .filter(cmd => cmd.metrics.lastExecuted > Date.now() - 3600000) // Last hour
      .length

    const totalExecutions = Array.from(this.commands.values())
      .reduce((sum, cmd) => sum + cmd.metrics.executionCount, 0)

    const totalSuccesses = Array.from(this.commands.values())
      .reduce((sum, cmd) => sum + cmd.metrics.successCount, 0)

    return {
      totalCommands,
      recentlyUsedCommands,
      totalExecutions,
      totalSuccesses,
      successRate: totalExecutions > 0 ? totalSuccesses / totalExecutions : 0,
      maxCommands: this.config.maxCommands,
      isHealthy: totalCommands < this.config.maxCommands!
    }
  }

  clear(): void {
    const commandNames = Array.from(this.commands.keys())
    
    // Clear all non-builtin commands
    const builtinCommands = ['help', 'list-commands', 'command-metrics', 'echo', 'noop']
    
    for (const name of commandNames) {
      if (!builtinCommands.includes(name)) {
        this.unregister(name)
      }
    }
    
    this.emit('registry:cleared')
  }
}