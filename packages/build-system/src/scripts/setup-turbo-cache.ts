#!/usr/bin/env deno run --allow-all

/**
 * Turborepo Remote Caching Setup for Vercel
 * Configures remote caching for faster builds across teams
 */

import { parseArgs } from 'https://deno.land/std@0.208.0/cli/parse_args.ts';
import { ensureFile } from 'https://deno.land/std@0.208.0/fs/mod.ts';
import { join } from 'https://deno.land/std@0.208.0/path/mod.ts';

interface CacheConfig {
  team: string;
  token: string;
  apiUrl?: string;
  uploadTimeout?: number;
}

class TurboCacheSetup {
  private config: CacheConfig;
  private turboConfigPath: string;

  constructor(config: CacheConfig) {
    this.config = config;
    this.turboConfigPath = join(Deno.cwd(), '.turbo', 'config.json');
  }

  async setup(): Promise<void> {
    console.log('🚀 Setting up Turborepo remote caching...');

    // Ensure .turbo directory exists
    await ensureFile(this.turboConfigPath);

    // Configure remote cache
    await this.configureTurboCache();

    // Verify connection
    await this.verifyConnection();

    // Setup team configuration
    await this.setupTeamConfig();

    // Configure Vercel integration
    await this.configureVercelIntegration();

    console.log('✅ Turborepo remote caching configured successfully!');
  }

  private async configureTurboCache(): Promise<void> {
    const config = {
      teamId: this.config.team,
      apiUrl: this.config.apiUrl || 'https://api.vercel.com',
      token: this.config.token,
      enabled: true,
      preflight: true,
      uploadTimeout: this.config.uploadTimeout || 60000,
      signature: true,
    };

    await Deno.writeTextFile(this.turboConfigPath, JSON.stringify(config, null, 2));

    console.log('📝 Turbo config written to .turbo/config.json');
  }

  private async verifyConnection(): Promise<void> {
    console.log('🔍 Verifying remote cache connection...');

    const response = await fetch(
      `${this.config.apiUrl || 'https://api.vercel.com'}/v1/teams/${this.config.team}`,
      {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to verify connection: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Connected to team: ${data.name}`);
  }

  private async setupTeamConfig(): Promise<void> {
    // Create turbo.json team configuration
    const turboJson = {
      $schema: 'https://turbo.build/schema.json',
      remoteCache: {
        enabled: true,
        preflight: true,
      },
      signature: true,
      telemetry: {
        enabled: false,
      },
    };

    const turboJsonPath = join(Deno.cwd(), 'turbo.json');

    try {
      // Read existing turbo.json
      const existing = JSON.parse(await Deno.readTextFile(turboJsonPath));

      // Merge configurations
      const merged = {
        ...existing,
        ...turboJson,
        remoteCache: {
          ...existing.remoteCache,
          ...turboJson.remoteCache,
        },
      };

      await Deno.writeTextFile(turboJsonPath, JSON.stringify(merged, null, 2));
    } catch {
      // Create new if doesn't exist
      await Deno.writeTextFile(turboJsonPath, JSON.stringify(turboJson, null, 2));
    }
  }

  private async configureVercelIntegration(): Promise<void> {
    console.log('🔗 Configuring Vercel integration...');

    // Update vercel.json with caching configuration
    const vercelJsonPath = join(Deno.cwd(), 'vercel.json');

    try {
      const vercelConfig = JSON.parse(await Deno.readTextFile(vercelJsonPath));

      vercelConfig.build = {
        ...vercelConfig.build,
        env: {
          ...vercelConfig.build?.env,
          TURBO_TEAM: this.config.team,
          TURBO_TOKEN: '@turbo-token',
          TURBO_REMOTE_CACHE_SIGNATURE_KEY: '@turbo-cache-key',
        },
      };

      await Deno.writeTextFile(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
    } catch (error) {
      console.warn('⚠️  Could not update vercel.json:', error.message);
    }
  }

  async generateCacheStats(): Promise<void> {
    console.log('📊 Generating cache statistics...');

    const stats = {
      team: this.config.team,
      cacheHits: 0,
      cacheMisses: 0,
      totalBuilds: 0,
      savedTime: 0,
      savedBytes: 0,
    };

    // In production, fetch actual stats from Vercel API
    console.log('Cache statistics:', stats);
  }
}

// CLI Interface
async function main() {
  const args = parseArgs(Deno.args, {
    string: ['team', 'token', 'api-url'],
    number: ['timeout'],
    boolean: ['help', 'stats'],
    alias: {
      t: 'team',
      k: 'token',
      u: 'api-url',
      h: 'help',
      s: 'stats',
    },
  });

  if (args.help) {
    console.log(`
Turborepo Remote Cache Setup for Vercel

USAGE:
  setup-turbo-cache.ts [OPTIONS]

OPTIONS:
  -t, --team <TEAM>         Vercel team ID or slug
  -k, --token <TOKEN>       Vercel API token
  -u, --api-url <URL>       Custom API URL (optional)
  --timeout <MS>            Upload timeout in milliseconds
  -s, --stats               Show cache statistics
  -h, --help                Show this help message

EXAMPLES:
  # Basic setup
  setup-turbo-cache.ts --team my-team --token xxx

  # With custom timeout
  setup-turbo-cache.ts --team my-team --token xxx --timeout 120000

  # Show cache statistics
  setup-turbo-cache.ts --team my-team --token xxx --stats

ENVIRONMENT VARIABLES:
  TURBO_TEAM                Vercel team ID
  TURBO_TOKEN               Vercel API token
  TURBO_API                 Custom API URL
    `);
    return;
  }

  const config: CacheConfig = {
    team: args.team || Deno.env.get('TURBO_TEAM') || '',
    token: args.token || Deno.env.get('TURBO_TOKEN') || '',
    apiUrl: args['api-url'] || Deno.env.get('TURBO_API'),
    uploadTimeout: args.timeout,
  };

  if (!config.team || !config.token) {
    console.error('❌ Error: Team and token are required');
    console.log('Run with --help for usage information');
    Deno.exit(1);
  }

  const setup = new TurboCacheSetup(config);

  try {
    await setup.setup();

    if (args.stats) {
      await setup.generateCacheStats();
    }
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
