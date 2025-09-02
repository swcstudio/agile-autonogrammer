#!/usr/bin/env deno run --allow-all

/**
 * Unified Build System Orchestrator
 *
 * Orchestrates NX, Turborepo, Deno, and Bun for the Katalyst Framework
 * - Deno: Primary package manager and runtime
 * - Bun: Fallback package manager and fast task runner
 * - NX: Monorepo management and intelligent caching
 * - Turborepo: Build pipeline optimization and remote caching
 */

import { parseArgs } from 'https://deno.land/std@0.208.0/cli/parse_args.ts';
import { colors } from 'https://deno.land/std@0.208.0/fmt/colors.ts';
import { existsSync } from 'https://deno.land/std@0.208.0/fs/exists.ts';
import { join } from 'https://deno.land/std@0.208.0/path/mod.ts';

interface RunnerConfig {
  preferredPackageManager: 'deno' | 'bun';
  preferredTaskRunner: 'nx' | 'turbo';
  enableCloudCache: boolean;
  parallel: boolean;
  verbose: boolean;
  dry: boolean;
  fallbackEnabled: boolean;
  cacheStrategy: 'aggressive' | 'conservative' | 'disabled';
}

interface TaskConfig {
  name: string;
  command: string;
  runner: 'nx' | 'turbo' | 'deno' | 'bun';
  dependencies?: string[];
  platforms?: string[];
  cacheEnabled: boolean;
  cloudCacheEnabled: boolean;
  fallbacks?: Array<{ runner: string; command: string }>;
}

interface RunnerCapabilities {
  deno: boolean;
  bun: boolean;
  nx: boolean;
  turbo: boolean;
  node: boolean;
}

class UnifiedRunner {
  private config: RunnerConfig;
  private capabilities: RunnerCapabilities;
  private cwd: string;

  constructor(config: RunnerConfig) {
    this.config = config;
    this.cwd = Deno.cwd();
    this.capabilities = {
      deno: false,
      bun: false,
      nx: false,
      turbo: false,
      node: false,
    };
  }

  async initialize(): Promise<void> {
    console.log(colors.cyan('🚀 Katalyst Unified Build System'));
    console.log(colors.cyan('====================================='));

    await this.detectCapabilities();
    await this.validateEnvironment();

    if (this.config.verbose) {
      this.printCapabilities();
    }
  }

  private async detectCapabilities(): Promise<void> {
    const detections = [
      { name: 'deno', command: 'deno --version' },
      { name: 'bun', command: 'bun --version' },
      { name: 'node', command: 'node --version' },
    ];

    for (const detection of detections) {
      try {
        const process = new Deno.Command(detection.name, {
          args: ['--version'],
          stdout: 'null',
          stderr: 'null',
        });

        const { success } = await process.output();
        this.capabilities[detection.name as keyof RunnerCapabilities] = success;
      } catch {
        this.capabilities[detection.name as keyof RunnerCapabilities] = false;
      }
    }

    // Check for NX and Turbo in package.json and node_modules
    this.capabilities.nx = await this.checkPackageAvailability('nx');
    this.capabilities.turbo = await this.checkPackageAvailability('turbo');
  }

  private async checkPackageAvailability(packageName: string): Promise<boolean> {
    // Check if package exists in node_modules
    const nodeModulesPath = join(this.cwd, 'node_modules', '.bin', packageName);
    if (existsSync(nodeModulesPath)) return true;

    // Check if package exists in package.json
    try {
      const packageJson = JSON.parse(await Deno.readTextFile(join(this.cwd, 'package.json')));
      return !!(
        packageJson.dependencies?.[packageName] ||
        packageJson.devDependencies?.[packageName] ||
        packageJson.peerDependencies?.[packageName]
      );
    } catch {
      return false;
    }
  }

  private async validateEnvironment(): Promise<void> {
    const issues = [];

    if (!this.capabilities.deno && !this.capabilities.bun) {
      issues.push('Neither Deno nor Bun is available');
    }

    if (!this.capabilities.nx && !this.capabilities.turbo) {
      issues.push('Neither NX nor Turborepo is available');
    }

    if (issues.length > 0) {
      console.error(colors.red('❌ Environment validation failed:'));
      issues.forEach((issue) => console.error(colors.red(`   • ${issue}`)));
      throw new Error('Environment validation failed');
    }
  }

  private printCapabilities(): void {
    console.log(colors.bold('\n🔍 Detected Capabilities:'));
    console.log(`   Deno: ${this.capabilities.deno ? colors.green('✓') : colors.red('✗')}`);
    console.log(`   Bun: ${this.capabilities.bun ? colors.green('✓') : colors.red('✗')}`);
    console.log(`   Node.js: ${this.capabilities.node ? colors.green('✓') : colors.red('✗')}`);
    console.log(`   NX: ${this.capabilities.nx ? colors.green('✓') : colors.red('✗')}`);
    console.log(`   Turborepo: ${this.capabilities.turbo ? colors.green('✓') : colors.red('✗')}`);
    console.log();
  }

  async install(packages?: string[]): Promise<boolean> {
    console.log(colors.blue('📦 Installing dependencies...'));

    // Primary: Try Deno
    if (this.capabilities.deno && this.config.preferredPackageManager === 'deno') {
      try {
        const success = await this.runDenoInstall(packages);
        if (success) return true;
      } catch (error) {
        console.warn(colors.yellow(`⚠️  Deno install failed: ${error.message}`));
      }
    }

    // Fallback: Try Bun
    if (this.capabilities.bun && this.config.fallbackEnabled) {
      try {
        console.log(colors.yellow('🔄 Falling back to Bun...'));
        const success = await this.runBunInstall(packages);
        if (success) return true;
      } catch (error) {
        console.warn(colors.yellow(`⚠️  Bun install failed: ${error.message}`));
      }
    }

    // Last resort: Try npm/yarn if Node.js is available
    if (this.capabilities.node && this.config.fallbackEnabled) {
      try {
        console.log(colors.yellow('🔄 Falling back to npm...'));
        return await this.runNpmInstall(packages);
      } catch (error) {
        console.error(colors.red(`❌ All package managers failed: ${error.message}`));
        return false;
      }
    }

    return false;
  }

  private async runDenoInstall(packages?: string[]): Promise<boolean> {
    if (packages && packages.length > 0) {
      // Deno doesn't use traditional package installation
      // Instead, modules are imported directly via URLs
      console.log(colors.gray('   Deno uses URL imports - checking import map...'));
      return await this.updateDenoImportMap(packages);
    }

    // For dependencies, ensure node_modules compatibility
    if (existsSync(join(this.cwd, 'package.json'))) {
      const process = new Deno.Command('deno', {
        args: ['install', '--allow-all'],
        cwd: this.cwd,
      });

      const { success } = await process.output();
      return success;
    }

    return true;
  }

  private async updateDenoImportMap(packages: string[]): Promise<boolean> {
    try {
      const denoJsonPath = join(this.cwd, 'deno.json');
      if (!existsSync(denoJsonPath)) return true;

      const denoConfig = JSON.parse(await Deno.readTextFile(denoJsonPath));

      // Add npm: imports for new packages
      if (!denoConfig.imports) denoConfig.imports = {};

      for (const pkg of packages) {
        if (!denoConfig.imports[pkg]) {
          denoConfig.imports[pkg] = `npm:${pkg}`;
        }
      }

      await Deno.writeTextFile(denoJsonPath, JSON.stringify(denoConfig, null, 2));
      return true;
    } catch (error) {
      console.warn(colors.yellow(`⚠️  Could not update import map: ${error.message}`));
      return false;
    }
  }

  private async runBunInstall(packages?: string[]): Promise<boolean> {
    const args = ['install'];
    if (packages && packages.length > 0) {
      args.push(...packages);
    }

    const process = new Deno.Command('bun', {
      args,
      cwd: this.cwd,
    });

    const { success } = await process.output();
    return success;
  }

  private async runNpmInstall(packages?: string[]): Promise<boolean> {
    const args = ['install'];
    if (packages && packages.length > 0) {
      args.push(...packages);
    }

    const process = new Deno.Command('npm', {
      args,
      cwd: this.cwd,
    });

    const { success } = await process.output();
    return success;
  }

  async runTask(
    taskName: string,
    options: { frameworks?: string[]; platforms?: string[] } = {}
  ): Promise<boolean> {
    console.log(colors.blue(`🏃 Running task: ${colors.bold(taskName)}`));

    const task = this.getTaskConfig(taskName);
    if (!task) {
      console.error(colors.red(`❌ Unknown task: ${taskName}`));
      return false;
    }

    // Determine the best runner for this task
    const runner = this.selectOptimalRunner(task);

    if (this.config.verbose) {
      console.log(colors.gray(`   Selected runner: ${runner}`));
      console.log(colors.gray(`   Command: ${task.command}`));
    }

    // Execute with selected runner
    try {
      return await this.executeTask(task, runner, options);
    } catch (error) {
      console.error(colors.red(`❌ Task failed with ${runner}: ${error.message}`));

      // Try fallbacks if enabled
      if (this.config.fallbackEnabled && task.fallbacks) {
        for (const fallback of task.fallbacks) {
          try {
            console.log(colors.yellow(`🔄 Trying fallback: ${fallback.runner}`));
            const fallbackTask = { ...task, command: fallback.command };
            const success = await this.executeTask(fallbackTask, fallback.runner as any, options);
            if (success) return true;
          } catch (fallbackError) {
            console.warn(colors.yellow(`⚠️  Fallback failed: ${fallbackError.message}`));
          }
        }
      }

      return false;
    }
  }

  private getTaskConfig(taskName: string): TaskConfig | null {
    const tasks: Record<string, TaskConfig> = {
      // Development
      dev: {
        name: 'dev',
        command: 'run-many --target=dev --projects=core,remix,nextjs --parallel',
        runner: 'nx',
        cacheEnabled: false,
        cloudCacheEnabled: false,
        fallbacks: [
          { runner: 'turbo', command: 'dev' },
          { runner: 'bun', command: 'run dev' },
        ],
      },
      'dev:core': {
        name: 'dev:core',
        command: 'dev core',
        runner: 'nx',
        cacheEnabled: false,
        cloudCacheEnabled: false,
      },
      'dev:remix': {
        name: 'dev:remix',
        command: 'dev remix',
        runner: 'nx',
        cacheEnabled: false,
        cloudCacheEnabled: false,
      },
      'dev:nextjs': {
        name: 'dev:nextjs',
        command: 'dev nextjs',
        runner: 'nx',
        cacheEnabled: false,
        cloudCacheEnabled: false,
      },

      // Building
      build: {
        name: 'build',
        command: 'build',
        runner: 'turbo',
        dependencies: ['build-native'],
        cacheEnabled: true,
        cloudCacheEnabled: true,
        fallbacks: [
          {
            runner: 'nx',
            command: 'run-many --target=build --projects=core,remix,nextjs --parallel',
          },
          { runner: 'bun', command: 'run build' },
        ],
      },
      'build:web': {
        name: 'build:web',
        command: 'build:web',
        runner: 'turbo',
        platforms: ['web'],
        cacheEnabled: true,
        cloudCacheEnabled: true,
      },
      'build:desktop': {
        name: 'build:desktop',
        command: 'build:desktop',
        runner: 'turbo',
        platforms: ['desktop'],
        dependencies: ['build-native', 'build:web'],
        cacheEnabled: true,
        cloudCacheEnabled: true,
      },
      'build:mobile': {
        name: 'build:mobile',
        command: 'build:mobile',
        runner: 'turbo',
        platforms: ['mobile'],
        dependencies: ['build-native', 'build:web'],
        cacheEnabled: true,
        cloudCacheEnabled: true,
      },
      'build-native': {
        name: 'build-native',
        command: 'cd shared/src/native && cargo build --release',
        runner: 'deno',
        cacheEnabled: true,
        cloudCacheEnabled: true,
        fallbacks: [{ runner: 'bun', command: 'run build-native' }],
      },

      // Testing
      test: {
        name: 'test',
        command: 'run --allow-all tests/run-all.ts',
        runner: 'deno',
        cacheEnabled: true,
        cloudCacheEnabled: false,
        fallbacks: [
          {
            runner: 'nx',
            command: 'run-many --target=test --projects=core,remix,nextjs,shared --parallel',
          },
          { runner: 'bun', command: 'test' },
        ],
      },
      'test:unit': {
        name: 'test:unit',
        command: 'run --allow-all tests/run-all.ts --mode unit',
        runner: 'deno',
        cacheEnabled: true,
        cloudCacheEnabled: false,
      },
      'test:e2e': {
        name: 'test:e2e',
        command: 'run --allow-all tests/run-all.ts --mode e2e',
        runner: 'deno',
        cacheEnabled: false,
        cloudCacheEnabled: false,
      },

      // Linting and Type Checking
      lint: {
        name: 'lint',
        command: 'lint',
        runner: 'turbo',
        cacheEnabled: true,
        cloudCacheEnabled: true,
        fallbacks: [
          {
            runner: 'nx',
            command: 'run-many --target=lint --projects=core,remix,nextjs,shared --parallel',
          },
          { runner: 'bun', command: 'run lint' },
        ],
      },
      typecheck: {
        name: 'typecheck',
        command: 'check-types',
        runner: 'turbo',
        cacheEnabled: true,
        cloudCacheEnabled: true,
      },

      // Deployment
      deploy: {
        name: 'deploy',
        command: 'run-many --target=deploy --projects=core,remix,nextjs --parallel',
        runner: 'nx',
        dependencies: ['build'],
        cacheEnabled: false,
        cloudCacheEnabled: false,
      },
    };

    return tasks[taskName] || null;
  }

  private selectOptimalRunner(task: TaskConfig): 'nx' | 'turbo' | 'deno' | 'bun' {
    // If task specifies a runner and it's available, use it
    if (this.capabilities[task.runner]) {
      return task.runner;
    }

    // Priority fallback based on task characteristics
    if (task.cacheEnabled && task.dependencies) {
      // For complex builds with caching, prefer Turbo
      if (this.capabilities.turbo) return 'turbo';
      if (this.capabilities.nx) return 'nx';
    }

    if (task.name.startsWith('test') || task.name.includes('deno')) {
      // For testing, prefer Deno
      if (this.capabilities.deno) return 'deno';
    }

    // General fallback priority
    if (this.config.preferredTaskRunner === 'turbo' && this.capabilities.turbo) return 'turbo';
    if (this.config.preferredTaskRunner === 'nx' && this.capabilities.nx) return 'nx';
    if (this.capabilities.bun) return 'bun';
    if (this.capabilities.deno) return 'deno';

    throw new Error('No suitable task runner available');
  }

  private async executeTask(
    task: TaskConfig,
    runner: 'nx' | 'turbo' | 'deno' | 'bun',
    options: { frameworks?: string[]; platforms?: string[] }
  ): Promise<boolean> {
    let command: string;
    let args: string[];

    switch (runner) {
      case 'nx':
        command = 'nx';
        args = task.command.split(' ');

        // Apply framework filtering for NX
        if (options.frameworks?.length) {
          const projectsIndex = args.indexOf('--projects');
          if (projectsIndex !== -1 && projectsIndex + 1 < args.length) {
            args[projectsIndex + 1] = options.frameworks.join(',');
          }
        }
        break;

      case 'turbo':
        command = 'turbo';
        args = task.command.split(' ');

        // Apply filtering for Turbo
        if (options.frameworks?.length || options.platforms?.length) {
          args.push('--filter');
          const filters = [...(options.frameworks || []), ...(options.platforms || [])];
          args.push(filters.join(','));
        }

        // Add cache options
        if (this.config.enableCloudCache && task.cloudCacheEnabled) {
          args.push('--remote-cache');
        }
        break;

      case 'deno':
        command = 'deno';
        args = task.command.split(' ');
        break;

      case 'bun':
        command = 'bun';
        args = task.command.split(' ');
        break;

      default:
        throw new Error(`Unknown runner: ${runner}`);
    }

    if (this.config.dry) {
      console.log(colors.gray(`[DRY RUN] ${command} ${args.join(' ')}`));
      return true;
    }

    const process = new Deno.Command(command, {
      args,
      cwd: this.cwd,
      stdout: this.config.verbose ? 'inherit' : 'piped',
      stderr: this.config.verbose ? 'inherit' : 'piped',
    });

    const { success, stdout, stderr } = await process.output();

    if (!success && !this.config.verbose) {
      const errorOutput = new TextDecoder().decode(stderr);
      console.error(colors.red(errorOutput));
    }

    return success;
  }

  async clean(): Promise<boolean> {
    console.log(colors.blue('🧹 Cleaning build artifacts...'));

    const cleanTasks = ['rm -rf dist .next .remix node_modules/.cache', 'nx reset', 'turbo prune'];

    for (const cleanTask of cleanTasks) {
      try {
        const [command, ...args] = cleanTask.split(' ');
        const process = new Deno.Command(command, {
          args,
          cwd: this.cwd,
          stdout: 'null',
          stderr: 'null',
        });

        await process.output();
      } catch {
        // Ignore errors for clean tasks
      }
    }

    return true;
  }

  async setupCloudCache(): Promise<boolean> {
    console.log(colors.blue('☁️  Setting up cloud cache...'));

    // Setup Turbo remote cache
    if (this.capabilities.turbo) {
      try {
        const process = new Deno.Command('turbo', {
          args: ['login'],
          cwd: this.cwd,
        });

        const { success } = await process.output();
        if (success) {
          console.log(colors.green('✅ Turbo cloud cache configured'));
        }
      } catch (error) {
        console.warn(colors.yellow(`⚠️  Failed to setup Turbo cache: ${error.message}`));
      }
    }

    // Setup NX cloud cache
    if (this.capabilities.nx) {
      try {
        const process = new Deno.Command('nx', {
          args: ['connect-to-nx-cloud'],
          cwd: this.cwd,
        });

        const { success } = await process.output();
        if (success) {
          console.log(colors.green('✅ NX cloud cache configured'));
        }
      } catch (error) {
        console.warn(colors.yellow(`⚠️  Failed to setup NX cache: ${error.message}`));
      }
    }

    return true;
  }

  printStatus(): void {
    console.log(colors.bold('\n📊 System Status:'));
    console.log(
      `   Package Manager: ${colors.green(this.config.preferredPackageManager)} ${!this.capabilities[this.config.preferredPackageManager] ? colors.red('(unavailable)') : ''}`
    );
    console.log(
      `   Task Runner: ${colors.green(this.config.preferredTaskRunner)} ${!this.capabilities[this.config.preferredTaskRunner] ? colors.red('(unavailable)') : ''}`
    );
    console.log(
      `   Cloud Cache: ${this.config.enableCloudCache ? colors.green('enabled') : colors.gray('disabled')}`
    );
    console.log(
      `   Parallel Execution: ${this.config.parallel ? colors.green('enabled') : colors.gray('disabled')}`
    );
    console.log(
      `   Fallbacks: ${this.config.fallbackEnabled ? colors.green('enabled') : colors.gray('disabled')}`
    );
  }
}

// CLI Interface
async function main() {
  const args = parseArgs(Deno.args, {
    string: ['task', 'frameworks', 'platforms', 'package-manager', 'task-runner', 'cache'],
    boolean: [
      'install',
      'clean',
      'cloud-cache',
      'parallel',
      'verbose',
      'dry',
      'no-fallback',
      'status',
      'help',
    ],
    default: {
      'package-manager': 'deno',
      'task-runner': 'turbo',
      cache: 'aggressive',
      parallel: true,
      verbose: false,
      dry: false,
      'no-fallback': false,
    },
    alias: {
      t: 'task',
      f: 'frameworks',
      p: 'platforms',
      pm: 'package-manager',
      tr: 'task-runner',
      i: 'install',
      c: 'clean',
      cc: 'cloud-cache',
      v: 'verbose',
      d: 'dry',
      s: 'status',
      h: 'help',
    },
  });

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  const config: RunnerConfig = {
    preferredPackageManager: args['package-manager'] as 'deno' | 'bun',
    preferredTaskRunner: args['task-runner'] as 'nx' | 'turbo',
    enableCloudCache: args['cloud-cache'] || false,
    parallel: args.parallel,
    verbose: args.verbose,
    dry: args.dry,
    fallbackEnabled: !args['no-fallback'],
    cacheStrategy: args.cache as 'aggressive' | 'conservative' | 'disabled',
  };

  const runner = new UnifiedRunner(config);

  try {
    await runner.initialize();

    if (args.status) {
      runner.printStatus();
      Deno.exit(0);
    }

    if (args['cloud-cache']) {
      await runner.setupCloudCache();
    }

    if (args.install) {
      const packages = args._.length > 0 ? args._.map(String) : undefined;
      const success = await runner.install(packages);
      Deno.exit(success ? 0 : 1);
    }

    if (args.clean) {
      await runner.clean();
      Deno.exit(0);
    }

    if (args.task) {
      const options = {
        frameworks: args.frameworks ? args.frameworks.split(',') : undefined,
        platforms: args.platforms ? args.platforms.split(',') : undefined,
      };

      const success = await runner.runTask(args.task, options);
      Deno.exit(success ? 0 : 1);
    }

    // If no specific action, show status
    runner.printStatus();
  } catch (error) {
    console.error(colors.red(`💥 Unified runner failed: ${error.message}`));
    if (config.verbose) {
      console.error(error.stack);
    }
    Deno.exit(1);
  }
}

function printHelp() {
  console.log(`
${colors.cyan('Katalyst Unified Build System')}

${colors.bold('USAGE:')}
  deno run --allow-all scripts/unified-runner.ts [OPTIONS] [PACKAGES...]

${colors.bold('OPTIONS:')}
  -t, --task <TASK>              Run a specific task
  -f, --frameworks <LIST>        Comma-separated frameworks: core,remix,nextjs
  -p, --platforms <LIST>         Comma-separated platforms: web,desktop,mobile
  --pm, --package-manager <PM>   Package manager: deno, bun [default: deno]
  --tr, --task-runner <TR>       Task runner: nx, turbo [default: turbo]
  --cache <STRATEGY>             Cache strategy: aggressive, conservative, disabled [default: aggressive]
  -i, --install                  Install dependencies
  -c, --clean                    Clean build artifacts
  --cc, --cloud-cache            Setup cloud caching
  --parallel                     Enable parallel execution [default: true]
  --no-fallback                  Disable fallback runners
  -v, --verbose                  Enable verbose output
  -d, --dry                      Dry run (show commands without executing)
  -s, --status                   Show system status
  -h, --help                     Show this help message

${colors.bold('EXAMPLES:')}
  # Install dependencies with Deno (fallback to Bun)
  deno run --allow-all scripts/unified-runner.ts --install

  # Build all frameworks using Turbo with cloud cache
  deno run --allow-all scripts/unified-runner.ts --task build --cloud-cache

  # Run tests for specific frameworks
  deno run --allow-all scripts/unified-runner.ts --task test --frameworks core,shared

  # Development mode with NX
  deno run --allow-all scripts/unified-runner.ts --task dev --task-runner nx

  # Build for specific platforms
  deno run --allow-all scripts/unified-runner.ts --task build --platforms web,desktop

  # Clean and rebuild
  deno run --allow-all scripts/unified-runner.ts --clean
  deno run --allow-all scripts/unified-runner.ts --task build

  # Show system status
  deno run --allow-all scripts/unified-runner.ts --status

${colors.bold('AVAILABLE TASKS:')}
  dev, dev:core, dev:remix, dev:nextjs    - Development servers
  build, build:web, build:desktop, etc.   - Build tasks
  test, test:unit, test:e2e              - Testing
  lint, typecheck                        - Code quality
  deploy                                 - Deployment

${colors.bold('PACKAGE MANAGERS:')}
  deno    - Primary package manager (URL imports + npm compatibility)
  bun     - Fast package manager and runtime (fallback)

${colors.bold('TASK RUNNERS:')}
  turbo   - Build pipeline optimization with remote caching
  nx      - Monorepo management with intelligent caching
`);
}

if (import.meta.main) {
  await main();
}
