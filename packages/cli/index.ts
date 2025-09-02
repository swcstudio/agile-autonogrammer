#!/usr/bin/env node

/**
 * Katalyst CLI Tool
 * 
 * Command-line interface for the Katalyst Multi-Runtime Framework
 */

import { program } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

program
  .name('katalyst')
  .description('CLI for Katalyst Multi-Runtime Framework')
  .version('1.0.0');

program
  .command('init <project-name>')
  .description('Initialize a new Katalyst project')
  .option('-t, --template <template>', 'Project template (full, minimal, vercel-only)', 'full')
  .action((projectName: string, options) => {
    console.log(`🚀 Creating new Katalyst project: ${projectName}`);
    console.log(`📋 Using template: ${options.template}`);
    
    // Create project directory
    const projectPath = path.join(process.cwd(), projectName);
    fs.mkdirSync(projectPath, { recursive: true });
    
    // Copy template files based on template type
    const templateConfig = getTemplateConfig(options.template);
    createProjectStructure(projectPath, templateConfig);
    
    console.log(`✅ Project ${projectName} created successfully!`);
    console.log(`📂 Navigate to: cd ${projectName}`);
    console.log(`🏃 Get started: npm install && npm run dev`);
  });

program
  .command('build')
  .description('Build WASM modules and prepare for deployment')
  .option('-t, --target <target>', 'Build target (vercel, cloudflare, deno)', 'vercel')
  .option('-o, --optimize <level>', 'Optimization level (size, speed, balanced)', 'balanced')
  .action((options) => {
    console.log(`🔨 Building Katalyst project for ${options.target}`);
    console.log(`⚡ Optimization level: ${options.optimize}`);
    
    try {
      // Build WASM modules
      execSync('npm run build:wasm', { stdio: 'inherit' });
      
      // Build for specific target
      if (options.target === 'vercel') {
        execSync('npm run build:vercel', { stdio: 'inherit' });
      }
      
      console.log('✅ Build completed successfully!');
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  });

program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Development server port', '3000')
  .option('-w, --watch', 'Watch WASM modules for changes', false)
  .action((options) => {
    console.log(`🚀 Starting Katalyst development server on port ${options.port}`);
    
    if (options.watch) {
      console.log('👀 Watching WASM modules for changes...');
      // Start file watcher for WASM rebuild
      execSync('npm run dev:wasm &', { stdio: 'inherit' });
    }
    
    execSync('npm run dev', { stdio: 'inherit' });
  });

program
  .command('deploy')
  .description('Deploy to edge platform')
  .option('-p, --platform <platform>', 'Deployment platform (vercel, cloudflare)', 'vercel')
  .option('-e, --env <environment>', 'Environment (development, staging, production)', 'production')
  .action((options) => {
    console.log(`🌐 Deploying to ${options.platform} (${options.env})`);
    
    try {
      // Build first
      execSync(`npm run build -- --target ${options.platform}`, { stdio: 'inherit' });
      
      // Deploy based on platform
      if (options.platform === 'vercel') {
        const deployCmd = options.env === 'production' ? 'vercel --prod' : 'vercel';
        execSync(deployCmd, { stdio: 'inherit' });
      } else if (options.platform === 'cloudflare') {
        const deployCmd = options.env === 'production' ? 
          'wrangler deploy --env production' : 'wrangler deploy';
        execSync(deployCmd, { stdio: 'inherit' });
      }
      
      console.log('✅ Deployment completed successfully!');
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show framework information')
  .action(() => {
    console.log('📊 Katalyst Multi-Runtime Framework');
    console.log('🔷 Version: 1.0.0');
    console.log('🌟 Runtimes: Elixir, Rust, TypeScript');
    console.log('☁️ Platforms: Vercel, Cloudflare, Deno Deploy');
    console.log('🚀 Features: WebAssembly, Edge Functions, Real-time UI');
    console.log('📖 Documentation: https://katalyst.dev');
  });

// Template configurations
function getTemplateConfig(template: string) {
  const templates = {
    full: {
      includes: ['elixir', 'rust', 'typescript', 'vercel'],
      wasmModules: ['katalyst-app', 'katalyst-rust-core', 'katalyst-elixir-runtime'],
      features: ['phoenix', 'liveview', 'nifs', 'react-ssr']
    },
    minimal: {
      includes: ['rust', 'typescript', 'vercel'],
      wasmModules: ['katalyst-app', 'katalyst-rust-core'],
      features: ['react-ssr']
    },
    'vercel-only': {
      includes: ['typescript', 'vercel'],
      wasmModules: ['katalyst-app'],
      features: ['react-ssr']
    }
  };
  
  return templates[template as keyof typeof templates] || templates.full;
}

function createProjectStructure(projectPath: string, config: any) {
  // Create basic package.json
  const packageJson = {
    name: path.basename(projectPath),
    version: '0.1.0',
    private: true,
    scripts: {
      dev: 'katalyst dev',
      build: 'katalyst build',
      deploy: 'katalyst deploy'
    },
    dependencies: {
      '@katalyst/multi-runtime-framework': '^1.0.0'
    }
  };
  
  fs.writeFileSync(
    path.join(projectPath, 'package.json'), 
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create basic vercel.json
  if (config.includes.includes('vercel')) {
    const vercelConfig = {
      functions: {
        'api/*.ts': {
          runtime: 'edge',
          memory: 128,
          maxDuration: 10
        }
      }
    };
    
    fs.writeFileSync(
      path.join(projectPath, 'vercel.json'),
      JSON.stringify(vercelConfig, null, 2)
    );
  }
  
  // Create README.md
  const readme = `# ${path.basename(projectPath)}

A Katalyst Multi-Runtime Framework project.

## Features

${config.features.map((f: string) => `- ${f}`).join('\n')}

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deployment

\`\`\`bash
npm run build
npm run deploy
\`\`\`

## Documentation

Visit [katalyst.dev](https://katalyst.dev) for full documentation.
`;
  
  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
}

program.parse();