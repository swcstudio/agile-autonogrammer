import * as React from 'react'
import { OrderedList } from '@inkjs/ui'
import { Box, Text } from 'ink'
import {
  getCurrentProjectConfig,
  getGlobalConfig,
  saveCurrentProjectConfig,
  saveGlobalConfig,
} from './utils/config.js'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import terminalSetup from './commands/terminalSetup'
import { getTheme } from './utils/theme'
import { RELEASE_NOTES } from './constants/releaseNotes'
import { gt } from 'semver'
import { isDirEmpty } from './utils/file'
import { MACRO } from './constants/macros'
import { PROJECT_FILE, PRODUCT_NAME } from './constants/product'

// Function to mark onboarding as complete
export function markProjectOnboardingComplete(): void {
  const projectConfig = getCurrentProjectConfig()
  if (!projectConfig.hasCompletedProjectOnboarding) {
    saveCurrentProjectConfig({
      ...projectConfig,
      hasCompletedProjectOnboarding: true,
    })
  }
}

function markReleaseNotesSeen(): void {
  const config = getGlobalConfig()
  saveGlobalConfig({
    ...config,
    lastReleaseNotesSeen: MACRO.VERSION,
  })
}

type Props = {
  workspaceDir: string
}

export default function ProjectOnboarding({
  workspaceDir,
}: Props): React.ReactNode {
  // Check if project onboarding has already been completed
  const projectConfig = getCurrentProjectConfig()
  const showOnboarding = !projectConfig.hasCompletedProjectOnboarding

  // Get previous version from config
  const config = getGlobalConfig()
  const previousVersion = config.lastReleaseNotesSeen

  // Get release notes to show
  let releaseNotesToShow: string[] = []
  if (!previousVersion || gt(MACRO.VERSION, previousVersion)) {
    releaseNotesToShow = RELEASE_NOTES[MACRO.VERSION] || []
  }
  const hasReleaseNotes = releaseNotesToShow.length > 0

  // Mark release notes as seen when they're displayed without onboarding
  React.useEffect(() => {
    if (hasReleaseNotes && !showOnboarding) {
      markReleaseNotesSeen()
    }
  }, [hasReleaseNotes, showOnboarding])

  // We only want to show either onboarding OR release notes (with preference for onboarding)
  // If there's no onboarding to show and no release notes, return null
  if (!showOnboarding && !hasReleaseNotes) {
    return null
  }

  // Load what we need for onboarding
  // NOTE: This whole component is statically rendered Once
  const hasClaudeMd = existsSync(join(workspaceDir, PROJECT_FILE))
  const isWorkspaceDirEmpty = isDirEmpty(workspaceDir)
  const needsClaudeMd = !hasClaudeMd && !isWorkspaceDirEmpty
  const showTerminalTip =
    terminalSetup.isEnabled && !getGlobalConfig().shiftEnterKeyBindingInstalled

  const theme = getTheme()

  return (
    <Box flexDirection="column" gap={1} padding={1} paddingBottom={0}>
      {showOnboarding && (
        <>
          <Text color={theme.secondaryText}>Tips for getting started:</Text>
          {/* @ts-expect-error - OrderedList children prop issue */}
          <OrderedList>
            {/* Collect all the items that should be displayed */}
            {(() => {
              const items = []

              if (isWorkspaceDirEmpty) {
                items.push(
                  <React.Fragment key="workspace">
                    {/* @ts-expect-error - OrderedList.Item children prop issue */}
                    <OrderedList.Item>
                      <Text color={theme.secondaryText}>
                        Ask {PRODUCT_NAME} to create a new app or clone a
                        repository.
                      </Text>
                    </OrderedList.Item>
                  </React.Fragment>,
                )
              }
              if (needsClaudeMd) {
                items.push(
                  <React.Fragment key="claudemd">
                    {/* @ts-expect-error - OrderedList.Item children prop issue */}
                    <OrderedList.Item>
                      <Text color={theme.secondaryText}>
                        Run <Text color={theme.text}>/init</Text> to create
                      a&nbsp;
                      {PROJECT_FILE} file with instructions for {PRODUCT_NAME}.
                    </Text>
                    </OrderedList.Item>
                  </React.Fragment>,
                )
              }

              if (showTerminalTip) {
                items.push(
                  <React.Fragment key="terminal">
                    {/* @ts-expect-error - OrderedList.Item children prop issue */}
                    <OrderedList.Item>
                      <Text color={theme.secondaryText}>
                        Run <Text color={theme.text}>/terminal-setup</Text>
                        <Text bold={false}> to set up terminal integration</Text>
                      </Text>
                    </OrderedList.Item>
                  </React.Fragment>,
                )
              }

              items.push(
                <React.Fragment key="questions">
                  {/* @ts-expect-error - OrderedList.Item children prop issue */}
                  <OrderedList.Item>
                    <Text color={theme.secondaryText}>
                      Ask {PRODUCT_NAME} questions about your codebase.
                    </Text>
                  </OrderedList.Item>
                </React.Fragment>,
              )

              items.push(
                <React.Fragment key="changes">
                  {/* @ts-expect-error - OrderedList.Item children prop issue */}
                  <OrderedList.Item>
                    <Text color={theme.secondaryText}>
                      Ask {PRODUCT_NAME} to implement changes to your codebase.
                    </Text>
                  </OrderedList.Item>
                </React.Fragment>,
              )

              return items
            })()}
          </OrderedList>
        </>
      )}

      {!showOnboarding && hasReleaseNotes && (
        <Box
          borderColor={getTheme().secondaryBorder}
          flexDirection="column"
          marginRight={1}
        >
          <Box flexDirection="column" gap={0}>
            <Box marginBottom={1}>
              <Text>🆕 What&apos;s new in v{MACRO.VERSION}:</Text>
            </Box>
            <Box flexDirection="column" marginLeft={1}>
              {releaseNotesToShow.map((note, noteIndex) => (
                <React.Fragment key={noteIndex}>
                  <Text color={getTheme().secondaryText}>
                    • {note}
                  </Text>
                </React.Fragment>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {workspaceDir === homedir() && (
        <Text color={getTheme().warning}>
          Note: You have launched <Text bold>anon-code</Text> in your home
          directory. For the best experience, launch it in a project directory
          instead.
        </Text>
      )}
    </Box>
  )
}
