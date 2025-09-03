#!/usr/bin/env node

/**
 * Fallback build script for Vercel deployment
 * Attempts multiple package managers and strategies
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const log = (msg) => console.log(`[BUILD] ${msg}`);
const error = (msg) => console.error(`[ERROR] ${msg}`);

async function tryCommand(cmd, options = {}) {
  try {
    log(`Trying: ${cmd}`);
    const result = execSync(cmd, { 
      stdio: 'pipe', 
      encoding: 'utf8',
      timeout: 300000, // 5 minutes
      ...options 
    });
    log(`Success: ${cmd}`);
    return result;
  } catch (err) {
    error(`Failed: ${cmd} - ${err.message}`);
    return null;
  }
}

async function main() {
  log('Starting fallback build process...');
  
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    error('package.json not found. Are you in the right directory?');
    process.exit(1);
  }
  
  // Strategy 1: Try pnpm with timeout and retries
  log('Strategy 1: pnpm with enhanced configuration');
  if (await tryCommand('pnpm install --frozen-lockfile=false --network-timeout 120000')) {
    if (await tryCommand('pnpm run build')) {
      log('Build successful with pnpm');
      process.exit(0);
    }
  }
  
  // Strategy 2: Try npm with legacy peer deps
  log('Strategy 2: npm with legacy peer deps');
  if (await tryCommand('npm install --legacy-peer-deps --timeout=120000')) {
    if (await tryCommand('npm run build')) {
      log('Build successful with npm');
      process.exit(0);
    }
  }
  
  // Strategy 3: Try yarn if available
  log('Strategy 3: yarn fallback');
  if (await tryCommand('yarn install --network-timeout 120000')) {
    if (await tryCommand('yarn build')) {
      log('Build successful with yarn');
      process.exit(0);
    }
  }
  
  // Strategy 4: Direct bundle with bun (if available locally)
  log('Strategy 4: bun direct build');
  if (await tryCommand('bun install')) {
    if (await tryCommand('bun run build')) {
      log('Build successful with bun');
      process.exit(0);
    }
  }
  
  error('All build strategies failed');
  process.exit(1);
}

main().catch(err => {
  error(`Build script failed: ${err.message}`);
  process.exit(1);
});