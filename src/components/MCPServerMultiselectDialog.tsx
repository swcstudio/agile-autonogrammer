import React from 'react'
import { Box, Text, useInput } from 'ink'
import { getTheme } from '../utils/theme'
import { MultiSelect } from '@inkjs/ui'
import {
  saveCurrentProjectConfig,
  getCurrentProjectConfig,
} from '../utils/config.js'
import { partition } from 'lodash-es'
import { MCPServerDialogCopy } from './MCPServerDialogCopy'
import { useExitOnCtrlCD } from '../hooks/useExitOnCtrlCD'

type Props = {
  serverNames: string[]
  onDone(): void
}

export function MCPServerMultiselectDialog({
  serverNames,
  onDone,
}: Props): React.ReactNode {
  const theme = getTheme()
  function onSubmit(selectedServers: string[]) {
    const config = getCurrentProjectConfig()

    // Initialize arrays if they don't exist
    if (!config.approvedMcprcServers) {
      config.approvedMcprcServers = []
    }
    if (!config.rejectedMcprcServers) {
      config.rejectedMcprcServers = []
    }

    // Use partition to separate approved and rejected servers
    const [approvedServers, rejectedServers] = partition(serverNames, server =>
      selectedServers.includes(server),
    )

    // Add new servers directly to the respective lists
    config.approvedMcprcServers.push(...approvedServers)
    config.rejectedMcprcServers.push(...rejectedServers)

    saveCurrentProjectConfig(config)
    onDone()
  }

  const exitState = useExitOnCtrlCD(() => process.exit())

  useInput((_input, key) => {
    if (key.escape) {
      // On escape, treat all servers as rejected
      const config = getCurrentProjectConfig()
      if (!config.rejectedMcprcServers) {
        config.rejectedMcprcServers = []
      }

      for (const server of serverNames) {
        if (!config.rejectedMcprcServers.includes(server)) {
          config.rejectedMcprcServers.push(server)
        }
      }

      saveCurrentProjectConfig(config)
      onDone()
      return
    }
  })

  return (
    <>
      <Box
        flexDirection="column"
        gap={1}
        padding={1}
        borderStyle="round"
        borderColor={theme.warning}
      >
        <Text bold color={theme.warning}>
          New MCP Servers Detected
        </Text>
        <Text>
          This project contains a .mcprc file with {serverNames.length} MCP
          servers that require your approval.
        </Text>
        <MCPServerDialogCopy />

        <Text>Please select the servers you want to enable:</Text>

        <MultiSelect
          options={serverNames.map(server => ({
            label: server,
            value: server,
          }))}
          defaultValue={serverNames}
          onSubmit={onSubmit}
        />
      </Box>
      <Box marginLeft={3}>
        <Text dimColor>
          {exitState.pending ? (
            <>Press {exitState.keyName} again to exit</>
          ) : (
            <>Space to select · Enter to confirm · Esc to reject all</>
          )}
        </Text>
      </Box>
    </>
  )
}
