import { existsSync, mkdirSync, readFileSync, statSync } from 'fs'
import { Box, Text } from 'ink'
import { dirname, isAbsolute, relative, resolve, sep } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FileEditToolUpdatedMessage } from '../../components/FileEditToolUpdatedMessage'
import { StructuredDiff } from '../../components/StructuredDiff'
import { logEvent } from '../../services/statsig'
import { Tool, ValidationResult } from '../../Tool'
import { intersperse } from '../../utils/array'
import {
  addLineNumbers,
  detectFileEncoding,
  detectLineEndings,
  findSimilarFile,
  writeTextContent,
} from '../../utils/file.js'
import { logError } from '../../utils/log'
import { getCwd } from '../../utils/state'
import { getTheme } from '../../utils/theme'
import { NotebookEditTool } from '../NotebookEditTool/NotebookEditTool'
import { applyEdit } from '../FileEditTool/utils'
import { hasWritePermission } from '../../utils/permissions/filesystem'
import { PROJECT_FILE } from '../../constants/product'
import { DESCRIPTION, PROMPT } from './prompt'
import { emitReminderEvent } from '../../services/systemReminder'
import { recordFileEdit } from '../../services/fileFreshness'

const EditSchema = z.object({
  old_string: z.string().describe('The text to replace'),
  new_string: z.string().describe('The text to replace it with'),
  replace_all: z
    .boolean()
    .optional()
    .default(false)
    .describe('Replace all occurences of old_string (default false)'),
})

const inputSchema = z.strictObject({
  file_path: z.string().describe('The absolute path to the file to modify'),
  edits: z
    .array(EditSchema)
    .min(1)
    .describe('Array of edit operations to perform sequentially on the file'),
})

export type In = typeof inputSchema

// Number of lines of context to include before/after the change in our result message
const N_LINES_SNIPPET = 4

export const MultiEditTool = {
  name: 'MultiEdit',
  async description() {
    return 'A tool for making multiple edits to a single file atomically'
  },
  async prompt() {
    return PROMPT
  },
  inputSchema,
  userFacingName() {
    return 'Multi-Edit'
  },
  async isEnabled() {
    return true
  },
  isReadOnly() {
    return false
  },
  isConcurrencySafe() {
    return false // MultiEdit modifies files, not safe for concurrent execution
  },
  needsPermissions(input?: z.infer<typeof inputSchema>) {
    if (!input) return true
    return !hasWritePermission(input.file_path)
  },
  renderResultForAssistant(content) {
    return content
  },
  renderToolUseMessage(input, { verbose }) {
    const { file_path, edits } = input
    const workingDir = getCwd()
    const relativePath = isAbsolute(file_path)
      ? relative(workingDir, file_path)
      : file_path

    if (verbose) {
      const editSummary = edits
        .map(
          (edit, index) =>
            `${index + 1}. Replace "${edit.old_string.substring(0, 50)}${edit.old_string.length > 50 ? '...' : ''}" with "${edit.new_string.substring(0, 50)}${edit.new_string.length > 50 ? '...' : ''}"`,
        )
        .join('\n')
      return `Multiple edits to ${relativePath}:\n${editSummary}`
    }

    return `Making ${edits.length} edits to ${relativePath}`
  },
  renderToolUseRejectedMessage() {
    return (
      <Box>
        <Text color={getTheme().error}>⚠ Edit request rejected</Text>
      </Box>
    )
  },
  renderToolResultMessage(output) {
    if (typeof output === 'string') {
      const isError = output.includes('Error:')
      return (
        <Box flexDirection="column">
          <Text color={isError ? getTheme().error : getTheme().success}>
            {output}
          </Text>
        </Box>
      )
    }

    return <FileEditToolUpdatedMessage {...output} />
  },
  async validateInput(
    { file_path, edits }: z.infer<typeof inputSchema>,
    context?: { readFileTimestamps?: Record<string, number> },
  ): Promise<ValidationResult> {
    const workingDir = getCwd()
    const normalizedPath = isAbsolute(file_path)
      ? resolve(file_path)
      : resolve(workingDir, file_path)

    // Check if it's a notebook file
    if (normalizedPath.endsWith('.ipynb')) {
      return {
        result: false,
        errorCode: 1,
        message: `For Jupyter notebooks (.ipynb files), use the ${NotebookEditTool.name} tool instead.`,
      }
    }

    // For new files, check parent directory exists
    if (!existsSync(normalizedPath)) {
      const parentDir = dirname(normalizedPath)
      if (!existsSync(parentDir)) {
        return {
          result: false,
          errorCode: 2,
          message: `Parent directory does not exist: ${parentDir}`,
        }
      }

      // For new files, ensure first edit creates the file (empty old_string)
      if (edits.length === 0 || edits[0].old_string !== '') {
        return {
          result: false,
          errorCode: 6,
          message:
            'For new files, the first edit must have an empty old_string to create the file content.',
        }
      }
    } else {
      // For existing files, apply file protection mechanisms
      const readFileTimestamps = context?.readFileTimestamps || {}
      const readTimestamp = readFileTimestamps[normalizedPath]

      if (!readTimestamp) {
        return {
          result: false,
          errorCode: 7,
          message:
            'File has not been read yet. Read it first before editing it.',
          meta: {
            filePath: normalizedPath,
            isFilePathAbsolute: String(isAbsolute(file_path)),
          },
        }
      }

      // Check if file has been modified since last read
      const stats = statSync(normalizedPath)
      const lastWriteTime = stats.mtimeMs
      if (lastWriteTime > readTimestamp) {
        return {
          result: false,
          errorCode: 8,
          message:
            'File has been modified since read, either by the user or by a linter. Read it again before attempting to edit it.',
          meta: {
            filePath: normalizedPath,
            lastWriteTime,
            readTimestamp,
          },
        }
      }

      // Pre-validate that all old_strings exist in the file
      const encoding = detectFileEncoding(normalizedPath)
      if (encoding === 'binary') {
        return {
          result: false,
          errorCode: 9,
          message: 'Cannot edit binary files.',
        }
      }

      const currentContent = readFileSync(normalizedPath, 'utf-8')
      for (let i = 0; i < edits.length; i++) {
        const edit = edits[i]
        if (
          edit.old_string !== '' &&
          !currentContent.includes(edit.old_string)
        ) {
          return {
            result: false,
            errorCode: 10,
            message: `Edit ${i + 1}: String to replace not found in file: "${edit.old_string.substring(0, 100)}${edit.old_string.length > 100 ? '...' : ''}"`,
            meta: {
              editIndex: i + 1,
              oldString: edit.old_string.substring(0, 200),
            },
          }
        }
      }
    }

    // Validate each edit
    for (let i = 0; i < edits.length; i++) {
      const edit = edits[i]
      if (edit.old_string === edit.new_string) {
        return {
          result: false,
          errorCode: 3,
          message: `Edit ${i + 1}: old_string and new_string cannot be the same`,
        }
      }
    }

    return { result: true }
  },
  async *call({ file_path, edits }, { readFileTimestamps }) {
    const startTime = Date.now()
    const workingDir = getCwd()
    const filePath = isAbsolute(file_path)
      ? resolve(file_path)
      : resolve(workingDir, file_path)

    try {
      // Read current file content (or empty for new files)
      let currentContent = ''
      let fileExists = existsSync(filePath)

      if (fileExists) {
        const encoding = detectFileEncoding(filePath)
        if (encoding === 'binary') {
          yield {
            type: 'result',
            data: 'Error: Cannot edit binary files',
            resultForAssistant: 'Error: Cannot edit binary files',
          }
          return
        }
        currentContent = readFileSync(filePath, 'utf-8')
      } else {
        // For new files, ensure parent directory exists
        const parentDir = dirname(filePath)
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true })
        }
      }

      // Apply all edits sequentially
      let modifiedContent = currentContent
      const appliedEdits = []

      for (let i = 0; i < edits.length; i++) {
        const edit = edits[i]
        const { old_string, new_string, replace_all } = edit

        try {
          const result = applyEdit(
            modifiedContent,
            old_string,
            new_string,
            replace_all,
          )
          modifiedContent = result.newContent
          appliedEdits.push({
            editIndex: i + 1,
            success: true,
            old_string: old_string.substring(0, 100),
            new_string: new_string.substring(0, 100),
            occurrences: result.occurrences,
          })
        } catch (error) {
          // If any edit fails, abort the entire operation
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          yield {
            type: 'result',
            data: `Error in edit ${i + 1}: ${errorMessage}`,
            resultForAssistant: `Error in edit ${i + 1}: ${errorMessage}`,
          }
          return
        }
      }

      // Write the modified content
      const lineEndings = fileExists ? detectLineEndings(currentContent) : '\n'
      writeTextContent(filePath, modifiedContent, lineEndings)

      // Record Agent edit operation for file freshness tracking
      recordFileEdit(filePath, modifiedContent)

      // Update readFileTimestamps to prevent stale file warnings
      readFileTimestamps[filePath] = Date.now()

      // Emit file edited event for system reminders
      emitReminderEvent('file:edited', {
        filePath,
        edits: edits.map(e => ({
          oldString: e.old_string,
          newString: e.new_string,
        })),
        originalContent: currentContent,
        newContent: modifiedContent,
        timestamp: Date.now(),
        operation: fileExists ? 'update' : 'create',
      })

      // Generate result data
      const relativePath = relative(workingDir, filePath)
      const summary = `Successfully applied ${edits.length} edits to ${relativePath}`

      const resultData = {
        filePath: relativePath,
        wasNewFile: !fileExists,
        editsApplied: appliedEdits,
        totalEdits: edits.length,
        summary,
      }

      // Log the operation
      logEvent('multi_edit_tool_used', {
        file_path: relativePath,
        edits_count: String(edits.length),
        was_new_file: String(!fileExists),
        duration_ms: String(Date.now() - startTime),
      })

      yield {
        type: 'result',
        data: resultData,
        resultForAssistant: summary,
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred'
      const errorResult = `Error applying multi-edit: ${errorMessage}`

      logError(error)

      yield {
        type: 'result',
        data: errorResult,
        resultForAssistant: errorResult,
      }
    }
  },
} satisfies Tool<typeof inputSchema, any>
