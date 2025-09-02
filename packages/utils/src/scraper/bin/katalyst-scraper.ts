#!/usr/bin/env deno run --allow-all

/**
 * Katalyst Web Scraper - CLI Executable
 * Command-line interface entry point for the Katalyst web scraping tool
 */

import { runCLI } from '../cli/index.ts';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the CLI
try {
  await runCLI(process.argv);
} catch (error) {
  console.error('❌ Fatal error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
}
