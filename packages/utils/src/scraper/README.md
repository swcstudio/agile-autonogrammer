# 🕷️ Katalyst Web Scraper

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Deno](https://img.shields.io/badge/Deno-000000?style=for-the-badge&logo=deno&logoColor=white)](https://deno.land/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

**State-of-the-art TypeScript web scraping tool with enterprise-grade features for the modern web.**

Katalyst Web Scraper is a comprehensive, high-performance web scraping solution built for the Katalyst framework. It combines multiple scraping engines, advanced automation capabilities, and enterprise-grade features to handle any web scraping challenge.

## ✨ Features

### 🔧 **Multiple Scraping Engines**
- **Cheerio**: Lightning-fast static HTML parsing with jQuery-like API
- **Playwright**: Multi-browser automation for dynamic content (Chromium, Firefox, WebKit)
- **Puppeteer**: Chrome-based automation with advanced stealth features
- **Hybrid**: Intelligent engine selection based on page complexity

### 🚀 **Advanced Capabilities**
- **Bulk Scraping**: Concurrent processing with configurable batch sizes
- **Rate Limiting**: Sophisticated throttling to respect server limits
- **Retry Logic**: Exponential backoff with configurable retry strategies
- **Proxy Support**: Rotating proxies with authentication
- **Stealth Mode**: Anti-detection features for challenging websites
- **Screenshot Capture**: Full-page and element-specific screenshots
- **Device Emulation**: Mobile and desktop viewport simulation

### 📊 **Data Processing**
- **Smart Extraction**: CSS selectors, XPath, and text-based targeting
- **Type Conversion**: Automatic conversion to numbers, dates, URLs, emails
- **Text Processing**: Normalization, cleaning, and transformation
- **Nested Extraction**: Complex data structures with nested rules
- **Custom Transformations**: Regex and custom function support

### 🔄 **Output Formats**
- JSON (pretty-printed or minified)
- CSV with automatic header detection
- XML with CDATA support
- YAML format
- HTML tables
- Markdown format

### 🛠️ **Developer Experience**
- **CLI Interface**: Comprehensive command-line tool
- **TypeScript API**: Fully typed programmatic interface
- **Configuration Files**: JSON-based configuration management
- **Plugin System**: Extensible architecture with hooks
- **Progress Tracking**: Real-time progress bars and ETA
- **Error Handling**: Detailed error reporting and recovery

## 🚀 Quick Start

### Installation

```bash
# Using npm
npm install @katalyst/scraper

# Using yarn
yarn add @katalyst/scraper

# Using deno
deno add npm:@katalyst/scraper
```

### Basic Usage

```typescript
import { scrapeUrl } from '@katalyst/scraper';

// Simple scraping
const result = await scrapeUrl('https://example.com');
console.log(result.data);

// Custom selectors
const result = await scrapeUrl('https://example.com', {
  selectors: {
    title: 'h1',
    price: '.price',
    description: '.description'
  }
});
```

### CLI Usage

```bash
# Install CLI globally
npm install -g @katalyst/scraper

# Basic scraping
katalyst-scraper scrape https://example.com

# Advanced scraping with Playwright
katalyst-scraper scrape https://example.com \
  --engine playwright \
  --browser firefox \
  --screenshot \
  --wait-network

# Bulk scraping
katalyst-scraper bulk \
  --input urls.txt \
  --concurrency 10 \
  --output results.json
```

## 📖 API Documentation

### Core Functions

#### `scrapeUrl(url, options)`

Scrape a single URL with minimal configuration.

```typescript
import { scrapeUrl } from '@katalyst/scraper';

const result = await scrapeUrl('https://example.com', {
  engine: 'cheerio',           // 'cheerio' | 'playwright' | 'puppeteer'
  selectors: {                 // Custom CSS selectors
    title: 'h1',
    price: '.price'
  },
  outputFormat: 'json',        // 'json' | 'csv' | 'xml' | 'yaml'
  browser: 'chromium',         // 'chromium' | 'firefox' | 'webkit'
  headless: true,              // Run browser in headless mode
  timeout: 30000               // Request timeout in milliseconds
});
```

#### `scrapeUrls(urls, options)`

Bulk scrape multiple URLs with concurrency control.

```typescript
import { scrapeUrls } from '@katalyst/scraper';

const result = await scrapeUrls([
  'https://example.com/page1',
  'https://example.com/page2'
], {
  concurrency: 5,              // Number of concurrent requests
  delay: 1000,                 // Delay between requests
  selectors: {
    title: 'h1',
    content: '.content'
  }
});
```

#### `createScraper(config)`

Create a scraper instance with full configuration control.

```typescript
import { createScraper } from '@katalyst/scraper';

const scraper = createScraper({
  url: 'https://example.com',
  engine: 'playwright',
  browser: {
    type: 'chromium',
    headless: true,
    viewport: { width: 1920, height: 1080 },
    wait: {
      networkIdle: true,
      selector: '.content-loaded'
    }
  },
  extraction: {
    rules: [
      {
        name: 'products',
        selector: '.product',
        multiple: true,
        nested: [
          { name: 'name', selector: '.title', attribute: 'text' },
          { name: 'price', selector: '.price', attribute: 'text', type: 'number' },
          { name: 'image', selector: 'img', attribute: 'src', type: 'url' }
        ]
      }
    ]
  }
});

const result = await scraper.scrape();
```

### Built-in Extraction Rules

The scraper includes predefined extraction rules for common use cases:

```typescript
import { ExtractionRules } from '@katalyst/scraper';

// Page metadata
const metadataRules = ExtractionRules.metadata();

// Open Graph tags
const ogRules = ExtractionRules.openGraph();

// Twitter Card tags
const twitterRules = ExtractionRules.twitterCard();

// E-commerce product data
const productRules = ExtractionRules.product();

// Blog/article content
const articleRules = ExtractionRules.article();

// All links and images
const linkRules = ExtractionRules.links();
const imageRules = ExtractionRules.images();
```

## 🛠️ CLI Reference

### Commands

#### `scrape <url>`

Scrape a single URL or multiple comma-separated URLs.

```bash
katalyst-scraper scrape https://example.com [options]
```

**Options:**
- `-e, --engine <engine>` - Scraping engine (cheerio, playwright, puppeteer)
- `-o, --output <path>` - Output file path
- `-f, --format <format>` - Output format (json, csv, xml, yaml)
- `--browser <browser>` - Browser type for Playwright (chromium, firefox, webkit)
- `--headless/--no-headless` - Run browser in headless mode
- `--timeout <ms>` - Request timeout in milliseconds
- `--delay <ms>` - Delay between requests
- `--retries <count>` - Maximum retry attempts
- `--proxy <url>` - Proxy server URL
- `--screenshot` - Take screenshots (Playwright only)
- `--selector <selector>` - CSS selector for data extraction
- `--attribute <attr>` - Attribute to extract
- `--multiple` - Extract multiple matches
- `--wait-selector <selector>` - Wait for selector before scraping
- `--wait-network` - Wait for network idle

#### `bulk`

Bulk scraping from files or URL patterns.

```bash
katalyst-scraper bulk [options]
```

**Options:**
- `-i, --input <path>` - Input file with URLs (CSV, JSON, or text)
- `-p, --pattern <pattern>` - URL pattern with placeholders
- `-r, --range <range>` - Range for pattern variables
- `-c, --concurrency <count>` - Concurrent requests
- `-b, --batch-size <size>` - Batch size
- `--split-files` - Split output into multiple files
- `--max-file-size <size>` - Maximum file size in MB
- `--progress/--no-progress` - Show/hide progress bar

#### `config`

Configuration management commands.

```bash
# Initialize configuration file
katalyst-scraper config init [--template <template>]

# Validate configuration
katalyst-scraper config validate <path>

# Show configuration
katalyst-scraper config show [path]
```

#### `list`

List available options.

```bash
# List available engines
katalyst-scraper list engines

# List available browsers
katalyst-scraper list browsers

# List available output formats
katalyst-scraper list formats

# List available device emulations
katalyst-scraper list devices
```

#### `test`

Test scraping configuration.

```bash
katalyst-scraper test <url> [options]
```

## ⚙️ Configuration

### Configuration File

Create a configuration file for complex scraping scenarios:

```bash
katalyst-scraper config init --template advanced
```

Example configuration:

```json
{
  "url": "https://example.com",
  "engine": "playwright",
  "browser": {
    "type": "chromium",
    "headless": true,
    "viewport": { "width": 1920, "height": 1080 },
    "wait": { "networkIdle": true }
  },
  "extraction": {
    "rules": [
      {
        "name": "title",
        "selector": "h1",
        "attribute": "text",
        "type": "text",
        "required": true
      }
    ]
  },
  "rateLimit": {
    "delay": 1000,
    "requestsPerSecond": 2
  },
  "retry": {
    "maxRetries": 3,
    "baseDelay": 1000
  }
}
```

### Environment Variables

```bash
# Debug mode
DEBUG=true

# Log level
LOG_LEVEL=debug

# Proxy settings
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080

# Browser settings
BROWSER_EXECUTABLE_PATH=/path/to/browser
```

## 🎯 Advanced Usage

### Custom Extraction Rules

```typescript
const customRules = [
  {
    name: 'product_data',
    selector: '.product-card',
    multiple: true,
    nested: [
      {
        name: 'name',
        selector: '.product-title',
        attribute: 'text',
        type: 'text',
        transform: [
          {
            type: 'regex',
            params: {
              pattern: '\\s+',
              replacement: ' ',
              flags: 'g'
            }
          }
        ]
      },
      {
        name: 'price',
        selector: '.price',
        attribute: 'text',
        type: 'number',
        transform: [
          {
            type: 'regex',
            params: {
              pattern: '[^0-9.]',
              replacement: '',
              flags: 'g'
            }
          }
        ]
      }
    ]
  }
];
```

### Proxy Rotation

```typescript
const scraper = createScraper({
  url: urls,
  proxy: {
    server: 'http://proxy1.example.com:8080',
    username: 'user',
    password: 'pass',
    rotate: true,
    proxyList: [
      'http://proxy1.example.com:8080',
      'http://proxy2.example.com:8080',
      'http://proxy3.example.com:8080'
    ]
  }
});
```

### Custom JavaScript Execution

```typescript
const scraper = createScraper({
  url: 'https://example.com',
  engine: 'playwright',
  browser: {
    wait: {
      customWait: `
        () => {
          return document.querySelectorAll('.product').length > 10;
        }
      `
    }
  }
});
```

### Event Handling

```typescript
const scraper = createScraper(config);

scraper.on('progress', (event) => {
  console.log(`Progress: ${event.progress.percentage}%`);
});

scraper.on('url_end', (event) => {
  if (event.success) {
    console.log(`✅ Scraped: ${event.url}`);
  } else {
    console.log(`❌ Failed: ${event.url}`);
  }
});

scraper.on('error', (event) => {
  console.error('Scraping error:', event.error);
});

const result = await scraper.scrape();
```

## 🔌 Plugin System

Create custom plugins to extend functionality:

```typescript
const customPlugin = {
  name: 'data-validator',
  version: '1.0.0',
  description: 'Validates extracted data',
  hooks: {
    afterDataExtraction: async (data) => {
      // Validate and transform data
      if (!data.title) {
        data.title = 'No title found';
      }
      return data;
    },
    onError: async (error) => {
      // Custom error handling
      console.log('Custom error handler:', error.message);
    }
  }
};

scraper.addPlugin(customPlugin);
```

## 📊 Examples

### E-commerce Product Scraping

```bash
katalyst-scraper scrape "https://shop.example.com/products" \
  --engine playwright \
  --selector ".product-card" \
  --multiple \
  --screenshot \
  --output products.json
```

### News Article Extraction

```typescript
import { scrapeUrl, ExtractionRules } from '@katalyst/scraper';

const result = await scrapeUrl('https://news.example.com/article/123', {
  engine: 'playwright',
  selectors: {
    ...ExtractionRules.article(),
    readingTime: '.reading-time',
    tags: '.tags a'
  }
});
```

### Bulk Documentation Scraping

```bash
katalyst-scraper bulk \
  --pattern "https://docs.example.com/page/{id}" \
  --range "1-100" \
  --concurrency 5 \
  --delay 2000 \
  --format markdown \
  --output docs/
```

## 🔧 Best Practices

### Performance Optimization

1. **Choose the Right Engine**
   - Use Cheerio for static content
   - Use Playwright for dynamic content
   - Use hybrid mode for mixed scenarios

2. **Rate Limiting**
   - Always implement delays between requests
   - Use random delays to appear more human-like
   - Respect robots.txt and server limits

3. **Error Handling**
   - Implement retry logic for transient failures
   - Log errors for debugging
   - Use circuit breakers for failing endpoints

### Stealth and Ethics

1. **Respectful Scraping**
   - Check robots.txt before scraping
   - Use appropriate delays
   - Limit concurrent requests

2. **Anti-Detection**
   - Rotate user agents
   - Use residential proxies
   - Implement random delays

3. **Legal Compliance**
   - Respect terms of service
   - Don't overload servers
   - Consider API alternatives first

## 🐛 Troubleshooting

### Common Issues

#### "Element not found" errors
```bash
# Wait for elements to load
katalyst-scraper scrape url --wait-selector ".content"

# Increase timeout
katalyst-scraper scrape url --timeout 60000
```

#### Rate limiting (429 errors)
```bash
# Increase delays
katalyst-scraper scrape url --delay 3000

# Reduce concurrency
katalyst-scraper bulk -i urls.txt --concurrency 2
```

#### JavaScript-heavy sites
```bash
# Use Playwright with network idle wait
katalyst-scraper scrape url --engine playwright --wait-network
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=true katalyst-scraper scrape url --debug
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/swcstudio/katalyst.git

# Navigate to scraper directory
cd katalyst/shared/src/scraper

# Install dependencies
deno cache deps.ts

# Run tests
deno test --allow-all

# Run CLI locally
deno run --allow-all bin/katalyst-scraper.ts
```

## 📄 License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Cheerio](https://cheerio.js.org/) - Server-side jQuery implementation
- [Playwright](https://playwright.dev/) - Cross-browser automation
- [Puppeteer](https://pptr.dev/) - Chrome automation
- [Commander.js](https://github.com/tj/commander.js/) - CLI framework

## 📞 Support

- 📖 [Documentation](https://docs.katalyst.dev/scraper)
- 🐛 [Bug Reports](https://github.com/swcstudio/katalyst/issues)
- 💬 [Discussions](https://github.com/swcstudio/katalyst/discussions)
- 📧 [Email Support](mailto:support@katalyst.dev)

---

**Built with ❤️ by the Katalyst team**

*Making web scraping accessible, powerful, and ethical.*