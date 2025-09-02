/**
 * Katalyst Web Scraper - CLI Interface
 * Comprehensive command-line interface for web scraping operations
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { Command } from 'commander';
import { ScrapingEngineFactory } from '../core/engine';
import { CheerioEngine } from '../engines/cheerio-engine';
import { PlaywrightEngine } from '../engines/playwright-engine';
import type {
  BaseScrapingConfig,
  BrowserType,
  ExtractionRule,
  OutputFormat,
  ProgressEvent,
  ScrapingEngine,
  ScrapingResult,
} from '../types';

// Register engines
ScrapingEngineFactory.registerEngine('cheerio', CheerioEngine);
ScrapingEngineFactory.registerEngine('playwright', PlaywrightEngine);

/**
 * CLI Application class
 */
export class ScraperCLI {
  private program: Command;
  private version = '1.0.0';

  constructor() {
    this.program = new Command();
    this.setupProgram();
    this.setupCommands();
  }

  /**
   * Setup main program configuration
   */
  private setupProgram(): void {
    this.program
      .name('katalyst-scraper')
      .description('State-of-the-art TypeScript web scraping tool')
      .version(this.version)
      .option('-c, --config <path>', 'Configuration file path')
      .option('-v, --verbose', 'Verbose output')
      .option('--debug', 'Debug mode')
      .hook('preAction', (thisCommand) => {
        // Setup global options
        const opts = thisCommand.opts();
        if (opts.debug) {
          process.env.LOG_LEVEL = 'debug';
        } else if (opts.verbose) {
          process.env.LOG_LEVEL = 'info';
        }
      });
  }

  /**
   * Setup CLI commands
   */
  private setupCommands(): void {
    this.setupScrapeCommand();
    this.setupBulkCommand();
    this.setupConfigCommand();
    this.setupListCommand();
    this.setupTestCommand();
    this.setupDocsCommand();
  }

  /**
   * Setup single URL scraping command
   */
  private setupScrapeCommand(): void {
    this.program
      .command('scrape')
      .description('Scrape a single URL or multiple URLs')
      .argument('<url>', 'URL(s) to scrape (comma-separated for multiple)')
      .option('-e, --engine <engine>', 'Scraping engine to use', 'cheerio')
      .option('-o, --output <path>', 'Output file path')
      .option('-f, --format <format>', 'Output format (json, csv, xml, yaml)', 'json')
      .option('--pretty', 'Pretty print JSON output', false)
      .option(
        '--browser <browser>',
        'Browser type for Playwright (chromium, firefox, webkit)',
        'chromium'
      )
      .option('--headless', 'Run browser in headless mode', true)
      .option('--no-headless', 'Run browser in headed mode')
      .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
      .option('--delay <ms>', 'Delay between requests in milliseconds', '1000')
      .option('--retries <count>', 'Maximum retry attempts', '3')
      .option('--user-agent <ua>', 'Custom user agent string')
      .option('--proxy <url>', 'Proxy server URL')
      .option('--cookies <cookies>', 'Cookies as JSON string')
      .option('--headers <headers>', 'Custom headers as JSON string')
      .option('--selector <selector>', 'CSS selector for data extraction')
      .option('--attribute <attr>', 'Attribute to extract (text, html, href, etc.)')
      .option('--multiple', 'Extract multiple matches', false)
      .option('--required', 'Make extraction required', false)
      .option('--type <type>', 'Data type (text, number, boolean, url, email, date)', 'text')
      .option('--screenshot', 'Take screenshots (Playwright only)', false)
      .option('--screenshot-path <path>', 'Screenshot path template')
      .option('--wait-selector <selector>', 'Wait for selector before scraping')
      .option('--wait-text <text>', 'Wait for text content before scraping')
      .option('--wait-network', 'Wait for network idle before scraping', false)
      .addHelpText(
        'after',
        `
Examples:
  $ katalyst-scraper scrape https://example.com
  $ katalyst-scraper scrape https://example.com -e playwright --browser firefox
  $ katalyst-scraper scrape https://example.com -o data.json -f json --pretty
  $ katalyst-scraper scrape https://example.com --selector "h1" --attribute text
  $ katalyst-scraper scrape https://example.com --screenshot --screenshot-path "screenshots/{url}-{timestamp}.png"
  $ katalyst-scraper scrape https://example.com,https://example.org --delay 2000
      `
      )
      .action(async (url, options) => {
        try {
          await this.handleScrapeCommand(url, options);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  /**
   * Setup bulk scraping command
   */
  private setupBulkCommand(): void {
    this.program
      .command('bulk')
      .description('Bulk scraping from file or URL patterns')
      .option('-i, --input <path>', 'Input file with URLs (CSV, JSON, or text)')
      .option('-p, --pattern <pattern>', 'URL pattern with placeholders')
      .option('-r, --range <range>', 'Range for pattern variables (e.g., "1-100" or "a-z")')
      .option('-c, --concurrency <count>', 'Concurrent requests', '5')
      .option('-b, --batch-size <size>', 'Batch size', '10')
      .option('-e, --engine <engine>', 'Scraping engine to use', 'cheerio')
      .option('-o, --output <path>', 'Output directory or file')
      .option('-f, --format <format>', 'Output format', 'json')
      .option('--split-files', 'Split output into multiple files', false)
      .option('--max-file-size <size>', 'Maximum file size in MB', '100')
      .option('--resume', 'Resume interrupted scraping', false)
      .option('--progress', 'Show progress bar', true)
      .option('--no-progress', 'Hide progress bar')
      .addHelpText(
        'after',
        `
Examples:
  $ katalyst-scraper bulk -i urls.txt -o results/
  $ katalyst-scraper bulk -p "https://example.com/page/{id}" -r "1-100"
  $ katalyst-scraper bulk -i products.csv --concurrency 10 --batch-size 20
  $ katalyst-scraper bulk -i urls.json --split-files --max-file-size 50
      `
      )
      .action(async (options) => {
        try {
          await this.handleBulkCommand(options);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  /**
   * Setup configuration management command
   */
  private setupConfigCommand(): void {
    const configCmd = this.program.command('config').description('Configuration management');

    configCmd
      .command('init')
      .description('Initialize configuration file')
      .option('-o, --output <path>', 'Configuration file path', 'scraper.config.json')
      .option('--template <template>', 'Configuration template (basic, advanced, bulk)', 'basic')
      .action(async (options) => {
        try {
          await this.handleConfigInit(options);
        } catch (error) {
          this.handleError(error);
        }
      });

    configCmd
      .command('validate')
      .description('Validate configuration file')
      .argument('<path>', 'Configuration file path')
      .action(async (path) => {
        try {
          await this.handleConfigValidate(path);
        } catch (error) {
          this.handleError(error);
        }
      });

    configCmd
      .command('show')
      .description('Show configuration')
      .argument('[path]', 'Configuration file path', 'scraper.config.json')
      .action(async (path) => {
        try {
          await this.handleConfigShow(path);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  /**
   * Setup list command for available options
   */
  private setupListCommand(): void {
    const listCmd = this.program.command('list').description('List available options');

    listCmd
      .command('engines')
      .description('List available scraping engines')
      .action(() => {
        this.listEngines();
      });

    listCmd
      .command('browsers')
      .description('List available browsers for Playwright')
      .action(() => {
        this.listBrowsers();
      });

    listCmd
      .command('formats')
      .description('List available output formats')
      .action(() => {
        this.listFormats();
      });

    listCmd
      .command('devices')
      .description('List available device emulations')
      .action(() => {
        this.listDevices();
      });
  }

  /**
   * Setup test command
   */
  private setupTestCommand(): void {
    this.program
      .command('test')
      .description('Test scraping configuration')
      .argument('<url>', 'URL to test')
      .option('-c, --config <path>', 'Configuration file path')
      .option('-e, --engine <engine>', 'Engine to test', 'cheerio')
      .option('--dry-run', 'Dry run without making requests', false)
      .action(async (url, options) => {
        try {
          await this.handleTestCommand(url, options);
        } catch (error) {
          this.handleError(error);
        }
      });
  }

  /**
   * Setup documentation command
   */
  private setupDocsCommand(): void {
    this.program
      .command('docs')
      .description('Open documentation')
      .option('--offline', 'Show offline documentation', false)
      .action((options) => {
        this.handleDocsCommand(options);
      });
  }

  /**
   * Handle scrape command
   */
  private async handleScrapeCommand(urlInput: string, options: any): Promise<void> {
    const urls = urlInput.split(',').map((u) => u.trim());

    console.log(`🚀 Starting scraping with ${options.engine} engine...`);
    console.log(`📄 URLs: ${urls.length}`);

    const config = this.buildConfigFromOptions(urls, options);
    const engine = ScrapingEngineFactory.createEngine(config);

    // Setup progress monitoring
    engine.on('progress', (event: ProgressEvent) => {
      const { progress } = event;
      const percentage = Math.round(progress.percentage);
      const eta = progress.eta ? ` (ETA: ${Math.round(progress.eta / 1000)}s)` : '';
      console.log(`⏳ Progress: ${percentage}% (${progress.completed}/${progress.total})${eta}`);
    });

    engine.on('url_end', (event: any) => {
      if (event.success) {
        console.log(`✅ Scraped: ${event.url}`);
      } else {
        console.log(`❌ Failed: ${event.url} - ${event.error?.message}`);
      }
    });

    const result = await engine.scrape();
    await this.outputResult(result, options);

    console.log(`\n🎉 Scraping completed!`);
    console.log(
      `📊 Summary: ${result.summary.successfulExtractions}/${result.summary.totalUrls} successful`
    );
    if (result.summary.failedExtractions > 0) {
      console.log(`⚠️  Failed: ${result.summary.failedExtractions} URLs`);
    }
  }

  /**
   * Handle bulk command
   */
  private async handleBulkCommand(options: any): Promise<void> {
    let urls: string[] = [];

    if (options.input) {
      urls = await this.readUrlsFromFile(options.input);
    } else if (options.pattern && options.range) {
      urls = this.generateUrlsFromPattern(options.pattern, options.range);
    } else {
      throw new Error('Either --input or --pattern with --range must be specified');
    }

    console.log(`🚀 Starting bulk scraping...`);
    console.log(`📄 URLs: ${urls.length}`);
    console.log(`🔧 Concurrency: ${options.concurrency}`);

    const config = this.buildBulkConfigFromOptions(urls, options);
    const engine = ScrapingEngineFactory.createEngine(config);

    // Setup enhanced progress monitoring for bulk operations
    if (options.progress) {
      this.setupProgressBar(engine);
    }

    const result = await engine.scrape();
    await this.outputResult(result, options);

    console.log(`\n🎉 Bulk scraping completed!`);
    console.log(
      `📊 Summary: ${result.summary.successfulExtractions}/${result.summary.totalUrls} successful`
    );
    console.log(`⏱️  Total time: ${Math.round(result.summary.processingTime / 1000)}s`);
    console.log(`🚄 Average time per URL: ${Math.round(result.summary.averageTimePerUrl)}ms`);
  }

  /**
   * Handle config init command
   */
  private async handleConfigInit(options: any): Promise<void> {
    const config = this.getConfigTemplate(options.template);
    const configPath = resolve(options.output);

    if (existsSync(configPath)) {
      const answer = await this.confirm(
        `Configuration file ${configPath} already exists. Overwrite?`
      );
      if (!answer) {
        console.log('❌ Operation cancelled');
        return;
      }
    }

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Configuration file created: ${configPath}`);
    console.log(`💡 Edit the file to customize your scraping configuration`);
  }

  /**
   * Handle config validate command
   */
  private async handleConfigValidate(path: string): Promise<void> {
    try {
      const config = this.loadConfig(path);
      this.validateConfig(config);
      console.log('✅ Configuration is valid');
    } catch (error) {
      console.log('❌ Configuration validation failed:');
      console.log(`   ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Handle config show command
   */
  private async handleConfigShow(path: string): Promise<void> {
    try {
      const config = this.loadConfig(path);
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.log(`❌ Failed to load configuration: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Handle test command
   */
  private async handleTestCommand(url: string, options: any): Promise<void> {
    console.log(`🧪 Testing scraping configuration for: ${url}`);

    let config: BaseScrapingConfig;

    if (options.config) {
      config = this.loadConfig(options.config);
      config.url = url;
    } else {
      config = this.buildConfigFromOptions([url], {
        ...options,
        engine: options.engine,
      });
    }

    if (options.dryRun) {
      console.log('🔍 Dry run - configuration preview:');
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    try {
      const engine = ScrapingEngineFactory.createEngine(config);
      const result = await engine.scrape();

      console.log('✅ Test successful!');
      console.log(`📊 Extracted ${Object.keys(result.data[0]?.data || {}).length} fields`);
      console.log('🔍 Sample data:');
      console.log(JSON.stringify(result.data[0]?.data || {}, null, 2));
    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Handle docs command
   */
  private handleDocsCommand(options: any): void {
    if (options.offline) {
      this.showOfflineDocs();
    } else {
      console.log('📚 Opening documentation...');
      console.log('🌐 Visit: https://github.com/swcstudio/katalyst/tree/main/docs/scraper');
    }
  }

  /**
   * Build configuration from command options
   */
  private buildConfigFromOptions(urls: string[], options: any): BaseScrapingConfig {
    const extraction = this.buildExtractionConfig(options);

    return {
      url: urls.length === 1 ? urls[0] : urls,
      engine: options.engine as ScrapingEngine,
      output: {
        format: options.format as OutputFormat,
        filePath: options.output,
        prettyPrint: options.pretty,
      },
      request: {
        timeout: Number.parseInt(options.timeout),
        userAgent: options.userAgent,
        headers: options.headers ? JSON.parse(options.headers) : undefined,
        cookies: options.cookies ? JSON.parse(options.cookies) : undefined,
      },
      browser:
        options.engine === 'playwright'
          ? {
              type: options.browser as BrowserType,
              headless: options.headless,
              screenshot: options.screenshot
                ? {
                    enabled: true,
                    pathTemplate: options.screenshotPath,
                  }
                : undefined,
              wait: {
                selector: options.waitSelector,
                text: options.waitText,
                networkIdle: options.waitNetwork,
              },
            }
          : undefined,
      rateLimit: {
        delay: Number.parseInt(options.delay) || undefined,
      },
      retry: {
        maxRetries: Number.parseInt(options.retries),
      },
      proxy: options.proxy
        ? {
            server: options.proxy,
          }
        : undefined,
      extraction,
    };
  }

  /**
   * Build bulk configuration from options
   */
  private buildBulkConfigFromOptions(urls: string[], options: any): BaseScrapingConfig {
    const baseConfig = this.buildConfigFromOptions(urls, options);

    baseConfig.bulk = {
      enabled: true,
      concurrency: Number.parseInt(options.concurrency),
      batchSize: Number.parseInt(options.batchSize),
      progress: {
        enabled: options.progress,
        format: 'bar',
      },
    };

    if (options.splitFiles) {
      baseConfig.output.splitFiles = true;
      baseConfig.output.maxFileSize = Number.parseInt(options.maxFileSize) * 1024 * 1024; // MB to bytes
    }

    return baseConfig;
  }

  /**
   * Build extraction configuration
   */
  private buildExtractionConfig(options: any) {
    const rules: ExtractionRule[] = [];

    if (options.selector) {
      rules.push({
        name: 'extracted_data',
        selector: options.selector,
        attribute: options.attribute || 'text',
        type: options.type || 'text',
        required: options.required || false,
        multiple: options.multiple || false,
      });
    } else {
      // Default extraction rules
      rules.push(
        {
          name: 'title',
          selector: 'title',
          attribute: 'text',
          type: 'text',
        },
        {
          name: 'description',
          selector: 'meta[name="description"]',
          attribute: 'content',
          type: 'text',
        },
        {
          name: 'h1',
          selector: 'h1',
          attribute: 'text',
          type: 'text',
          multiple: true,
        }
      );
    }

    return {
      rules,
      textProcessing: {
        trim: true,
        normalizeWhitespace: true,
        stripHtml: false,
      },
    };
  }

  /**
   * Read URLs from file
   */
  private async readUrlsFromFile(filePath: string): Promise<string[]> {
    const content = readFileSync(resolve(filePath), 'utf-8');
    const ext = filePath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'json':
        const jsonData = JSON.parse(content);
        return Array.isArray(jsonData) ? jsonData : jsonData.urls || [];

      case 'csv':
        return content
          .split('\n')
          .map((line) => line.split(',')[0])
          .filter((url) => url && url.trim())
          .map((url) => url.trim());

      default:
        return content
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => line.trim());
    }
  }

  /**
   * Generate URLs from pattern
   */
  private generateUrlsFromPattern(pattern: string, range: string): string[] {
    const urls: string[] = [];

    if (range.includes('-')) {
      const [start, end] = range.split('-');

      if (!isNaN(Number(start)) && !isNaN(Number(end))) {
        // Numeric range
        for (let i = Number.parseInt(start); i <= Number.parseInt(end); i++) {
          urls.push(pattern.replace('{id}', i.toString()));
        }
      } else {
        // Character range
        const startCode = start.charCodeAt(0);
        const endCode = end.charCodeAt(0);
        for (let i = startCode; i <= endCode; i++) {
          urls.push(pattern.replace('{id}', String.fromCharCode(i)));
        }
      }
    }

    return urls;
  }

  /**
   * Setup progress bar for bulk operations
   */
  private setupProgressBar(engine: any): void {
    let lastUpdate = 0;

    engine.on('progress', (event: ProgressEvent) => {
      const now = Date.now();
      if (now - lastUpdate > 1000) {
        // Update every second
        const { progress } = event;
        const percentage = Math.round(progress.percentage);
        const completed = progress.completed;
        const total = progress.total;
        const failed = progress.failed;

        const bar =
          '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
        const eta = progress.eta ? ` ETA: ${Math.round(progress.eta / 1000)}s` : '';

        process.stdout.write(
          `\r[${bar}] ${percentage}% (${completed}/${total}) Failed: ${failed}${eta}`
        );
        lastUpdate = now;
      }
    });

    engine.on('session_end', () => {
      process.stdout.write('\n');
    });
  }

  /**
   * Output scraping result
   */
  private async outputResult(result: ScrapingResult, options: any): Promise<void> {
    const outputPath = options.output;

    if (!outputPath) {
      // Output to console
      if (options.format === 'json') {
        console.log(JSON.stringify(result.data, null, options.pretty ? 2 : 0));
      } else {
        console.log(result.data);
      }
      return;
    }

    const resolvedPath = resolve(outputPath);

    switch (options.format) {
      case 'json':
        writeFileSync(resolvedPath, JSON.stringify(result.data, null, options.pretty ? 2 : 0));
        break;
      case 'csv':
        writeFileSync(resolvedPath, this.convertToCSV(result.data));
        break;
      case 'xml':
        writeFileSync(resolvedPath, this.convertToXML(result.data));
        break;
      case 'yaml':
        writeFileSync(resolvedPath, this.convertToYAML(result.data));
        break;
      default:
        writeFileSync(resolvedPath, JSON.stringify(result.data, null, 2));
    }

    console.log(`💾 Results saved to: ${resolvedPath}`);
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0].data);
    const csvRows = [headers.join(',')];

    for (const item of data) {
      const row = headers.map((header) => {
        const value = item.data[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: any[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<results>\n';

    for (const item of data) {
      xml += '  <item>\n';
      xml += `    <url>${item.url}</url>\n`;
      xml += `    <timestamp>${item.timestamp}</timestamp>\n`;
      xml += '    <data>\n';

      for (const [key, value] of Object.entries(item.data)) {
        xml += `      <${key}>${value}</${key}>\n`;
      }

      xml += '    </data>\n';
      xml += '  </item>\n';
    }

    xml += '</results>';
    return xml;
  }

  /**
   * Convert data to YAML format
   */
  private convertToYAML(data: any[]): string {
    // Simple YAML conversion
    let yaml = '---\nresults:\n';

    for (const item of data) {
      yaml += `  - url: "${item.url}"\n`;
      yaml += `    timestamp: "${item.timestamp}"\n`;
      yaml += '    data:\n';

      for (const [key, value] of Object.entries(item.data)) {
        yaml += `      ${key}: "${value}"\n`;
      }
    }

    return yaml;
  }

  /**
   * Load configuration from file
   */
  private loadConfig(path: string): BaseScrapingConfig {
    try {
      const content = readFileSync(resolve(path), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load configuration from ${path}: ${error.message}`);
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: BaseScrapingConfig): void {
    if (!config.url) {
      throw new Error('URL is required');
    }

    if (!config.engine) {
      throw new Error('Engine is required');
    }

    if (!ScrapingEngineFactory.isEngineSupported(config.engine)) {
      throw new Error(`Unsupported engine: ${config.engine}`);
    }

    if (!config.extraction?.rules?.length) {
      throw new Error('At least one extraction rule is required');
    }
  }

  /**
   * Get configuration template
   */
  private getConfigTemplate(template: string): BaseScrapingConfig {
    const baseConfig = {
      url: 'https://example.com',
      engine: 'cheerio' as ScrapingEngine,
      output: {
        format: 'json' as OutputFormat,
        prettyPrint: true,
      },
      extraction: {
        rules: [
          {
            name: 'title',
            selector: 'title',
            attribute: 'text',
            type: 'text' as const,
          },
        ],
      },
    };

    switch (template) {
      case 'advanced':
        return {
          ...baseConfig,
          engine: 'playwright',
          browser: {
            type: 'chromium' as BrowserType,
            headless: true,
            wait: {
              networkIdle: true,
            },
          },
          extraction: {
            rules: [
              {
                name: 'title',
                selector: 'title',
                attribute: 'text',
                type: 'text' as const,
              },
              {
                name: 'links',
                selector: 'a[href]',
                attribute: 'href',
                type: 'url' as const,
                multiple: true,
              },
            ],
            textProcessing: {
              trim: true,
              normalizeWhitespace: true,
            },
          },
        };

      case 'bulk':
        return {
          ...baseConfig,
          bulk: {
            enabled: true,
            concurrency: 5,
            batchSize: 10,
            progress: {
              enabled: true,
              format: 'bar' as const,
            },
          },
        };

      default:
        return baseConfig;
    }
  }

  /**
   * List available engines
   */
  private listEngines(): void {
    console.log('Available scraping engines:');
    console.log('  📄 cheerio    - Fast static HTML parsing (default)');
    console.log('  🎭 playwright - Dynamic content with browser automation');
    console.log('  🤖 puppeteer - Chrome-based browser automation');
    console.log('  🔀 hybrid     - Intelligent engine selection');
  }

  /**
   * List available browsers
   */
  private listBrowsers(): void {
    console.log('Available browsers for Playwright:');
    console.log('  🌐 chromium - Google Chromium (default)');
    console.log('  🦊 firefox  - Mozilla Firefox');
    console.log('  🧭 webkit   - Safari WebKit');
  }

  /**
   * List available output formats
   */
  private listFormats(): void {
    console.log('Available output formats:');
    console.log('  📄 json     - JavaScript Object Notation (default)');
    console.log('  📊 csv      - Comma Separated Values');
    console.log('  🏷️  xml      - eXtensible Markup Language');
    console.log("  📝 yaml     - YAML Ain't Markup Language");
    console.log('  🌐 html     - HyperText Markup Language');
    console.log('  📑 markdown - Markdown format');
  }

  /**
   * List available devices
   */
  private listDevices(): void {
    console.log('Available device emulations for Playwright:');
    console.log('  📱 iPhone 12 Pro');
    console.log('  📱 iPhone 13');
    console.log('  📱 iPhone 14');
    console.log('  📟 iPad');
    console.log('  📟 iPad Pro');
    console.log('  🤖 Pixel 5');
    console.log('  🤖 Galaxy S21');
    console.log('  💻 Desktop Chrome');
    console.log('  💻 Desktop Firefox');
    console.log('  💻 Desktop Safari');
  }

  /**
   * Show offline documentation
   */
  private showOfflineDocs(): void {
    console.log(`
📚 Katalyst Web Scraper Documentation

🚀 Quick Start:
  katalyst-scraper scrape https://example.com
  katalyst-scraper scrape https://example.com --selector "h1" --attribute text

🔧 Engines:
  cheerio    - Fast static HTML parsing
  playwright - Dynamic content with browser automation
  puppeteer  - Chrome-based automation
  hybrid     - Intelligent engine selection

📊 Output Formats:
  json, csv, xml, yaml, html, markdown

🎛️  Advanced Features:
  - Rate limiting and retry logic
  - Proxy support
  - Cookie management
  - Screenshot capture
  - Device emulation
  - Custom headers and user agents

📖 Examples:
  # Basic scraping
  katalyst-scraper scrape https://example.com

  # Advanced with Playwright
  katalyst-scraper scrape https://example.com -e playwright --browser firefox --screenshot

  # Bulk scraping
  katalyst-scraper bulk -i urls.txt --concurrency 10

  # Configuration file
  katalyst-scraper config init --template advanced
  katalyst-scraper scrape https://example.com -c scraper.config.json

🔗 More Info: https://github.com/swcstudio/katalyst/tree/main/docs/scraper
    `);
  }

  /**
   * Simple confirmation prompt
   */
  private async confirm(message: string): Promise<boolean> {
    // In a real implementation, you'd use a proper CLI prompt library
    // For now, we'll assume yes for non-interactive environments
    console.log(`${message} (y/N)`);
    return true; // Simplified for this example
  }

  /**
   * Handle CLI errors
   */
  private handleError(error: any): void {
    console.error(`❌ Error: ${error.message}`);

    if (process.env.LOG_LEVEL === 'debug') {
      console.error('\n🔍 Stack trace:');
      console.error(error.stack);
    }

    console.error('\n💡 Tips:');
    console.error('  - Check your URL and network connection');
    console.error('  - Verify your configuration file syntax');
    console.error('  - Use --debug for more details');
    console.error('  - See: katalyst-scraper docs --offline');

    process.exit(1);
  }

  /**
   * Run the CLI application
   */
  async run(argv?: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      this.handleError(error);
    }
  }
}

/**
 * Main CLI entry point
 */
export async function runCLI(argv?: string[]): Promise<void> {
  const cli = new ScraperCLI();
  await cli.run(argv);
}

// Export for use as a module
export { ScraperCLI };

// Run CLI if this file is executed directly
if (import.meta.main) {
  runCLI();
}
