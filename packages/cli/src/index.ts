#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createCommand } from './commands/create.js';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { generateCommand } from './commands/generate.js';
import { devCommand } from './commands/dev.js';
import { buildCommand } from './commands/build.js';
import { deployCommand } from './commands/deploy.js';
import { testCommand } from './commands/test.js';
import { lintCommand } from './commands/lint.js';
import { upgradeCommand } from './commands/upgrade.js';
import { doctorCommand } from './commands/doctor.js';
import { configCommand } from './commands/config.js';
import { envCommand } from './commands/env.js';
import { workspaceCommand } from './commands/workspace.js';
import { studioCommand } from './commands/studio.js';
import { getVersion } from './utils/version.js';

const program = new Command();

program
  .name('katalyst')
  .description('CLI tool for creating and managing Katalyst applications')
  .version(getVersion())
  .helpOption('-h, --help', 'Display help for command')
  .addHelpCommand('help [command]', 'Display help for command');

// Core commands
program.addCommand(createCommand);
program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(generateCommand);

// Development commands
program.addCommand(devCommand);
program.addCommand(buildCommand);
program.addCommand(testCommand);
program.addCommand(lintCommand);

// Deployment commands
program.addCommand(deployCommand);

// Utility commands
program.addCommand(upgradeCommand);
program.addCommand(doctorCommand);
program.addCommand(configCommand);
program.addCommand(envCommand);

// Advanced commands
program.addCommand(workspaceCommand);
program.addCommand(studioCommand);

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ${chalk.bold.white('Katalyst Framework')} - Enterprise Multi-Runtime Platform    ║
║                                                               ║
║   ${chalk.dim('Version:')} ${getVersion()}                                             ║
║   ${chalk.dim('Docs:')} https://katalyst.dev/docs                           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`));
  
  program.outputHelp();
}