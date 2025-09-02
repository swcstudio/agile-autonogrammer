#!/usr/bin/env node

/**
 * Web Scraper CLI Entry Point
 */

import { InteractiveScraper } from '../cli/interactive-cli';

const scraper = new InteractiveScraper();

scraper.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
