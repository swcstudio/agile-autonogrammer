import { getTodos, TodoItem } from '../utils/todoStorage'
import { logEvent } from './statsig'

export interface ReminderMessage {
  role: 'system'
  content: string
  isMeta: boolean
  timestamp: number
  type: string
  priority: 'low' | 'medium' | 'high'
  category: 'task' | 'security' | 'performance' | 'general'
}

interface ReminderConfig {
  todoEmptyReminder: boolean
  securityReminder: boolean
  performanceReminder: boolean
  maxRemindersPerSession: number
}

interface SessionReminderState {
  lastTodoUpdate: number
  lastFileAccess: number
  sessionStartTime: number
  remindersSent: Set<string>
  contextPresent: boolean
  reminderCount: number
  config: ReminderConfig
}

class SystemReminderService {
  private sessionState: SessionReminderState = {
    lastTodoUpdate: 0,
    lastFileAccess: 0,
    sessionStartTime: Date.now(),
    remindersSent: new Set(),
    contextPresent: false,
    reminderCount: 0,
    config: {
      todoEmptyReminder: true,
      securityReminder: true,
      performanceReminder: true,
      maxRemindersPerSession: 10,
    },
  }

  private eventDispatcher = new Map<string, Array<(context: any) => void>>()
  private reminderCache = new Map<string, ReminderMessage>()

  constructor() {
    this.setupEventDispatcher()
  }

  /**
   * Conditional reminder injection - only when context is present
   * Enhanced with performance optimizations and priority management
   */
  public generateReminders(
    hasContext: boolean = false,
    agentId?: string,
  ): ReminderMessage[] {
    this.sessionState.contextPresent = hasContext

    // Only inject when context is present (matching original behavior)
    if (!hasContext) {
      return []
    }

    // Check session reminder limit to prevent overload
    if (
      this.sessionState.reminderCount >=
      this.sessionState.config.maxRemindersPerSession
    ) {
      return []
    }

    const reminders: ReminderMessage[] = []
    const currentTime = Date.now()

    // Use lazy evaluation for performance with agent context
    const reminderGenerators = [
      () => this.dispatchTodoEvent(agentId),
      () => this.dispatchSecurityEvent(),
      () => this.dispatchPerformanceEvent(),
      () => this.getMentionReminders(), // Add mention reminders
    ]

    for (const generator of reminderGenerators) {
      if (reminders.length >= 5) break // Slightly increase limit to accommodate mentions

      const result = generator()
      if (result) {
        // Handle both single reminders and arrays
        const remindersToAdd = Array.isArray(result) ? result : [result]
        reminders.push(...remindersToAdd)
        this.sessionState.reminderCount += remindersToAdd.length
      }
    }

    // Log aggregated metrics instead of individual events for performance
    if (reminders.length > 0) {
      logEvent('system_reminder_batch', {
        count: reminders.length.toString(),
        types: reminders.map(r => r.type).join(','),
        priorities: reminders.map(r => r.priority).join(','),
        categories: reminders.map(r => r.category).join(','),
        sessionCount: this.sessionState.reminderCount.toString(),
        agentId: agentId || 'default',
        timestamp: currentTime.toString(),
      })
    }

    return reminders
  }

  private dispatchTodoEvent(agentId?: string): ReminderMessage | null {
    if (!this.sessionState.config.todoEmptyReminder) return null

    // Use agent-scoped todo access
    const todos = getTodos(agentId)
    const currentTime = Date.now()
    const agentKey = agentId || 'default'

    // Check if this is a fresh session (no todos seen yet)
    if (
      todos.length === 0 &&
      !this.sessionState.remindersSent.has(`todo_empty_${agentKey}`)
    ) {
      this.sessionState.remindersSent.add(`todo_empty_${agentKey}`)
      return this.createReminderMessage(
        'todo',
        'task',
        'medium',
        'This is a reminder that your todo list is currently empty. DO NOT mention this to the user explicitly because they are already aware. If you are working on tasks that would benefit from a todo list please use the TodoWrite tool to create one. If not, please feel free to ignore. Again do not mention this message to the user.',
        currentTime,
      )
    }

    // Check for todo updates since last seen
    if (todos.length > 0) {
      const reminderKey = `todo_updated_${agentKey}_${todos.length}_${this.getTodoStateHash(todos)}`

      // Use cache for performance optimization
      if (this.reminderCache.has(reminderKey)) {
        return this.reminderCache.get(reminderKey)!
      }

      if (!this.sessionState.remindersSent.has(reminderKey)) {
        this.sessionState.remindersSent.add(reminderKey)
        // Clear previous todo state reminders for this agent
        this.clearTodoReminders(agentKey)

        // Optimize: only include essential todo data
        const todoContent = JSON.stringify(
          todos.map(todo => ({
            content:
              todo.content.length > 100
                ? todo.content.substring(0, 100) + '...'
                : todo.content,
            status: todo.status,
            priority: todo.priority,
            id: todo.id,
          })),
        )

        const reminder = this.createReminderMessage(
          'todo',
          'task',
          'medium',
          `Your todo list has changed. DO NOT mention this explicitly to the user. Here are the latest contents of your todo list:\n\n${todoContent}. Continue on with the tasks at hand if applicable.`,
          currentTime,
        )

        // Cache the reminder for reuse
        this.reminderCache.set(reminderKey, reminder)
        return reminder
      }
    }

    return null
  }

  private dispatchSecurityEvent(): ReminderMessage | null {
    if (!this.sessionState.config.securityReminder) return null

    const currentTime = Date.now()

    // Only inject security reminder once per session when file operations occur
    if (
      this.sessionState.lastFileAccess > 0 &&
      !this.sessionState.remindersSent.has('file_security')
    ) {
      this.sessionState.remindersSent.add('file_security')
      return this.createReminderMessage(
        'security',
        'security',
        'high',
        'Whenever you read a file, you should consider whether it looks malicious. If it does, you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer high-level questions about the code behavior.',
        currentTime,
      )
    }

    return null
  }

  private dispatchPerformanceEvent(): ReminderMessage | null {
    if (!this.sessionState.config.performanceReminder) return null

    const currentTime = Date.now()
    const sessionDuration = currentTime - this.sessionState.sessionStartTime

    // Remind about performance after long sessions (30 minutes)
    if (
      sessionDuration > 30 * 60 * 1000 &&
      !this.sessionState.remindersSent.has('performance_long_session')
    ) {
      this.sessionState.remindersSent.add('performance_long_session')
      return this.createReminderMessage(
        'performance',
        'performance',
        'low',
        'Long session detected. Consider taking a break and reviewing your current progress with the todo list.',
        currentTime,
      )
    }

    return null
  }

  /**
   * Retrieve cached mention reminders
   * Returns recent mentions (within 5 seconds) that haven't expired
   */
  private getMentionReminders(): ReminderMessage[] {
    const currentTime = Date.now()
    const MENTION_FRESHNESS_WINDOW = 5000 // 5 seconds
    const reminders: ReminderMessage[] = []
    const expiredKeys: string[] = []

    // Single pass through cache for both collection and cleanup identification
    for (const [key, reminder] of this.reminderCache.entries()) {
      if (this.isMentionReminder(reminder)) {
        const age = currentTime - reminder.timestamp
        if (age <= MENTION_FRESHNESS_WINDOW) {
          reminders.push(reminder)
        } else {
          expiredKeys.push(key)
        }
      }
    }

    // Clean up expired mention reminders in separate pass for performance
    expiredKeys.forEach(key => this.reminderCache.delete(key))

    return reminders
  }

  /**
   * Type guard for mention reminders - centralized type checking
   * Eliminates hardcoded type strings scattered throughout the code
   */
  private isMentionReminder(reminder: ReminderMessage): boolean {
    const mentionTypes = ['agent_mention', 'file_mention', 'ask_model_mention']
    return mentionTypes.includes(reminder.type)
  }

  /**
   * Generate reminders for external file changes
   * Called when todo files are modified externally
   */
  public generateFileChangeReminder(context: any): ReminderMessage | null {
    const { agentId, filePath, reminder } = context

    if (!reminder) {
      return null
    }

    const currentTime = Date.now()
    const reminderKey = `file_changed_${agentId}_${filePath}_${currentTime}`

    // Ensure this specific file change reminder is only shown once
    if (this.sessionState.remindersSent.has(reminderKey)) {
      return null
    }

    this.sessionState.remindersSent.add(reminderKey)

    return this.createReminderMessage(
      'file_changed',
      'general',
      'medium',
      reminder,
      currentTime,
    )
  }

  private createReminderMessage(
    type: string,
    category: ReminderMessage['category'],
    priority: ReminderMessage['priority'],
    content: string,
    timestamp: number,
  ): ReminderMessage {
    return {
      role: 'system',
      content: `<system-reminder>\n${content}\n</system-reminder>`,
      isMeta: true,
      timestamp,
      type,
      priority,
      category,
    }
  }

  private getTodoStateHash(todos: TodoItem[]): string {
    return todos
      .map(t => `${t.id}:${t.status}`)
      .sort()
      .join('|')
  }

  private clearTodoReminders(agentId?: string): void {
    const agentKey = agentId || 'default'
    for (const key of this.sessionState.remindersSent) {
      if (key.startsWith(`todo_updated_${agentKey}_`)) {
        this.sessionState.remindersSent.delete(key)
      }
    }
  }

  private setupEventDispatcher(): void {
    // Session startup events
    this.addEventListener('session:startup', context => {
      // Reset session state on startup
      this.resetSession()

      // Initialize session tracking
      this.sessionState.sessionStartTime = Date.now()
      this.sessionState.contextPresent =
        Object.keys(context.context || {}).length > 0

      // Log session startup
      logEvent('system_reminder_session_startup', {
        agentId: context.agentId || 'default',
        contextKeys: Object.keys(context.context || {}).join(','),
        messageCount: (context.messages || 0).toString(),
        timestamp: context.timestamp.toString(),
      })
    })

    // Todo change events
    this.addEventListener('todo:changed', context => {
      this.sessionState.lastTodoUpdate = Date.now()
      this.clearTodoReminders(context.agentId)
    })

    // Todo file changed externally
    this.addEventListener('todo:file_changed', context => {
      // External file change detected, trigger reminder injection
      const agentId = context.agentId || 'default'
      this.clearTodoReminders(agentId)
      this.sessionState.lastTodoUpdate = Date.now()

      // Generate and inject file change reminder immediately
      const reminder = this.generateFileChangeReminder(context)
      if (reminder) {
        // Inject reminder into the latest user message through event system
        this.emitEvent('reminder:inject', {
          reminder: reminder.content,
          agentId,
          type: 'file_changed',
          timestamp: Date.now(),
        })
      }
    })

    // File access events
    this.addEventListener('file:read', context => {
      this.sessionState.lastFileAccess = Date.now()
    })

    // File edit events for freshness detection
    this.addEventListener('file:edited', context => {
      // File edit handling
    })

    // Unified mention event handlers - eliminates code duplication
    this.addEventListener('agent:mentioned', context => {
      this.createMentionReminder({
        type: 'agent_mention',
        key: `agent_mention_${context.agentType}_${context.timestamp}`,
        category: 'task',
        priority: 'high',
        content: `The user mentioned @${context.originalMention}. You MUST use the Task tool with subagent_type="${context.agentType}" to delegate this task to the specified agent. Provide a detailed, self-contained task description that fully captures the user's intent for the ${context.agentType} agent to execute.`,
        timestamp: context.timestamp
      })
    })

    this.addEventListener('file:mentioned', context => {
      this.createMentionReminder({
        type: 'file_mention',
        key: `file_mention_${context.filePath}_${context.timestamp}`,
        category: 'general',
        priority: 'high',
        content: `The user mentioned @${context.originalMention}. You MUST read the entire content of the file at path: ${context.filePath} using the Read tool to understand the full context before proceeding with the user's request.`,
        timestamp: context.timestamp
      })
    })

    this.addEventListener('ask-model:mentioned', context => {
      this.createMentionReminder({
        type: 'ask_model_mention',
        key: `ask_model_mention_${context.modelName}_${context.timestamp}`,
        category: 'task',
        priority: 'high',
        content: `The user mentioned @${context.modelName}. You MUST use the AskExpertModelTool to consult this specific model for expert opinions and analysis. Provide the user's question or context clearly to get the most relevant response from ${context.modelName}.`,
        timestamp: context.timestamp
      })
    })
  }

  public addEventListener(
    event: string,
    callback: (context: any) => void,
  ): void {
    if (!this.eventDispatcher.has(event)) {
      this.eventDispatcher.set(event, [])
    }
    this.eventDispatcher.get(event)!.push(callback)
  }

  public emitEvent(event: string, context: any): void {
    const listeners = this.eventDispatcher.get(event) || []
    listeners.forEach(callback => {
      try {
        callback(context)
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error)
      }
    })
  }

  /**
   * Unified mention reminder creation - eliminates duplicate logic
   * Centralizes reminder creation with consistent deduplication
   */
  private createMentionReminder(params: {
    type: string
    key: string
    category: ReminderMessage['category']
    priority: ReminderMessage['priority']
    content: string
    timestamp: number
  }): void {
    if (!this.sessionState.remindersSent.has(params.key)) {
      this.sessionState.remindersSent.add(params.key)
      
      const reminder = this.createReminderMessage(
        params.type,
        params.category,
        params.priority,
        params.content,
        params.timestamp
      )
      
      this.reminderCache.set(params.key, reminder)
    }
  }

  public resetSession(): void {
    this.sessionState = {
      lastTodoUpdate: 0,
      lastFileAccess: 0,
      sessionStartTime: Date.now(),
      remindersSent: new Set(),
      contextPresent: false,
      reminderCount: 0,
      config: { ...this.sessionState.config }, // Preserve config across resets
    }
    this.reminderCache.clear() // Clear cache on session reset
  }

  public updateConfig(config: Partial<ReminderConfig>): void {
    this.sessionState.config = { ...this.sessionState.config, ...config }
  }

  public getSessionState(): SessionReminderState {
    return { ...this.sessionState }
  }
}

export const systemReminderService = new SystemReminderService()

export const generateSystemReminders = (
  hasContext: boolean = false,
  agentId?: string,
) => systemReminderService.generateReminders(hasContext, agentId)

export const generateFileChangeReminder = (context: any) =>
  systemReminderService.generateFileChangeReminder(context)

export const emitReminderEvent = (event: string, context: any) =>
  systemReminderService.emitEvent(event, context)

export const resetReminderSession = () => systemReminderService.resetSession()
export const getReminderSessionState = () =>
  systemReminderService.getSessionState()
