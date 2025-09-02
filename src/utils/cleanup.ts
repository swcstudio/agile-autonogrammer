import { promises as fs } from 'fs'
import { join } from 'path'
import { logError } from './log'
import { CACHE_PATHS } from './log'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export type CleanupResult = {
  messages: number
  errors: number
}

export function convertFileNameToDate(filename: string): Date {
  const isoStr = filename
    .split('.')[0]!
    .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z')
  return new Date(isoStr)
}

export async function cleanupOldMessageFiles(): Promise<CleanupResult> {
  const messagePath = CACHE_PATHS.messages()
  const errorPath = CACHE_PATHS.errors()
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS)
  const deletedCounts: CleanupResult = { messages: 0, errors: 0 }

  for (const path of [messagePath, errorPath]) {
    try {
      const files = await fs.readdir(path)

      for (const file of files) {
        try {
          // Convert filename format where all ':.' were replaced with '-'
          const timestamp = convertFileNameToDate(file)
          if (timestamp < thirtyDaysAgo) {
            await fs.unlink(join(path, file))
            // Increment the appropriate counter
            if (path === messagePath) {
              deletedCounts.messages++
            } else {
              deletedCounts.errors++
            }
          }
        } catch (error: unknown) {
          // Log but continue processing other files
          logError(
            `Failed to process file ${file}: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
    } catch (error: unknown) {
      // Ignore if directory doesn't exist
      if (
        error instanceof Error &&
        'code' in error &&
        error.code !== 'ENOENT'
      ) {
        logError(
          `Failed to cleanup directory ${path}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }

  return deletedCounts
}

export function cleanupOldMessageFilesInBackground(): void {
  const immediate = setImmediate(cleanupOldMessageFiles)

  // Prevent the setImmediate from keeping the process alive
  immediate.unref()
}
