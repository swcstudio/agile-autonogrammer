import { EventEmitter } from 'eventemitter3'
import { nanoid } from 'nanoid'
import type { 
  Pipeline, 
  PipelineStage, 
  PipelineResult,
  PipelineExecutionContext,
  KatalystThreadPool
} from '@agile/types'

export interface PipelineManagerConfig {
  maxConcurrentPipelines?: number
  stageTimeout?: number
  enableMetrics?: boolean
}

export interface PipelineExecutionOptions {
  context: any
  threadPool: KatalystThreadPool
  onStageComplete?: (stage: PipelineStage, result: any) => void
  onStageError?: (stage: PipelineStage, error: Error) => void
}

export class PipelineManager extends EventEmitter<{
  'pipeline:created': [{ pipeline: Pipeline }]
  'pipeline:stage:added': [{ pipelineId: string; stage: PipelineStage }]
  'pipeline:execution:started': [{ pipeline: Pipeline; executionId: string }]
  'pipeline:execution:completed': [{ pipeline: Pipeline; executionId: string; result: PipelineResult }]
  'pipeline:execution:failed': [{ pipeline: Pipeline; executionId: string; error: any }]
  'pipeline:stage:completed': [{ stage: PipelineStage; result: any }]
  'pipeline:stage:failed': [{ stage: PipelineStage; error: any }]
  'pipeline:deleted': [{ pipelineId: string }]
}> {
  private pipelines: Map<string, Pipeline> = new Map()
  private activePipelines: Map<string, PipelineExecutionContext> = new Map()
  private config: PipelineManagerConfig

  constructor(config: PipelineManagerConfig = {}) {
    super()
    this.config = {
      maxConcurrentPipelines: config.maxConcurrentPipelines || 5,
      stageTimeout: config.stageTimeout || 30000,
      enableMetrics: config.enableMetrics ?? true
    }
  }

  createPipeline(id: string): Pipeline {
    const pipeline: Pipeline = {
      id,
      name: `Pipeline-${id}`,
      description: '',
      stages: [],
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      }
    }

    this.pipelines.set(id, pipeline)
    this.emit('pipeline:created', { pipeline })
    return pipeline
  }

  addStage(pipelineId: string, stage: Omit<PipelineStage, 'id'>): PipelineStage {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`)
    }

    const pipelineStage: PipelineStage = {
      ...stage,
      id: nanoid()
    }

    pipeline.stages.push(pipelineStage)
    this.emit('pipeline:stage:added', { pipelineId, stage: pipelineStage })
    return pipelineStage
  }

  async execute(
    pipeline: Pipeline, 
    options: PipelineExecutionOptions
  ): Promise<PipelineResult> {
    const executionId = nanoid()
    const startTime = Date.now()

    if (this.activePipelines.size >= this.config.maxConcurrentPipelines!) {
      throw new Error('Maximum concurrent pipelines reached')
    }

    const executionContext: PipelineExecutionContext = {
      id: executionId,
      pipelineId: pipeline.id,
      status: 'running',
      startTime,
      currentStageIndex: 0,
      stageResults: [],
      metadata: {}
    }

    this.activePipelines.set(executionId, executionContext)
    this.emit('pipeline:execution:started', { pipeline, executionId })

    try {
      const result = await this.executeStages(pipeline, executionContext, options)
      this.emit('pipeline:execution:completed', { pipeline, executionId, result })
      return result
    } catch (error) {
      const failedResult: PipelineResult = {
        pipelineId: pipeline.id,
        executionId,
        success: false,
        executionTime: Date.now() - startTime,
        stagesCompleted: executionContext.currentStageIndex,
        stagesFailed: 1,
        totalStages: pipeline.stages.length,
        error: error instanceof Error ? error.message : String(error),
        stageResults: executionContext.stageResults
      }

      this.emit('pipeline:execution:failed', { pipeline, executionId, error })
      return failedResult
    } finally {
      this.activePipelines.delete(executionId)
    }
  }

  private async executeStages(
    pipeline: Pipeline,
    context: PipelineExecutionContext,
    options: PipelineExecutionOptions
  ): Promise<PipelineResult> {
    const { stages } = pipeline
    let stagesCompleted = 0
    let stagesFailed = 0

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]
      context.currentStageIndex = i

      try {
        const stageResult = await this.executeStage(stage, context, options)
        
        context.stageResults.push({
          stageId: stage.id,
          success: true,
          result: stageResult,
          executionTime: stageResult.executionTime || 0
        })

        stagesCompleted++
        options.onStageComplete?.(stage, stageResult)
        this.emit('pipeline:stage:completed', { stage, result: stageResult })

        // Handle conditional execution
        if (stage.condition && !this.evaluateCondition(stage.condition, stageResult)) {
          break
        }

      } catch (error) {
        const stageError = {
          stageId: stage.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: 0
        }

        context.stageResults.push(stageError)
        stagesFailed++

        options.onStageError?.(stage, error instanceof Error ? error : new Error(String(error)))
        this.emit('pipeline:stage:failed', { stage, error })

        // Handle error strategy
        if (stage.errorStrategy === 'fail-fast') {
          throw error
        } else if (stage.errorStrategy === 'skip') {
          continue
        }
      }
    }

    const executionTime = Date.now() - context.startTime
    const success = stagesFailed === 0

    return {
      pipelineId: pipeline.id,
      executionId: context.id,
      success,
      executionTime,
      stagesCompleted,
      stagesFailed,
      totalStages: stages.length,
      stageResults: context.stageResults
    }
  }

  private async executeStage(
    stage: PipelineStage,
    context: PipelineExecutionContext,
    options: PipelineExecutionOptions
  ): Promise<any> {
    const timeout = stage.timeout || this.config.stageTimeout!
    const startTime = Date.now()

    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Stage ${stage.name} timed out after ${timeout}ms`))
      }, timeout)

      try {
        let result: any

        switch (stage.type) {
          case 'command':
            result = await this.executeCommandStage(stage, options)
            break
          case 'parallel':
            result = await this.executeParallelStage(stage, options)
            break
          case 'condition':
            result = await this.executeConditionStage(stage, options)
            break
          default:
            result = await this.executeGenericStage(stage, options)
        }

        clearTimeout(timeoutId)
        resolve({
          ...result,
          executionTime: Date.now() - startTime
        })
      } catch (error) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  private async executeCommandStage(stage: PipelineStage, options: PipelineExecutionOptions): Promise<any> {
    // Execute command-type stages using the thread pool
    const task = {
      id: nanoid(),
      type: 'command' as const,
      payload: stage.config,
      priority: stage.priority || 5,
      timeout: stage.timeout
    }

    return await options.threadPool.execute(task)
  }

  private async executeParallelStage(stage: PipelineStage, options: PipelineExecutionOptions): Promise<any> {
    // Execute parallel sub-stages
    const parallelTasks = stage.config.tasks || []
    
    const taskPromises = parallelTasks.map((taskConfig: any) => 
      options.threadPool.execute({
        id: nanoid(),
        type: 'generic',
        payload: taskConfig,
        priority: stage.priority || 5
      })
    )

    const results = await Promise.allSettled(taskPromises)
    
    return {
      results: results.map(result => 
        result.status === 'fulfilled' ? result.value : { error: result.reason }
      ),
      totalTasks: parallelTasks.length,
      successfulTasks: results.filter(r => r.status === 'fulfilled').length
    }
  }

  private async executeConditionStage(stage: PipelineStage, options: PipelineExecutionOptions): Promise<any> {
    // Evaluate condition and execute appropriate branch
    const condition = stage.config.condition
    const conditionResult = this.evaluateCondition(condition, options.context)
    
    if (conditionResult && stage.config.onTrue) {
      return await this.executeGenericStage({ ...stage, config: stage.config.onTrue }, options)
    } else if (!conditionResult && stage.config.onFalse) {
      return await this.executeGenericStage({ ...stage, config: stage.config.onFalse }, options)
    }
    
    return { conditionResult, executed: false }
  }

  private async executeGenericStage(stage: PipelineStage, options: PipelineExecutionOptions): Promise<any> {
    // Generic stage execution
    const task = {
      id: nanoid(),
      type: 'generic' as const,
      payload: {
        stage: stage.name,
        config: stage.config,
        context: options.context
      },
      priority: stage.priority || 5,
      timeout: stage.timeout
    }

    return await options.threadPool.execute(task)
  }

  private evaluateCondition(condition: any, context: any): boolean {
    if (typeof condition === 'boolean') {
      return condition
    }

    if (typeof condition === 'string') {
      // Simple string conditions
      try {
        // Safety: Only allow basic property access
        const sanitizedCondition = condition.replace(/[^a-zA-Z0-9._\s><=!&|()]/g, '')
        return new Function('context', `return ${sanitizedCondition}`)(context)
      } catch {
        return false
      }
    }

    if (typeof condition === 'object' && condition !== null) {
      // Object-based conditions
      const { field, operator, value } = condition
      const fieldValue = this.getNestedValue(context, field)
      
      switch (operator) {
        case '===': return fieldValue === value
        case '!==': return fieldValue !== value
        case '>': return fieldValue > value
        case '<': return fieldValue < value
        case '>=': return fieldValue >= value
        case '<=': return fieldValue <= value
        case 'contains': return String(fieldValue).includes(String(value))
        case 'startsWith': return String(fieldValue).startsWith(String(value))
        case 'endsWith': return String(fieldValue).endsWith(String(value))
        default: return false
      }
    }

    return false
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  getPipeline(id: string): Pipeline | undefined {
    return this.pipelines.get(id)
  }

  listPipelines(): Pipeline[] {
    return Array.from(this.pipelines.values())
  }

  getActivePipelines(): PipelineExecutionContext[] {
    return Array.from(this.activePipelines.values())
  }

  deletePipeline(id: string): boolean {
    const deleted = this.pipelines.delete(id)
    if (deleted) {
      this.emit('pipeline:deleted', { pipelineId: id })
    }
    return deleted
  }

  getStatus() {
    return {
      totalPipelines: this.pipelines.size,
      activePipelines: this.activePipelines.size,
      maxConcurrent: this.config.maxConcurrentPipelines,
      isHealthy: this.activePipelines.size < this.config.maxConcurrentPipelines!
    }
  }
}