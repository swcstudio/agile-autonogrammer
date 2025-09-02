import { ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import type { Tool } from '../Tool'

export interface ToolExecutionGroup {
  concurrent: ToolUseBlock[]
  sequential: ToolUseBlock[]
}

/**
 * Tool Execution Controller
 * Manages tool execution based on concurrency safety and dependencies
 */
export class ToolExecutionController {
  private tools: Tool[]

  constructor(tools: Tool[]) {
    this.tools = tools
  }

  /**
   * Group tools into concurrent and sequential execution groups
   */
  groupToolsForExecution(
    toolUseMessages: ToolUseBlock[],
  ): ToolExecutionGroup[] {
    const groups: ToolExecutionGroup[] = []
    let currentGroup: ToolExecutionGroup = { concurrent: [], sequential: [] }

    for (const toolUse of toolUseMessages) {
      const tool = this.findTool(toolUse.name)

      if (!tool) {
        // Unknown tool, execute sequentially for safety
        this.flushCurrentGroup(groups, currentGroup)
        currentGroup = { concurrent: [], sequential: [toolUse] }
        continue
      }

      if (tool.isConcurrencySafe()) {
        // Safe for concurrent execution
        currentGroup.concurrent.push(toolUse)
      } else {
        // Must be executed sequentially
        this.flushCurrentGroup(groups, currentGroup)
        currentGroup = { concurrent: [], sequential: [toolUse] }
      }
    }

    // Flush the last group
    this.flushCurrentGroup(groups, currentGroup)

    return groups.filter(
      group => group.concurrent.length > 0 || group.sequential.length > 0,
    )
  }

  /**
   * Check if all tools in a list can be executed concurrently
   */
  canExecuteConcurrently(toolUseMessages: ToolUseBlock[]): boolean {
    return toolUseMessages.every(msg => {
      const tool = this.findTool(msg.name)
      return tool?.isConcurrencySafe() ?? false
    })
  }

  /**
   * Get tool concurrency safety status
   */
  getToolConcurrencyInfo(toolName: string): {
    found: boolean
    isConcurrencySafe: boolean
    isReadOnly: boolean
  } {
    const tool = this.findTool(toolName)

    if (!tool) {
      return { found: false, isConcurrencySafe: false, isReadOnly: false }
    }

    return {
      found: true,
      isConcurrencySafe: tool.isConcurrencySafe(),
      isReadOnly: tool.isReadOnly(),
    }
  }

  /**
   * Analyze tool execution plan and provide recommendations
   */
  analyzeExecutionPlan(toolUseMessages: ToolUseBlock[]): {
    canOptimize: boolean
    concurrentCount: number
    sequentialCount: number
    groups: ToolExecutionGroup[]
    recommendations: string[]
  } {
    const groups = this.groupToolsForExecution(toolUseMessages)
    const concurrentCount = groups.reduce(
      (sum, g) => sum + g.concurrent.length,
      0,
    )
    const sequentialCount = groups.reduce(
      (sum, g) => sum + g.sequential.length,
      0,
    )

    const recommendations: string[] = []

    if (concurrentCount > 1) {
      recommendations.push(
        `${concurrentCount} tools can run concurrently for better performance`,
      )
    }

    if (sequentialCount > 1) {
      recommendations.push(
        `${sequentialCount} tools must run sequentially for safety`,
      )
    }

    if (groups.length > 1) {
      recommendations.push(
        `Execution will be divided into ${groups.length} groups`,
      )
    }

    return {
      canOptimize: concurrentCount > 1,
      concurrentCount,
      sequentialCount,
      groups,
      recommendations,
    }
  }

  private findTool(name: string): Tool | undefined {
    return this.tools.find(t => t.name === name)
  }

  private flushCurrentGroup(
    groups: ToolExecutionGroup[],
    currentGroup: ToolExecutionGroup,
  ): void {
    if (
      currentGroup.concurrent.length > 0 ||
      currentGroup.sequential.length > 0
    ) {
      groups.push({ ...currentGroup })
      currentGroup.concurrent = []
      currentGroup.sequential = []
    }
  }
}

/**
 * Create a tool execution controller for the given tools
 */
export function createToolExecutionController(
  tools: Tool[],
): ToolExecutionController {
  return new ToolExecutionController(tools)
}
