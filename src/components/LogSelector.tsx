import React from 'react'
import { Box, Text } from 'ink'
import { Select } from './CustomSelect/select'
import type { LogOption } from '../types/logs'
import { getTheme } from '../utils/theme'
import { useTerminalSize } from '../hooks/useTerminalSize'
import { formatDate } from '../utils/log'

type LogSelectorProps = {
  logs: LogOption[]
  onSelect: (logValue: number) => void
}

export function LogSelector({
  logs,
  onSelect,
}: LogSelectorProps): React.ReactNode {
  const { rows, columns } = useTerminalSize()
  if (logs.length === 0) {
    return null
  }

  const visibleCount = rows - 3 // Account for header and footer
  const hiddenCount = Math.max(0, logs.length - visibleCount)

  // Create formatted options
  // Calculate column widths
  const indexWidth = 7 // [0] to [99] with extra spaces
  const modifiedWidth = 21 // "Yesterday at 7:49 pm" with space
  const createdWidth = 21 // "Yesterday at 7:49 pm" with space
  const countWidth = 9 // "999 msgs" (right-aligned)

  const options = logs.map((log, i) => {
    const index = `[${i}]`.padEnd(indexWidth)
    const modified = formatDate(log.modified).padEnd(modifiedWidth)
    const created = formatDate(log.created).padEnd(createdWidth)
    const msgCount = `${log.messageCount}`.padStart(countWidth)
    const prompt = log.firstPrompt
    let branchInfo = ''
    if (log.forkNumber) branchInfo += ` (fork #${log.forkNumber})`
    if (log.sidechainNumber)
      branchInfo += ` (sidechain #${log.sidechainNumber})`

    const labelTxt = `${index}${modified}${created}${msgCount} ${prompt}${branchInfo}`
    const truncated =
      labelTxt.length > columns - 2 // Account for "> " selection cursor
        ? `${labelTxt.slice(0, columns - 5)}...`
        : labelTxt
    return {
      label: truncated,
      value: log.value.toString(),
    }
  })

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Box paddingLeft={9}>
        <Text bold color={getTheme().text}>
          Modified
        </Text>
        <Text>{'             '}</Text>
        <Text bold color={getTheme().text}>
          Created
        </Text>
        <Text>{'             '}</Text>
        <Text bold color={getTheme().text}>
          # Messages
        </Text>
        <Text> </Text>
        <Text bold color={getTheme().text}>
          First message
        </Text>
      </Box>
      <Select
        options={options}
        onChange={index => onSelect(parseInt(index, 10))}
        visibleOptionCount={visibleCount}
      />
      {hiddenCount > 0 && (
        <Box paddingLeft={2}>
          <Text color={getTheme().secondaryText}>and {hiddenCount} more…</Text>
        </Box>
      )}
    </Box>
  )
}
