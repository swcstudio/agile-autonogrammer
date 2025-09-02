#!/usr/bin/env node

/**
 * Interactive CLI for Web Scraper with MDX output
 * Provides user-friendly interface for scraping websites and GitHub repos
 */

import * as path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import * as fs from 'fs/promises';
import inquirer from 'inquirer';
import ora from 'ora';
import { ScrapingEngineFactory } from '../core/engine';
import { GitHubRepoScraper, MDXScrapingEngine } from '../core/mdx-scraper';

// Register the MDX engine
ScrapingEngineFactory.registerEngine('mdx', MDXScrapingEngine as any);
ScrapingEngineFactory.registerEngine('github', GitHubRepoScraper as any);

interface ScrapingOptions {
  baseUrl: string;
  depth: number;
  maxPages: number;
  outputDir: string;
  includeImages: boolean;
  includeVideos: boolean;
  downloadMedia: boolean;
  engine: 'mdx' | 'github';
  githubToken?: string;
}

class InteractiveScraper {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommand();
  }

  private setupCommand() {
    this.program
      .name('web-scraper')
      .description('Advanced web scraper with MDX output and multimodal support')
      .version('2.0.0')
      .option('-i, --interactive', 'Run in interactive mode (default)')
      .option('-u, --url <url>', 'Base URL to scrape')
      .option('-d, --depth <depth>', 'Maximum crawl depth', '3')
      .option('-m, --max-pages <pages>', 'Maximum pages to scrape', '2000')
      .option('-o, --output <dir>', 'Output directory', './docs')
      .option('--no-images', 'Skip image extraction')
      .option('--no-videos', 'Skip video extraction')
      .option('--download-media', 'Download media files locally')
      .option('-g, --github', 'Scrape GitHub repository')
      .option('-t, --token <token>', 'GitHub personal access token')
      .action(async (options) => {
        if (options.url && !options.interactive) {
          // Direct mode with provided options
          await this.runScraper({
            baseUrl: options.url,
            depth: Number.parseInt(options.depth),
            maxPages: Number.parseInt(options.maxPages),
            outputDir: options.output,
            includeImages: options.images,
            includeVideos: options.videos,
            downloadMedia: options.downloadMedia,
            engine: options.github ? 'github' : 'mdx',
            githubToken: options.token,
          });
        } else {
          // Interactive mode
          await this.runInteractive();
        }
      });
  }

  private async runInteractive() {
    console.log(chalk.bold.cyan('\n🕷️  Welcome to the Advanced Web Scraper!\n'));

    // Choose scraping type
    const { scrapingType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'scrapingType',
        message: 'What would you like to scrape?',
        choices: [
          { name: '🌐 Website/Documentation', value: 'website' },
          { name: '🔧 GitHub Repository', value: 'github' },
        ],
      },
    ]);

    let options: ScrapingOptions;

    if (scrapingType === 'website') {
      options = await this.getWebsiteOptions();
    } else {
      options = await this.getGitHubOptions();
    }

    // Show summary
    console.log(chalk.cyan('\n📋 Scraping Configuration:'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`${chalk.bold('URL:')} ${options.baseUrl}`);
    console.log(`${chalk.bold('Depth:')} ${options.depth}`);
    console.log(`${chalk.bold('Max Pages:')} ${options.maxPages}`);
    console.log(`${chalk.bold('Output Directory:')} ${options.outputDir}`);
    if (options.engine === 'mdx') {
      console.log(`${chalk.bold('Include Images:')} ${options.includeImages ? '✓' : '✗'}`);
      console.log(`${chalk.bold('Include Videos:')} ${options.includeVideos ? '✓' : '✗'}`);
      console.log(`${chalk.bold('Download Media:')} ${options.downloadMedia ? '✓' : '✗'}`);
    }
    console.log(chalk.gray('─'.repeat(40)));

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Start scraping with these settings?',
        default: true,
      },
    ]);

    if (confirm) {
      await this.runScraper(options);
    } else {
      console.log(chalk.yellow('\n❌ Scraping cancelled.'));
    }
  }

  private async getWebsiteOptions(): Promise<ScrapingOptions> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Enter the base URL to scrape:',
        default: 'https://docs.anthropic.com/en/',
        validate: (input) => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      },
      {
        type: 'number',
        name: 'depth',
        message: 'Maximum crawl depth:',
        default: 3,
        validate: (input) => (input >= 0 && input <= 10) || 'Depth must be between 0 and 10',
      },
      {
        type: 'number',
        name: 'maxPages',
        message: 'Maximum number of pages to scrape:',
        default: 2000,
        validate: (input) => input > 0 || 'Must scrape at least 1 page',
      },
      {
        type: 'input',
        name: 'outputDir',
        message: 'Output directory:',
        default: (answers: any) => {
          const url = new URL(answers.baseUrl);
          const domain = url.hostname.replace(/^www\./, '').replace(/\./g, '-');
          return `./docs/${domain}`;
        },
      },
      {
        type: 'confirm',
        name: 'includeImages',
        message: 'Extract images?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'includeVideos',
        message: 'Extract videos?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'downloadMedia',
        message: 'Download media files locally?',
        default: false,
        when: (answers) => answers.includeImages || answers.includeVideos,
      },
    ]);

    return {
      ...answers,
      engine: 'mdx',
      downloadMedia: answers.downloadMedia || false,
    };
  }

  private async getGitHubOptions(): Promise<ScrapingOptions> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Enter the GitHub repository URL:',
        default: 'https://github.com/anthropics/anthropic-sdk-typescript',
        validate: (input) => {
          if (!input.includes('github.com')) {
            return 'Please enter a valid GitHub repository URL';
          }
          return true;
        },
      },
      {
        type: 'password',
        name: 'githubToken',
        message: 'GitHub personal access token (optional, for higher rate limits):',
        mask: '*',
      },
      {
        type: 'input',
        name: 'outputDir',
        message: 'Output directory:',
        default: (answers: any) => {
          const match = answers.baseUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
          if (match) {
            return `./docs/github/${match[1]}-${match[2]}`;
          }
          return './docs/github-repo';
        },
      },
    ]);

    return {
      ...answers,
      engine: 'github',
      depth: 0,
      maxPages: 10000,
      includeImages: true,
      includeVideos: false,
      downloadMedia: false,
    };
  }

  private async runScraper(options: ScrapingOptions) {
    const spinner = ora('Initializing scraper...').start();

    try {
      // Ensure output directory exists
      await fs.mkdir(options.outputDir, { recursive: true });

      // Clean existing files if directory exists
      const { cleanExisting } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'cleanExisting',
          message: `Output directory "${options.outputDir}" exists. Clean it first?`,
          default: true,
          when: async () => {
            try {
              await fs.access(options.outputDir);
              const files = await fs.readdir(options.outputDir);
              return files.length > 0;
            } catch {
              return false;
            }
          },
        },
      ]);

      if (cleanExisting) {
        spinner.text = 'Cleaning output directory...';
        await this.cleanDirectory(options.outputDir);
      }

      spinner.text = 'Creating scraper engine...';

      const config = {
        url: options.baseUrl,
        engine: options.engine as any,
        outputDir: options.outputDir,
        baseUrl: options.baseUrl,
        depth: options.depth,
        maxPages: options.maxPages,
        includeImages: options.includeImages,
        includeVideos: options.includeVideos,
        downloadMedia: options.downloadMedia,
        githubToken: options.githubToken,
        output: {
          format: 'mdx' as const,
          filePath: options.outputDir,
        },
        extraction: {
          rules: [],
        },
      };

      let scraper: MDXScrapingEngine | GitHubRepoScraper;

      if (options.engine === 'github') {
        scraper = new GitHubRepoScraper(config);
        spinner.text = 'Scraping GitHub repository...';
        await scraper.scrapeGitHubRepo(options.baseUrl);
      } else {
        scraper = ScrapingEngineFactory.createEngine(config) as MDXScrapingEngine;

        // Set up progress monitoring
        let currentUrl = '';
        let processedCount = 0;

        scraper.on('url_start', (event: any) => {
          currentUrl = event.url;
          spinner.text = `Scraping (${processedCount}/${options.maxPages}): ${currentUrl}`;
        });

        scraper.on('url_end', (event: any) => {
          processedCount++;
          if (event.success) {
            spinner.succeed(`✓ ${event.url}`);
            spinner.start(`Processing...`);
          } else {
            spinner.fail(`✗ ${event.url}: ${event.error?.message}`);
            spinner.start(`Continuing...`);
          }
        });

        scraper.on('progress', (event: any) => {
          const percentage = Math.round(event.progress.percentage);
          spinner.text = `Progress: ${percentage}% (${event.progress.completed}/${event.progress.total})`;
        });

        // Start scraping
        const result = await scraper.scrape();

        spinner.succeed('Scraping completed!');

        // Show results summary
        console.log(chalk.green('\n✨ Scraping Summary:'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(`${chalk.bold('Total URLs:')} ${result.summary.totalUrls}`);
        console.log(
          `${chalk.bold('Successful:')} ${chalk.green(result.summary.successfulExtractions)}`
        );
        console.log(`${chalk.bold('Failed:')} ${chalk.red(result.summary.failedExtractions)}`);
        console.log(
          `${chalk.bold('Processing Time:')} ${Math.round(result.summary.processingTime / 1000)}s`
        );
        console.log(
          `${chalk.bold('Average Time/URL:')} ${Math.round(result.summary.averageTimePerUrl)}ms`
        );
        console.log(chalk.gray('─'.repeat(40)));
      }

      // Generate summary report
      await this.generateSummaryReport(options);

      console.log(chalk.cyan(`\n📁 Output saved to: ${chalk.bold(options.outputDir)}`));
      console.log(
        chalk.cyan(`📄 View the index at: ${chalk.bold(path.join(options.outputDir, 'index.mdx'))}`)
      );
    } catch (error) {
      spinner.fail('Scraping failed!');
      console.error(chalk.red('\n❌ Error:'), error.message);
      process.exit(1);
    }
  }

  private async cleanDirectory(dir: string) {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        await fs.rm(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
    }
  }

  private async generateSummaryReport(options: ScrapingOptions) {
    const reportPath = path.join(options.outputDir, 'scraping-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      config: options,
      stats: {
        totalFiles: 0,
        totalSize: 0,
        mediaFiles: 0,
      },
    };

    // Calculate stats
    const files = await this.getFilesRecursive(options.outputDir);
    report.stats.totalFiles = files.length;

    for (const file of files) {
      const stat = await fs.stat(file);
      report.stats.totalSize += stat.size;
      if (file.includes('/media/')) {
        report.stats.mediaFiles++;
      }
    }

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  }

  private async getFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.getFilesRecursive(fullPath)));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  async run() {
    await this.program.parseAsync(process.argv);
  }
}

// Export for module usage
export { InteractiveScraper };

// Run if executed directly
if (require.main === module) {
  const scraper = new InteractiveScraper();
  scraper.run().catch(console.error);
}
