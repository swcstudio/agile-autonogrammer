import { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { Box } from 'ink'
import * as React from 'react'
import { Tool } from '../../../Tool'
import { Message, UserMessage } from '../../../query'
import { useGetToolFromMessages } from './utils'

type Props = {
  param: ToolResultBlockParam
  message: UserMessage
  messages: Message[]
  verbose: boolean
  tools: Tool[]
  width: number | string
}

export function UserToolSuccessMessage({
  param,
  message,
  messages,
  tools,
  verbose,
  width,
}: Props): React.ReactNode {
  const { tool } = useGetToolFromMessages(param.tool_use_id, tools, messages)

  return (
    // TODO: Distinguish UserMessage from UserToolResultMessage
    <Box flexDirection="column" width={width}>
      {tool.renderToolResultMessage?.(message.toolUseResult!.data as never, {
        verbose,
      })}
    </Box>
  )
}
