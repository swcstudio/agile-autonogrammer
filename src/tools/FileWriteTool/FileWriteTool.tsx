import { Hunk } from 'diff'
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs'
import { Box, Text } from 'ink'
import { EOL } from 'os'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'path'
import * as React from 'react'
import { z } from 'zod'
import { FileEditToolUpdatedMessage } from '../../components/FileEditToolUpdatedMessage'
import { HighlightedCode } from '../../components/HighlightedCode'
import { StructuredDiff } from '../../components/StructuredDiff'
import { logEvent } from '../../services/statsig'
import type { Tool } from '../../Tool'
import { intersperse } from '../../utils/array'
import {
  addLineNumbers,
  detectFileEncoding,
  detectLineEndings,
  detectRepoLineEndings,
  writeTextContent,
} from '../../utils/file.js'
import { logError } from '../../utils/log'
import { getCwd } from '../../utils/state'
import { getTheme } from '../../utils/theme'
import { PROMPT } from './prompt'
import { hasWritePermission } from '../../utils/permissions/filesystem'
import { getPatch } from '../../utils/diff'
import { PROJECT_FILE } from '../../constants/product'
import { emitReminderEvent } from '../../services/systemReminder'
import { recordFileEdit } from '../../services/fileFreshness'

const MAX_LINES_TO_RENDER = 5
const MAX_LINES_TO_RENDER_FOR_ASSISTANT = 16000
const TRUNCATED_MESSAGE =
  '<response clipped><NOTE>To save on context only part of this file has been shown to you. You should retry this tool after you have searched inside the file with Grep in order to find the line numbers of what you are looking for.</NOTE>'

const inputSchema = z.strictObject({
  file_path: z
    .string()
    .describe(
      'The absolute path to the file to write (must be absolute, not relative)',
    ),
  content: z.string().describe('The content to write to the file'),
})

export const FileWriteTool = {
  name: 'Replace',
  async description() {
    return 'Write a file to the local filesystem.'
  },
  userFacingName: () => 'Write',
  async prompt() {
    return PROMPT
  },
  inputSchema,
  async isEnabled() {
    return true
  },
  isReadOnly() {
    return false
  },
  isConcurrencySafe() {
    return false // FileWriteTool modifies state/files, not safe for concurrent execution
  },
  needsPermissions({ file_path }) {
    return !hasWritePermission(file_path)
  },
  renderToolUseMessage(input, { verbose }) {
    return `file_path: ${verbose ? input.file_path : relative(getCwd(), input.file_path)}`
  },
  renderToolUseRejectedMessage({ file_path, content }, { columns, verbose }) {
    try {
      const fullFilePath = isAbsolute(file_path)
        ? file_path
        : resolve(getCwd(), file_path)
      const oldFileExists = existsSync(fullFilePath)
      const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8'
      const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : null
      const type = oldContent ? 'update' : 'create'
      const patch = getPatch({
        filePath: file_path,
        fileContents: oldContent ?? '',
        oldStr: oldContent ?? '',
        newStr: content,
      })

      return (
        <Box flexDirection="column">
          <Text>
            {'  '}⎿{' '}
            <Text color={getTheme().error}>
              User rejected {type === 'update' ? 'update' : 'write'} to{' '}
            </Text>
            <Text bold>
              {verbose ? file_path : relative(getCwd(), file_path)}
            </Text>
          </Text>
          {intersperse(
            patch.map(_ => (
              <Box flexDirection="column" paddingLeft={5} key={_.newStart}>
                <StructuredDiff patch={_} dim={true} width={columns - 12} />
              </Box>
            )),
            i => (
              <Box paddingLeft={5} key={`ellipsis-${i}`}>
                <Text color={getTheme().secondaryText}>...</Text>
              </Box>
            ),
          )}
        </Box>
      )
    } catch (e) {
      // Handle the case where while we were showing the diff, the user manually made the change.
      // TODO: Find a way to show the diff in this case
      logError(e)
      return (
        <Box flexDirection="column">
          <Text>{'  '}⎿ (No changes)</Text>
        </Box>
      )
    }
  },
  renderToolResultMessage(
    { filePath, content, structuredPatch, type },
    { verbose },
  ) {
    switch (type) {
      case 'create': {
        const contentWithFallback = content || '(No content)'
        const numLines = content.split(EOL).length

        return (
          <Box flexDirection="column">
            <Text>
              {'  '}⎿ Wrote {numLines} lines to{' '}
              <Text bold>
                {verbose ? filePath : relative(getCwd(), filePath)}
              </Text>
            </Text>
            <Box flexDirection="column" paddingLeft={5}>
              <HighlightedCode
                code={
                  verbose
                    ? contentWithFallback
                    : contentWithFallback
                        .split('\n')
                        .slice(0, MAX_LINES_TO_RENDER)
                        .filter(_ => _.trim() !== '')
                        .join('\n')
                }
                language={extname(filePath).slice(1)}
              />
              {!verbose && numLines > MAX_LINES_TO_RENDER && (
                <Text color={getTheme().secondaryText}>
                  ... (+{numLines - MAX_LINES_TO_RENDER} lines)
                </Text>
              )}
            </Box>
          </Box>
        )
      }
      case 'update':
        return (
          <FileEditToolUpdatedMessage
            filePath={filePath}
            structuredPatch={structuredPatch}
            verbose={verbose}
          />
        )
    }
  },
  async validateInput({ file_path }, { readFileTimestamps }) {
    const fullFilePath = isAbsolute(file_path)
      ? file_path
      : resolve(getCwd(), file_path)
    if (!existsSync(fullFilePath)) {
      return { result: true }
    }

    const readTimestamp = readFileTimestamps[fullFilePath]
    if (!readTimestamp) {
      return {
        result: false,
        message:
          'File has not been read yet. Read it first before writing to it.',
      }
    }

    // Check if file exists and get its last modified time
    const stats = statSync(fullFilePath)
    const lastWriteTime = stats.mtimeMs
    if (lastWriteTime > readTimestamp) {
      return {
        result: false,
        message:
          'File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.',
      }
    }

    return { result: true }
  },
  async *call({ file_path, content }, { readFileTimestamps }) {
    const fullFilePath = isAbsolute(file_path)
      ? file_path
      : resolve(getCwd(), file_path)
    const dir = dirname(fullFilePath)
    const oldFileExists = existsSync(fullFilePath)
    const enc = oldFileExists ? detectFileEncoding(fullFilePath) : 'utf-8'
    const oldContent = oldFileExists ? readFileSync(fullFilePath, enc) : null

    const endings = oldFileExists
      ? detectLineEndings(fullFilePath)
      : await detectRepoLineEndings(getCwd())

    mkdirSync(dir, { recursive: true })
    writeTextContent(fullFilePath, content, enc, endings!)

    // Record Agent edit operation for file freshness tracking
    recordFileEdit(fullFilePath, content)

    // Update read timestamp, to invalidate stale writes
    readFileTimestamps[fullFilePath] = statSync(fullFilePath).mtimeMs

    // Log when writing to CLAUDE.md
    if (fullFilePath.endsWith(`${sep}${PROJECT_FILE}`)) {
      logEvent('tengu_write_claudemd', {})
    }

    // Emit file edited event for system reminders
    emitReminderEvent('file:edited', {
      filePath: fullFilePath,
      content,
      oldContent: oldContent || '',
      timestamp: Date.now(),
      operation: oldFileExists ? 'update' : 'create',
    })

    if (oldContent) {
      const patch = getPatch({
        filePath: file_path,
        fileContents: oldContent,
        oldStr: oldContent,
        newStr: content,
      })

      const data = {
        type: 'update' as const,
        filePath: file_path,
        content,
        structuredPatch: patch,
      }
      yield {
        type: 'result',
        data,
        resultForAssistant: this.renderResultForAssistant(data),
      }
      return
    }

    const data = {
      type: 'create' as const,
      filePath: file_path,
      content,
      structuredPatch: [],
    }
    yield {
      type: 'result',
      data,
      resultForAssistant: this.renderResultForAssistant(data),
    }
  },
  renderResultForAssistant({ filePath, content, type }) {
    switch (type) {
      case 'create':
        return `File created successfully at: ${filePath}`
      case 'update':
        return `The file ${filePath} has been updated. Here's the result of running \`cat -n\` on a snippet of the edited file:
${addLineNumbers({
  content:
    content.split(/\r?\n/).length > MAX_LINES_TO_RENDER_FOR_ASSISTANT
      ? content
          .split(/\r?\n/)
          .slice(0, MAX_LINES_TO_RENDER_FOR_ASSISTANT)
          .join('\n') + TRUNCATED_MESSAGE
      : content,
  startLine: 1,
})}`
    }
  },
} satisfies Tool<
  typeof inputSchema,
  {
    type: 'create' | 'update'
    filePath: string
    content: string
    structuredPatch: Hunk[]
  }
>
