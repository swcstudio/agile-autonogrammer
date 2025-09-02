import { Box, Text, useInput } from 'ink'
import * as React from 'react'
import { useMemo, useState, useEffect } from 'react'
import figures from 'figures'
import { getTheme } from '../utils/theme'
import { Message as MessageComponent } from './Message'
import { randomUUID } from 'crypto'
import { type Tool } from '../Tool'
import {
  createUserMessage,
  isEmptyMessageText,
  isNotEmptyMessage,
  normalizeMessages,
} from '../utils/messages.js'
import { logEvent } from '../services/statsig'
import type { AssistantMessage, UserMessage } from '../query'
import { useExitOnCtrlCD } from '../hooks/useExitOnCtrlCD'

type Props = {
  erroredToolUseIDs: Set<string>
  messages: (UserMessage | AssistantMessage)[]
  onSelect: (message: UserMessage) => void
  onEscape: () => void
  tools: Tool[]
  unresolvedToolUseIDs: Set<string>
}

const MAX_VISIBLE_MESSAGES = 7

export function MessageSelector({
  erroredToolUseIDs,
  messages,
  onSelect,
  onEscape,
  tools,
  unresolvedToolUseIDs,
}: Props): React.ReactNode {
  const currentUUID = useMemo(randomUUID, [])

  // Log when selector is opened
  useEffect(() => {
    logEvent('tengu_message_selector_opened', {})
  }, [])

  function handleSelect(message: UserMessage) {
    const indexFromEnd = messages.length - 1 - messages.indexOf(message)
    logEvent('tengu_message_selector_selected', {
      index_from_end: indexFromEnd.toString(),
      message_type: message.type,
      is_current_prompt: (message.uuid === currentUUID).toString(),
    })
    onSelect(message)
  }

  function handleEscape() {
    logEvent('tengu_message_selector_cancelled', {})
    onEscape()
  }

  // Add current prompt as a virtual message
  const allItems = useMemo(
    () => [
      // Filter out tool results
      ...messages
        .filter(
          _ =>
            !(
              _.type === 'user' &&
              Array.isArray(_.message.content) &&
              _.message.content[0]?.type === 'tool_result'
            ),
        )
        // Filter out assistant messages, until we have a way to kick off the tool use loop from REPL
        .filter(_ => _.type !== 'assistant'),
      { ...createUserMessage(''), uuid: currentUUID } as UserMessage,
    ],
    [messages, currentUUID],
  )
  const [selectedIndex, setSelectedIndex] = useState(allItems.length - 1)

  const exitState = useExitOnCtrlCD(() => process.exit(0))

  useInput((input, key) => {
    if (key.tab || key.escape) {
      handleEscape()
      return
    }
    if (key.return) {
      handleSelect(allItems[selectedIndex]!)
      return
    }
    if (key.upArrow) {
      if (key.ctrl || key.shift || key.meta) {
        // Jump to top with any modifier key
        setSelectedIndex(0)
      } else {
        setSelectedIndex(prev => Math.max(0, prev - 1))
      }
    }
    if (key.downArrow) {
      if (key.ctrl || key.shift || key.meta) {
        // Jump to bottom with any modifier key
        setSelectedIndex(allItems.length - 1)
      } else {
        setSelectedIndex(prev => Math.min(allItems.length - 1, prev + 1))
      }
    }

    // Handle number keys (1-9)
    const num = Number(input)
    if (!isNaN(num) && num >= 1 && num <= Math.min(9, allItems.length)) {
      if (!allItems[num - 1]) {
        return
      }
      handleSelect(allItems[num - 1]!)
    }
  })

  const firstVisibleIndex = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(MAX_VISIBLE_MESSAGES / 2),
      allItems.length - MAX_VISIBLE_MESSAGES,
    ),
  )

  const normalizedMessages = useMemo(
    () => normalizeMessages(messages).filter(isNotEmptyMessage),
    [messages],
  )

  return (
    <>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={getTheme().secondaryBorder}
        height={4 + Math.min(MAX_VISIBLE_MESSAGES, allItems.length) * 2}
        paddingX={1}
        marginTop={1}
      >
        <Box flexDirection="column" minHeight={2} marginBottom={1}>
          <Text bold>Jump to a previous message</Text>
          <Text dimColor>This will fork the conversation</Text>
        </Box>
        {allItems
          .slice(firstVisibleIndex, firstVisibleIndex + MAX_VISIBLE_MESSAGES)
          .map((msg, index) => {
            const actualIndex = firstVisibleIndex + index
            const isSelected = actualIndex === selectedIndex
            const isCurrent = msg.uuid === currentUUID

            return (
              <Box key={msg.uuid} flexDirection="row" height={2} minHeight={2}>
                <Box width={7}>
                  {isSelected ? (
                    <Text color="blue" bold>
                      {figures.pointer} {firstVisibleIndex + index + 1}{' '}
                    </Text>
                  ) : (
                    <Text>
                      {'  '}
                      {firstVisibleIndex + index + 1}{' '}
                    </Text>
                  )}
                </Box>
                <Box height={1} overflow="hidden" width={100}>
                  {isCurrent ? (
                    <Box width="100%">
                      <Text dimColor italic>
                        {'(current)'}
                      </Text>
                    </Box>
                  ) : Array.isArray(msg.message.content) &&
                    msg.message.content[0]?.type === 'text' &&
                    isEmptyMessageText(msg.message.content[0].text) ? (
                    <Text dimColor italic>
                      (empty message)
                    </Text>
                  ) : (
                    <MessageComponent
                      message={msg}
                      messages={normalizedMessages}
                      addMargin={false}
                      tools={tools}
                      verbose={false}
                      debug={false}
                      erroredToolUseIDs={erroredToolUseIDs}
                      inProgressToolUseIDs={new Set()}
                      unresolvedToolUseIDs={unresolvedToolUseIDs}
                      shouldAnimate={false}
                      shouldShowDot={false}
                    />
                  )}
                </Box>
              </Box>
            )
          })}
      </Box>
      <Box marginLeft={3}>
        <Text dimColor>
          {exitState.pending ? (
            <>Press {exitState.keyName} again to exit</>
          ) : (
            <>↑/↓ to select · Enter to confirm · Tab/Esc to cancel</>
          )}
        </Text>
      </Box>
    </>
  )
}
