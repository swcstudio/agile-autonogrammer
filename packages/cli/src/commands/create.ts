import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';
import ora from 'ora';
import validateNpmPackageName from 'validate-npm-package-name';
import { detectPackageManager, installDependencies } from '../utils/package-manager.js';
import { getTemplates, downloadTemplate } from '../utils/templates.js';
import { Profile, profiles } from '../utils/profiles.js';

interface CreateOptions {
  template?: string;
  profile?: string;
  typescript?: boolean;
  packageManager?: string;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
}

export const createCommand = new Command('create')
  .description('Create a new Katalyst application')
  .argument('[name]', 'Project name')
  .option('-t, --template <template>', 'Use specific template')
  .option('-p, --profile <profile>', 'Installation profile (minimal|app|storefront|enterprise|custom)')
  .option('--typescript', 'Use TypeScript (default)')
  .option('--javascript', 'Use JavaScript')
  .option('--package-manager <pm>', 'Package manager to use (npm|pnpm|yarn|bun)')
  .option('--no-install', 'Skip dependency installation')
  .option('--no-git', 'Skip git initialization')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(async (name: string | undefined, options: CreateOptions) => {
    console.log(chalk.cyan.bold('\n🚀 Creating a new Katalyst application\n'));

    // Get project name
    if (!name && !options.yes) {
      const { projectName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is your project named?',
          default: 'my-katalyst-app',
          validate: (input: string) => {
            const validation = validateNpmPackageName(input);
            if (validation.validForNewPackages) {
              return true;
            }
            return 'Invalid project name';
          }
        }
      ]);
      name = projectName;
    } else if (!name) {
      name = 'my-katalyst-app';
    }

    // Check if directory exists
    const projectPath = path.resolve(process.cwd(), name);
    if (fs.existsSync(projectPath)) {
      console.error(chalk.red(`Error: Directory ${name} already exists`));
      process.exit(1);
    }

    // Get configuration
    let config: any = {
      name,
      projectPath,
      template: options.template,
      profile: options.profile,
      typescript: options.typescript !== false,
      packageManager: options.packageManager || detectPackageManager(),
      install: options.install !== false,
      git: options.git !== false
    };

    if (!options.yes && !options.template && !options.profile) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'profile',
          message: 'Which installation profile would you like to use?',
          choices: [
            { name: '🚀 Minimal - Essential framework only', value: 'minimal' },
            { name: '📱 App - Full application framework', value: 'app' },
            { name: '🛒 Storefront - E-commerce ready', value: 'storefront' },
            { name: '🏢 Enterprise - Complete suite', value: 'enterprise' },
            { name: '🎯 Custom - Choose specific packages', value: 'custom' }
          ],
          default: 'app'
        },
        {
          type: 'list',
          name: 'template',
          message: 'Which template would you like to use?',
          choices: async () => {
            const templates = await getTemplates();
            return templates.map(t => ({
              name: t.description,
              value: t.name
            }));
          },
          when: (answers: any) => answers.profile !== 'custom'
        },
        {
          type: 'checkbox',
          name: 'packages',
          message: 'Select packages to install:',
          choices: [
            { name: '@katalyst/core', value: '@katalyst/core', checked: true },
            { name: '@katalyst/design-system', value: '@katalyst/design-system' },
            { name: '@katalyst/ai', value: '@katalyst/ai' },
            { name: '@katalyst/payments', value: '@katalyst/payments' },
            { name: '@katalyst/analytics', value: '@katalyst/analytics' },
            { name: '@katalyst/multithreading', value: '@katalyst/multithreading' },
            { name: '@katalyst/pwa', value: '@katalyst/pwa' },
            { name: '@katalyst/security-ai', value: '@katalyst/security-ai' }
          ],
          when: (answers: any) => answers.profile === 'custom'
        },
        {
          type: 'confirm',
          name: 'typescript',
          message: 'Would you like to use TypeScript?',
          default: true
        },
        {
          type: 'list',
          name: 'packageManager',
          message: 'Which package manager would you like to use?',
          choices: ['npm', 'pnpm', 'yarn', 'bun'],
          default: config.packageManager
        }
      ]);

      config = { ...config, ...answers };
    }

    // Set default profile if not specified
    if (!config.profile) {
      config.profile = 'app';
    }

    // Create project
    console.log();
    const spinner = ora('Creating project structure...').start();

    try {
      // Create project directory
      await fs.ensureDir(projectPath);

      // Download template or create from profile
      if (config.template) {
        await downloadTemplate(config.template, projectPath);
      } else {
        await createFromProfile(config.profile, projectPath, config);
      }

      // Update package.json with project name
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.name = name;
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }

      spinner.succeed('Project structure created');

      // Initialize git
      if (config.git) {
        const gitSpinner = ora('Initializing git repository...').start();
        try {
          await execa('git', ['init'], { cwd: projectPath });
          await fs.writeFile(
            path.join(projectPath, '.gitignore'),
            `node_modules
dist
build
.env.local
.env.*.local
*.log
.DS_Store
coverage
.turbo
.next
.nuxt
.cache
.parcel-cache
*.node
*.wasm
target/
Cargo.lock`
          );
          await execa('git', ['add', '.'], { cwd: projectPath });
          await execa('git', ['commit', '-m', 'Initial commit from Katalyst CLI'], { cwd: projectPath });
          gitSpinner.succeed('Git repository initialized');
        } catch (error) {
          gitSpinner.fail('Failed to initialize git repository');
        }
      }

      // Install dependencies
      if (config.install) {
        const installSpinner = ora('Installing dependencies...').start();
        try {
          await installDependencies(projectPath, config.packageManager);
          installSpinner.succeed('Dependencies installed');
        } catch (error) {
          installSpinner.fail('Failed to install dependencies');
          console.log(chalk.yellow('\nYou can install dependencies manually by running:'));
          console.log(chalk.cyan(`  cd ${name}`));
          console.log(chalk.cyan(`  ${config.packageManager} install`));
        }
      }

      // Success message
      console.log(chalk.green.bold(`\n✨ Successfully created ${name}\n`));
      
      console.log('Next steps:');
      console.log(chalk.cyan(`  cd ${name}`));
      
      if (!config.install) {
        console.log(chalk.cyan(`  ${config.packageManager} install`));
      }
      
      console.log(chalk.cyan(`  ${config.packageManager === 'npm' ? 'npm run' : config.packageManager} dev`));
      
      console.log('\nHappy coding! 🎉\n');

    } catch (error) {
      spinner.fail('Failed to create project');
      console.error(chalk.red('Error:'), error);
      
      // Cleanup on failure
      if (fs.existsSync(projectPath)) {
        await fs.remove(projectPath);
      }
      
      process.exit(1);
    }
  });

async function createFromProfile(profileName: string, projectPath: string, config: any) {
  const profile = profiles[profileName as keyof typeof profiles];
  
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}`);
  }

  // Create basic project structure
  const dirs = [
    'src',
    'src/components',
    'src/pages',
    'src/hooks',
    'src/utils',
    'src/styles',
    'public'
  ];

  for (const dir of dirs) {
    await fs.ensureDir(path.join(projectPath, dir));
  }

  // Create package.json
  const packageJson = {
    name: config.name,
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'katalyst dev',
      build: 'katalyst build',
      test: 'katalyst test',
      lint: 'katalyst lint',
      deploy: 'katalyst deploy'
    },
    dependencies: profile.packages.reduce((acc: any, pkg: string) => {
      acc[pkg] = 'latest';
      return acc;
    }, {}),
    devDependencies: {
      '@katalyst/cli': 'latest',
      typescript: config.typescript ? '^5.3.3' : undefined,
      '@types/react': config.typescript ? '^18.2.45' : undefined,
      '@types/node': config.typescript ? '^20.10.0' : undefined
    }
  };

  // Remove undefined values
  Object.keys(packageJson.devDependencies).forEach(key => {
    if (packageJson.devDependencies[key] === undefined) {
      delete packageJson.devDependencies[key];
    }
  });

  await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });

  // Create tsconfig.json if TypeScript
  if (config.typescript) {
    const tsConfig = {
      extends: '@katalyst/typescript-config/base.json',
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        jsx: 'react-jsx',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        paths: {
          '@/*': ['./src/*']
        }
      },
      include: ['src'],
      exclude: ['node_modules', 'dist', 'build']
    };

    await fs.writeJson(path.join(projectPath, 'tsconfig.json'), tsConfig, { spaces: 2 });
  }

  // Create katalyst.config.ts
  const configContent = `import { defineConfig } from '@katalyst/core';

export default defineConfig({
  profile: '${profileName}',
  features: {
    ai: ${profile.packages.includes('@katalyst/ai')},
    pwa: ${profile.packages.includes('@katalyst/pwa')},
    analytics: ${profile.packages.includes('@katalyst/analytics')},
    payments: ${profile.packages.includes('@katalyst/payments')}
  },
  build: {
    target: 'es2022',
    minify: true,
    sourcemap: true
  }
});
`;

  await fs.writeFile(
    path.join(projectPath, config.typescript ? 'katalyst.config.ts' : 'katalyst.config.js'),
    configContent
  );

  // Create main app file
  const ext = config.typescript ? 'tsx' : 'jsx';
  const appContent = `import { KatalystApp, Button, Card } from '@katalyst/core';

function App() {
  return (
    <KatalystApp>
      <Card>
        <h1>Welcome to Katalyst</h1>
        <p>Your ${profileName} application is ready!</p>
        <Button variant="primary">Get Started</Button>
      </Card>
    </KatalystApp>
  );
}

export default App;
`;

  await fs.writeFile(path.join(projectPath, `src/App.${ext}`), appContent);

  // Create main entry file
  const mainContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  await fs.writeFile(path.join(projectPath, `src/main.${ext}`), mainContent);

  // Create index.html
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Katalyst App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.${ext}"></script>
  </body>
</html>
`;

  await fs.writeFile(path.join(projectPath, 'index.html'), htmlContent);

  // Create global styles
  const stylesContent = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #3b82f6;
  --secondary: #8b5cf6;
  --background: #ffffff;
  --foreground: #111827;
}

[data-theme='dark'] {
  --background: #111827;
  --foreground: #ffffff;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--background);
  color: var(--foreground);
}
`;

  await fs.writeFile(path.join(projectPath, 'src/styles/globals.css'), stylesContent);

  // Create .env.example
  const envContent = `# Katalyst Configuration
KATALYST_ENV=development

# AI Configuration (optional)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
OPENAI_API_KEY=

# Database (optional)
DATABASE_URL=

# Analytics (optional)
POSTHOG_API_KEY=
`;

  await fs.writeFile(path.join(projectPath, '.env.example'), envContent);

  // Create README.md
  const readmeContent = `# ${config.name}

A Katalyst application built with the ${profileName} profile.

## Getting Started

\`\`\`bash
# Install dependencies
${config.packageManager} install

# Start development server
${config.packageManager === 'npm' ? 'npm run' : config.packageManager} dev

# Build for production
${config.packageManager === 'npm' ? 'npm run' : config.packageManager} build
\`\`\`

## Features

${profile.packages.map((pkg: string) => `- ${pkg}`).join('\n')}

## Documentation

Visit [https://katalyst.dev/docs](https://katalyst.dev/docs) for full documentation.
`;

  await fs.writeFile(path.join(projectPath, 'README.md'), readmeContent);
}