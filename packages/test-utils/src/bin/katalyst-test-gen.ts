#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { AITestGenerator } from '../ai-test-generator';
import { ComponentTestGenerator } from '../component-test-generator';
import { CoverageAnalyzer } from '../coverage-analyzer';
import { VisualRegressionTester } from '../visual-regression';

const program = new Command();

program
  .name('katalyst-test-gen')
  .description('AI-powered test generation and analysis for Katalyst-React')
  .version('1.0.0');

// Generate tests command
program
  .command('generate <componentPath>')
  .description('Generate comprehensive tests for a React component')
  .option('-o, --output <path>', 'Output path for generated test file')
  .option('-t, --template <type>', 'Test template type', 'component')
  .option('--ai', 'Use AI for enhanced test generation', false)
  .action(async (componentPath, options) => {
    try {
      console.log(chalk.blue('🤖 Generating tests for:'), componentPath);

      if (options.ai) {
        const generator = new AITestGenerator();
        const componentInfo = await generator.analyzeComponent(componentPath);
        const testSuite = await generator.generateTests(componentInfo, options.template);

        const outputPath = options.output || componentPath.replace(/\.(tsx?)$/, '.test.$1');
        await writeFile(outputPath, testSuite.content);

        console.log(chalk.green('✅ Generated'), chalk.bold(testSuite.testCount), 'tests');
        console.log(chalk.green('📊 Estimated coverage:'), chalk.bold(`${testSuite.coverage}%`));
        console.log(chalk.green('📝 Test file:'), outputPath);
      } else {
        // Use standard component test generator
        const { generateTestFromFile } = await import('../component-test-generator');
        await generateTestFromFile(componentPath);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Generate test suite for directory
program
  .command('generate-suite <directory>')
  .description('Generate tests for all components in a directory')
  .option('-r, --recursive', 'Search recursively', true)
  .option('-t, --template <type>', 'Test template type', 'component')
  .option('--dry-run', 'Preview without writing files', false)
  .action(async (directory, options) => {
    try {
      console.log(chalk.blue('🔍 Scanning directory:'), directory);

      const generator = new AITestGenerator();
      const testSuites = await generator.generateTestSuite(directory, {
        recursive: options.recursive,
        template: options.template,
        output: !options.dryRun,
      });

      console.log(
        chalk.green('✅ Generated tests for'),
        chalk.bold(testSuites.length),
        'components'
      );

      const totalTests = testSuites.reduce((sum, suite) => sum + suite.testCount, 0);
      const avgCoverage =
        testSuites.reduce((sum, suite) => sum + suite.coverage, 0) / testSuites.length;

      console.log(chalk.green('📊 Total tests:'), chalk.bold(totalTests));
      console.log(chalk.green('📊 Average coverage:'), chalk.bold(`${avgCoverage.toFixed(1)}%`));
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Analyze coverage command
program
  .command('coverage [path]')
  .description('Analyze test coverage and generate reports')
  .option('-f, --format <type>', 'Report format (html, json, lcov, text)', 'html')
  .option('--threshold <percentage>', 'Coverage threshold', '80')
  .action(async (path = './coverage', options) => {
    try {
      console.log(chalk.blue('📊 Analyzing coverage...'));

      const analyzer = new CoverageAnalyzer();
      const coverage = await analyzer.analyzeCoverage(path);

      // Display summary
      console.log('\nCoverage Summary:');
      console.log(chalk.cyan('Statements:'), formatCoverage(coverage.statements));
      console.log(chalk.cyan('Branches:'), formatCoverage(coverage.branches));
      console.log(chalk.cyan('Functions:'), formatCoverage(coverage.functions));
      console.log(chalk.cyan('Lines:'), formatCoverage(coverage.lines));

      // Generate report
      const report = await analyzer.generateCoverageReport(path, options.format as any);

      if (options.format === 'html') {
        const reportPath = './coverage-report.html';
        await writeFile(reportPath, report);
        console.log(chalk.green('\n✅ Report generated:'), reportPath);
      } else {
        console.log('\n' + report);
      }

      // Check threshold
      const threshold = Number.parseFloat(options.threshold);
      const failed = Object.values(coverage).some((metric) => metric.percentage < threshold);

      if (failed) {
        console.error(chalk.red(`\n❌ Coverage below ${threshold}% threshold`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Visual regression testing command
program
  .command('visual <path>')
  .description('Run visual regression tests')
  .option('-n, --name <name>', 'Test name', 'visual-test')
  .option('-b, --browser <type>', 'Browser type (chromium, firefox, webkit)', 'chromium')
  .option('--update', 'Update baseline screenshots', false)
  .action(async (path, options) => {
    try {
      console.log(chalk.blue('📸 Running visual regression tests...'));

      const tester = new VisualRegressionTester({
        browsers: [options.browser],
      });

      await tester.setup(options.browser);

      try {
        const results = await tester.testPage(path, options.name);

        // Display results
        let passed = 0;
        let failed = 0;

        results.forEach((result, name) => {
          if (result.passed) {
            console.log(chalk.green('✅'), name);
            passed++;
          } else {
            console.log(
              chalk.red('❌'),
              name,
              chalk.gray(`(${result.diffPercentage.toFixed(2)}% diff)`)
            );
            failed++;
          }
        });

        console.log(`\nTotal: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);

        // Generate report
        if (failed > 0) {
          const reportPath = await tester.generateReport(results);
          console.log(chalk.yellow('\n📄 Visual diff report:'), reportPath);
          process.exit(1);
        }
      } finally {
        await tester.teardown();
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Suggest improvements command
program
  .command('suggest <testFile>')
  .description('Get AI-powered suggestions for test improvements')
  .action(async (testFile) => {
    try {
      console.log(chalk.blue('💡 Analyzing test file for improvements...'));

      const generator = new AITestGenerator();
      const suggestions = await generator.suggestTestImprovements(testFile);

      console.log(chalk.green('\n✨ Improvement suggestions:\n'));

      suggestions.forEach((suggestion, index) => {
        console.log(chalk.cyan(`${index + 1}.`), suggestion);
      });

      if (suggestions.length === 0) {
        console.log(chalk.green('✅ No improvements needed - great job!'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Generate mock data command
program
  .command('mock <schemaFile>')
  .description('Generate realistic mock data from schema')
  .option('-c, --count <number>', 'Number of items to generate', '10')
  .option('-o, --output <path>', 'Output file path')
  .action(async (schemaFile, options) => {
    try {
      console.log(chalk.blue('🎭 Generating mock data...'));

      const schemaContent = await readFile(schemaFile, 'utf-8');
      const schema = JSON.parse(schemaContent);

      const generator = new AITestGenerator();
      const mockData = await generator.generateMockData(schema, Number.parseInt(options.count));

      const output = JSON.stringify(mockData, null, 2);

      if (options.output) {
        await writeFile(options.output, output);
        console.log(chalk.green('✅ Mock data saved to:'), options.output);
      } else {
        console.log('\n' + output);
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error.message);
      process.exit(1);
    }
  });

// Helper function to format coverage
function formatCoverage(metric: { percentage: number; covered: number; total: number }): string {
  const color =
    metric.percentage >= 80 ? chalk.green : metric.percentage >= 60 ? chalk.yellow : chalk.red;

  return `${color(metric.percentage.toFixed(1) + '%')} (${metric.covered}/${metric.total})`;
}

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
