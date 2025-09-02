#!/usr/bin/env node

import { Command } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { DependencyAuditor } from './dependency-auditor.js';
import { SecurityScanner } from './security-scanner.js';
import { IntegrationTester } from './integration-tester.js';
import { MonitoringDaemon } from './monitoring-daemon.js';

const program = new Command();

program
  .name('katalyst-integration-tools')
  .description('Katalyst Integration Management Tools')
  .version('1.0.0');

// Dependency management commands
const depCommand = program
  .command('dep')
  .description('Dependency management tools');

depCommand
  .command('audit')
  .description('Audit integration dependencies')
  .option('-f, --format <format>', 'Output format (json, csv, html)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('--fix', 'Automatically fix issues where possible')
  .action(async (options) => {
    console.log('🔍 Auditing integration dependencies...');
    
    const auditor = new DependencyAuditor();
    await auditor.initialize();
    
    const report = await auditor.auditIntegrations();
    
    console.log('\n📊 Dependency Audit Results:');
    console.log(`Total packages: ${report.summary.totalPackages}`);
    console.log(`Conflicts: ${report.summary.conflicts}`);
    console.log(`Outdated: ${report.summary.outdated}`);
    console.log(`Vulnerable: ${report.summary.vulnerable}`);
    console.log(`Duplicates: ${report.summary.duplicates}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      for (const rec of report.recommendations.slice(0, 5)) {
        console.log(`- ${rec.description}`);
      }
    }
    
    if (options.output) {
      const exportedData = await auditor.exportReport(report, options.format);
      await writeFile(resolve(process.cwd(), options.output), exportedData);
      console.log(`\n📄 Report exported to ${options.output}`);
    }
    
    if (options.fix && report.recommendations.some(r => r.type === 'update')) {
      console.log('\n🔧 Applying automatic fixes...');
      const fixable = report.recommendations.filter(r => r.type === 'update');
      console.log(`Would fix ${fixable.length} issues`);
    }
    
    process.exit(0);
  });

depCommand
  .command('resolve')
  .description('Resolve dependency conflicts')
  .option('-p, --package <name>', 'Specific package to resolve')
  .option('--dry-run', 'Show what would be changed without making changes')
  .action(async (options) => {
    console.log('🔧 Resolving dependency conflicts...');
    
    const auditor = new DependencyAuditor();
    await auditor.initialize();
    
    const report = await auditor.auditIntegrations();
    const conflicts = report.conflicts;
    
    if (conflicts.length === 0) {
      console.log('✅ No conflicts found!');
      return;
    }
    
    console.log(`\n⚠️ Found ${conflicts.length} conflicts:`);
    for (const conflict of conflicts) {
      console.log(`- ${conflict.package}: ${conflict.versions.join(' vs ')}`);
      console.log(`  Affected integrations: ${conflict.affectedIntegrations.join(', ')}`);
      
      if (conflict.resolution) {
        console.log(`  Suggested resolution: ${conflict.resolution.action} to ${conflict.resolution.version}`);
        
        if (!options.dryRun) {
          console.log(`  ${options.dryRun ? 'Would apply' : 'Applying'} resolution...`);
        }
      }
    }
    
    if (options.dryRun) {
      console.log('\n🔍 This was a dry run. Use --no-dry-run to apply changes.');
    }
    
    process.exit(0);
  });

// Security scanning commands
const secCommand = program
  .command('security')
  .alias('sec')
  .description('Security scanning and vulnerability management');

secCommand
  .command('scan')
  .description('Scan integrations for security vulnerabilities')
  .option('-f, --format <format>', 'Output format (json, html, sarif)', 'json')
  .option('-o, --output <file>', 'Output file path')
  .option('--severity <level>', 'Minimum severity level (low, medium, high, critical)', 'low')
  .action(async (options) => {
    console.log('🔍 Scanning integrations for security vulnerabilities...');
    
    const scanner = new SecurityScanner();
    await scanner.initialize();
    
    const report = await scanner.scanIntegrations();
    
    console.log('\n🛡️ Security Scan Results:');
    console.log(`Total vulnerabilities: ${report.summary.totalVulnerabilities}`);
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`High: ${report.summary.high}`);
    console.log(`Medium: ${report.summary.medium}`);
    console.log(`Low: ${report.summary.low}`);
    console.log(`Fixable: ${report.summary.fixable}`);
    console.log(`Compliance: ${report.compliance.status}`);
    console.log(`Risk Score: ${report.trends.riskScore}`);
    
    if (report.vulnerabilities.length > 0) {
      console.log('\n🚨 Vulnerabilities by Severity:');
      const criticalVulns = report.vulnerabilities.filter(v => v.severity === 'critical');
      if (criticalVulns.length > 0) {
        console.log(`\n🔴 Critical (${criticalVulns.length}):`);
        criticalVulns.slice(0, 3).forEach(v => {
          console.log(`  - ${v.package}@${v.version}: ${v.title} (${v.id})`);
        });
      }
      
      const highVulns = report.vulnerabilities.filter(v => v.severity === 'high');
      if (highVulns.length > 0) {
        console.log(`\n🟡 High (${highVulns.length}):`);
        highVulns.slice(0, 3).forEach(v => {
          console.log(`  - ${v.package}@${v.version}: ${v.title} (${v.id})`);
        });
      }
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Security Recommendations:');
      for (const rec of report.recommendations.slice(0, 5)) {
        console.log(`- ${rec.description}`);
      }
    }
    
    if (options.output) {
      const exportedData = await scanner.exportReport(report, options.format);
      await writeFile(resolve(process.cwd(), options.output), exportedData);
      console.log(`\n📄 Report exported to ${options.output}`);
    }
    
    // Exit with error code if critical vulnerabilities found
    if (report.summary.critical > 0) {
      console.log('\n❌ Critical vulnerabilities detected. Failing build.');
      process.exit(1);
    }
    
    process.exit(0);
  });

secCommand
  .command('dashboard')
  .description('Show security dashboard')
  .action(async () => {
    console.log('📊 Security Dashboard\n');
    
    const scanner = new SecurityScanner();
    await scanner.initialize();
    
    const dashboard = await scanner.getSecurityDashboard();
    
    if (!dashboard) {
      console.log('No security data available. Run a scan first.');
      return;
    }
    
    console.log(`Last Scan: ${dashboard.lastScanDate}`);
    console.log(`Next Scan: ${dashboard.nextScanDate}`);
    console.log(`Compliance: ${dashboard.compliance.status} (${dashboard.compliance.complianceScore}%)`);
    console.log(`Risk Score: ${dashboard.riskScore}`);
    console.log(`Active Alerts: ${dashboard.activeAlerts} (${dashboard.criticalAlerts} critical)`);
    
    if (dashboard.recommendations.length > 0) {
      console.log('\nTop Recommendations:');
      dashboard.recommendations.forEach((rec: any) => {
        console.log(`- ${rec.description}`);
      });
    }
  });

// Testing commands
const testCommand = program
  .command('test')
  .description('Integration testing tools');

testCommand
  .command('run')
  .description('Run integration test suite')
  .option('-i, --integration <name>', 'Test specific integration')
  .option('-t, --type <type>', 'Test type (unit, integration, e2e, performance)', 'unit')
  .option('-e, --env <env>', 'Test environment (node, browser, deno, bun)', 'node')
  .option('--coverage', 'Generate code coverage report')
  .action(async (options) => {
    console.log('🧪 Running integration tests...');
    
    const tester = new IntegrationTester();
    await tester.initialize();
    
    const testConfig = {
      types: options.type.split(','),
      environments: options.env.split(','),
      integrations: options.integration ? [options.integration] : undefined,
      generateCoverage: options.coverage,
    };
    
    const results = await tester.runTestSuite(testConfig);
    
    console.log('\n📊 Test Results:');
    console.log(`Total tests: ${results.summary.totalTests}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Skipped: ${results.summary.skipped}`);
    console.log(`Success rate: ${results.summary.successRate.toFixed(1)}%`);
    console.log(`Duration: ${results.summary.duration}ms`);
    
    if (results.failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      results.failedTests.slice(0, 5).forEach((test: any) => {
        console.log(`- ${test.integration}/${test.name}: ${test.error}`);
      });
    }
    
    if (options.coverage && results.coverage) {
      console.log('\n📊 Coverage Report:');
      console.log(`Overall: ${results.coverage.overall.toFixed(1)}%`);
      console.log(`Lines: ${results.coverage.lines.toFixed(1)}%`);
      console.log(`Functions: ${results.coverage.functions.toFixed(1)}%`);
      console.log(`Branches: ${results.coverage.branches.toFixed(1)}%`);
    }
    
    // Exit with error code if tests failed
    if (results.summary.failed > 0) {
      process.exit(1);
    }
    
    process.exit(0);
  });

testCommand
  .command('matrix')
  .description('Show compatibility matrix')
  .action(async () => {
    console.log('📋 Integration Compatibility Matrix\n');
    
    const tester = new IntegrationTester();
    await tester.initialize();
    
    const matrix = await tester.generateCompatibilityMatrix();
    
    // Display matrix as table
    const integrations = Object.keys(matrix);
    const environments = ['node', 'browser', 'deno', 'bun'];
    
    console.log('Integration'.padEnd(20), ...environments.map(e => e.padEnd(10)));
    console.log('-'.repeat(70));
    
    for (const integration of integrations.slice(0, 10)) {
      const row = [integration.padEnd(20)];
      for (const env of environments) {
        const compat = matrix[integration]?.environments?.[env];
        const symbol = compat === true ? '✅' : compat === false ? '❌' : '❓';
        row.push(symbol.padEnd(10));
      }
      console.log(row.join(''));
    }
  });

// Monitoring commands
const monitorCommand = program
  .command('monitor')
  .description('Monitoring and alerting tools');

monitorCommand
  .command('start')
  .description('Start monitoring daemon')
  .option('-c, --config <file>', 'Configuration file path')
  .option('-d, --daemon', 'Run as daemon (background process)')
  .action(async (options) => {
    console.log('🚀 Starting monitoring daemon...');
    
    let config = {};
    if (options.config) {
      try {
        const configData = await readFile(resolve(process.cwd(), options.config), 'utf-8');
        config = JSON.parse(configData);
      } catch (error) {
        console.error('❌ Failed to load config file:', error);
        process.exit(1);
      }
    }
    
    const daemon = new MonitoringDaemon(config);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await daemon.stop();
      process.exit(0);
    });
    
    try {
      await daemon.start();
      
      if (options.daemon) {
        console.log('📊 Monitoring daemon started in background mode');
        // In production, would properly daemonize the process
      } else {
        console.log('📊 Monitoring daemon started. Press Ctrl+C to stop.');
        
        // Export dashboard periodically
        setInterval(async () => {
          try {
            const dashboard = await daemon.exportDashboard('html');
            await writeFile(resolve(process.cwd(), 'monitoring-dashboard.html'), dashboard);
          } catch (error) {
            console.warn('Failed to update dashboard:', error);
          }
        }, 60000); // Update every minute
        
        // Keep the process running
        await new Promise(() => {}); // Never resolves
      }
    } catch (error) {
      console.error('❌ Failed to start monitoring daemon:', error);
      process.exit(1);
    }
  });

monitorCommand
  .command('status')
  .description('Show monitoring status')
  .action(async () => {
    console.log('📊 Monitoring Status\n');
    
    try {
      const statusPath = resolve(process.cwd(), '.katalyst', 'monitoring-status.json');
      const statusData = await readFile(statusPath, 'utf-8');
      const status = JSON.parse(statusData);
      
      console.log(`Uptime: ${Math.floor(status.metrics.uptime / (1000 * 60 * 60))} hours`);
      console.log(`Scans completed: ${Object.values(status.metrics.scansCompleted).reduce((a: number, b: number) => a + b, 0)}`);
      console.log(`Active alerts: ${status.metrics.alerts.active}`);
      console.log(`Vulnerability trend: ${status.metrics.trends.vulnerabilityTrend}`);
      console.log(`Performance trend: ${status.metrics.trends.performanceTrend}`);
      
    } catch (error) {
      console.log('❌ No monitoring status found. Is the daemon running?');
    }
  });

monitorCommand
  .command('dashboard')
  .description('Export monitoring dashboard')
  .option('-f, --format <format>', 'Export format (html, json)', 'html')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    console.log('📊 Exporting monitoring dashboard...');
    
    try {
      // This would typically connect to a running daemon
      const daemon = new MonitoringDaemon();
      await daemon.start();
      
      const dashboard = await daemon.exportDashboard(options.format);
      
      const outputFile = options.output || `monitoring-dashboard.${options.format}`;
      await writeFile(resolve(process.cwd(), outputFile), dashboard);
      
      console.log(`✅ Dashboard exported to ${outputFile}`);
      
      await daemon.stop();
      
    } catch (error) {
      console.error('❌ Failed to export dashboard:', error);
      process.exit(1);
    }
  });

// Utility commands
program
  .command('init')
  .description('Initialize Katalyst integration tools')
  .option('--force', 'Overwrite existing configuration')
  .action(async (options) => {
    console.log('🔧 Initializing Katalyst integration tools...');
    
    const configDir = resolve(process.cwd(), '.katalyst');
    
    try {
      // Create default configuration files
      const defaultConfig = {
        monitoring: {
          intervals: {
            dependency: 4 * 60 * 60 * 1000,
            security: 2 * 60 * 60 * 1000,
            performance: 6 * 60 * 60 * 1000,
            integration: 8 * 60 * 60 * 1000,
          },
          thresholds: {
            dependency: { conflicts: 0, outdated: 10 },
            security: { critical: 0, high: 2, medium: 10 },
            performance: { bundleSize: 500000, loadTime: 3000, regression: 10 },
          },
          notifications: {},
          ci: { enabled: true, failOnCritical: true, failOnHigh: false },
          storage: { retention: 30, exportFormats: ['json', 'html'] },
        },
        integrations: {
          groups: {
            coreApp: ['rspack', 'tanstack', 'fast-refresh', 'tailwind', 'biome'],
            adminDashboard: ['rspack', 'tanstack', 'arco', 'zustand', 'clerk', 'playwright'],
            development: ['rspack', 'fast-refresh', 'biome', 'storybook', 'ngrok', 'inspector'],
            production: ['rspack', 'nx', 'asset-manifest', 'biome'],
          },
        },
      };
      
      const configPath = join(configDir, 'config.json');
      await writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      
      // Create gitignore entries
      const gitignorePath = resolve(process.cwd(), '.gitignore');
      try {
        const gitignoreContent = await readFile(gitignorePath, 'utf-8');
        if (!gitignoreContent.includes('.katalyst/')) {
          await writeFile(gitignorePath, gitignoreContent + '\n# Katalyst monitoring data\n.katalyst/\n');
        }
      } catch {
        await writeFile(gitignorePath, '# Katalyst monitoring data\n.katalyst/\n');
      }
      
      console.log('✅ Katalyst integration tools initialized!');
      console.log(`📁 Configuration saved to ${configPath}`);
      console.log('\n🚀 Quick start:');
      console.log('  katalyst-integration-tools dep audit');
      console.log('  katalyst-integration-tools security scan');
      console.log('  katalyst-integration-tools test run');
      console.log('  katalyst-integration-tools monitor start');
      
    } catch (error) {
      console.error('❌ Failed to initialize tools:', error);
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Check system health and configuration')
  .action(async () => {
    console.log('🩺 Running system health check...\n');
    
    const checks = [];
    
    // Check Node.js version
    const nodeVersion = process.version;
    const minNodeVersion = '18.0.0';
    checks.push({
      name: 'Node.js version',
      status: nodeVersion >= `v${minNodeVersion}` ? 'pass' : 'fail',
      message: `${nodeVersion} (minimum: v${minNodeVersion})`,
    });
    
    // Check for configuration file
    try {
      await readFile(resolve(process.cwd(), '.katalyst', 'config.json'), 'utf-8');
      checks.push({
        name: 'Configuration file',
        status: 'pass',
        message: 'Found .katalyst/config.json',
      });
    } catch {
      checks.push({
        name: 'Configuration file',
        status: 'warn',
        message: 'No config found. Run `katalyst-integration-tools init` to create one.',
      });
    }
    
    // Check for integration files
    try {
      await readFile(resolve(process.cwd(), 'packages', 'integrations', 'src', 'integrations', 'index.ts'), 'utf-8');
      checks.push({
        name: 'Integration files',
        status: 'pass',
        message: 'Found integration files',
      });
    } catch {
      checks.push({
        name: 'Integration files',
        status: 'fail',
        message: 'No integration files found. Are you in the right directory?',
      });
    }
    
    // Display results
    for (const check of checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name}: ${check.message}`);
    }
    
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warningChecks = checks.filter(c => c.status === 'warn').length;
    
    console.log(`\n📊 Health check complete: ${checks.length - failedChecks - warningChecks} passed, ${warningChecks} warnings, ${failedChecks} failed`);
    
    if (failedChecks > 0) {
      process.exit(1);
    }
  });

// CI/CD integration commands
const ciCommand = program
  .command('ci')
  .description('CI/CD integration commands');

ciCommand
  .command('check')
  .description('Run all checks for CI/CD pipeline')
  .option('--fail-on-high', 'Fail on high severity vulnerabilities')
  .option('--fail-on-outdated', 'Fail on outdated dependencies')
  .option('--generate-reports', 'Generate reports for CI artifacts')
  .action(async (options) => {
    console.log('🔄 Running CI/CD checks...\n');
    
    let exitCode = 0;
    const reports: any[] = [];
    
    try {
      // 1. Dependency audit
      console.log('1️⃣ Running dependency audit...');
      const auditor = new DependencyAuditor();
      await auditor.initialize();
      const depReport = await auditor.auditIntegrations();
      
      console.log(`   Dependencies: ${depReport.summary.totalPackages} total, ${depReport.summary.conflicts} conflicts, ${depReport.summary.outdated} outdated`);
      
      if (depReport.summary.conflicts > 0) {
        console.log('   ❌ Dependency conflicts detected');
        exitCode = 1;
      }
      
      if (options.failOnOutdated && depReport.summary.outdated > 5) {
        console.log('   ❌ Too many outdated dependencies');
        exitCode = 1;
      }
      
      reports.push({ type: 'dependency', data: depReport });
      
    } catch (error) {
      console.log('   ❌ Dependency audit failed:', error);
      exitCode = 1;
    }
    
    try {
      // 2. Security scan
      console.log('\n2️⃣ Running security scan...');
      const scanner = new SecurityScanner();
      await scanner.initialize();
      const secReport = await scanner.scanIntegrations();
      
      console.log(`   Security: ${secReport.summary.totalVulnerabilities} vulnerabilities (${secReport.summary.critical} critical, ${secReport.summary.high} high)`);
      
      if (secReport.summary.critical > 0) {
        console.log('   ❌ Critical vulnerabilities detected');
        exitCode = 1;
      }
      
      if (options.failOnHigh && secReport.summary.high > 0) {
        console.log('   ❌ High severity vulnerabilities detected');
        exitCode = 1;
      }
      
      reports.push({ type: 'security', data: secReport });
      
    } catch (error) {
      console.log('   ❌ Security scan failed:', error);
      exitCode = 1;
    }
    
    try {
      // 3. Integration tests
      console.log('\n3️⃣ Running integration tests...');
      const tester = new IntegrationTester();
      await tester.initialize();
      const testReport = await tester.runTestSuite({ types: ['unit', 'integration'] });
      
      console.log(`   Tests: ${testReport.summary.totalTests} total, ${testReport.summary.failed} failed, ${testReport.summary.successRate.toFixed(1)}% success rate`);
      
      if (testReport.summary.failed > 0) {
        console.log('   ❌ Test failures detected');
        exitCode = 1;
      }
      
      reports.push({ type: 'tests', data: testReport });
      
    } catch (error) {
      console.log('   ❌ Integration tests failed:', error);
      exitCode = 1;
    }
    
    // Generate reports for CI artifacts
    if (options.generateReports) {
      console.log('\n📄 Generating CI reports...');
      
      for (const report of reports) {
        const timestamp = new Date().toISOString().slice(0, 10);
        
        if (report.type === 'dependency') {
          const jsonReport = await auditor.exportReport(report.data, 'json');
          await writeFile(`ci-dependency-report-${timestamp}.json`, jsonReport);
          
          const htmlReport = await auditor.exportReport(report.data, 'html');
          await writeFile(`ci-dependency-report-${timestamp}.html`, htmlReport);
        }
        
        if (report.type === 'security') {
          const sarifReport = await scanner.exportReport(report.data, 'sarif');
          await writeFile(`ci-security-report-${timestamp}.sarif`, sarifReport);
          
          const htmlReport = await scanner.exportReport(report.data, 'html');
          await writeFile(`ci-security-report-${timestamp}.html`, htmlReport);
        }
        
        if (report.type === 'tests') {
          const jsonReport = JSON.stringify(report.data, null, 2);
          await writeFile(`ci-test-report-${timestamp}.json`, jsonReport);
        }
      }
      
      console.log('   ✅ CI reports generated');
    }
    
    // Summary
    console.log(`\n📊 CI/CD check ${exitCode === 0 ? '✅ passed' : '❌ failed'}`);
    
    if (exitCode !== 0) {
      console.log('\n💡 To fix issues:');
      console.log('  - Run `katalyst-integration-tools dep resolve` for dependency conflicts');
      console.log('  - Review security vulnerabilities and update packages');
      console.log('  - Fix failing tests before merging');
    }
    
    process.exit(exitCode);
  });

// Parse command line arguments
program.parse();