// Katalyst Integration Tools - Main Export
// Comprehensive integration management, dependency auditing, security scanning, and monitoring

export { DependencyAuditor } from './dependency-auditor.js';
export type {
  DependencyInfo,
  ConflictInfo,
  AuditReport,
  AuditSummary,
  ResolutionStrategy,
  UpdateRecommendation,
} from './dependency-auditor.js';

export { SecurityScanner } from './security-scanner.js';
export type {
  SecurityVulnerability,
  SecurityAlert,
  SecurityReport,
  SecurityPolicy,
  VulnerabilityDatabase,
  LicenseInfo,
} from './security-scanner.js';

export { IntegrationTester } from './integration-tester.js';
export type {
  TestSuite,
  TestResult,
  TestConfig,
  PerformanceMetrics,
  CompatibilityMatrix,
  CoverageReport,
} from './integration-tester.js';

export { MonitoringDaemon } from './monitoring-daemon.js';
export type {
  MonitoringConfig,
  MonitoringMetrics,
  ScanJob,
  AlertChannel,
} from './monitoring-daemon.js';

// Utility functions for integration management
export const IntegrationTools = {
  
  // Quick audit of all integrations
  async quickAudit(): Promise<{
    dependencies: any;
    security: any;
    tests: any;
    summary: {
      criticalIssues: number;
      warnings: number;
      passed: number;
      recommendations: string[];
    };
  }> {
    const auditor = new DependencyAuditor();
    const scanner = new SecurityScanner();
    const tester = new IntegrationTester();

    await Promise.all([
      auditor.initialize(),
      scanner.initialize(),
      tester.initialize(),
    ]);

    const [dependencies, security, tests] = await Promise.all([
      auditor.auditIntegrations(),
      scanner.scanIntegrations(),
      tester.runTestSuite({ types: ['unit'] }),
    ]);

    const criticalIssues = 
      dependencies.summary.conflicts +
      security.summary.critical +
      (tests.summary.failed > 0 ? 1 : 0);

    const warnings = 
      dependencies.summary.outdated +
      security.summary.high +
      security.summary.medium;

    const passed = 
      (dependencies.summary.conflicts === 0 ? 1 : 0) +
      (security.summary.critical === 0 ? 1 : 0) +
      (tests.summary.failed === 0 ? 1 : 0);

    const recommendations: string[] = [];
    
    if (dependencies.summary.conflicts > 0) {
      recommendations.push(`Resolve ${dependencies.summary.conflicts} dependency conflicts`);
    }
    
    if (security.summary.critical > 0) {
      recommendations.push(`Fix ${security.summary.critical} critical security vulnerabilities`);
    }
    
    if (tests.summary.failed > 0) {
      recommendations.push(`Fix ${tests.summary.failed} failing tests`);
    }
    
    if (dependencies.summary.outdated > 10) {
      recommendations.push('Update outdated dependencies');
    }

    return {
      dependencies,
      security,
      tests,
      summary: {
        criticalIssues,
        warnings,
        passed,
        recommendations,
      },
    };
  },

  // Start monitoring daemon with sensible defaults
  async startMonitoring(config?: Partial<MonitoringConfig>): Promise<MonitoringDaemon> {
    const daemon = new MonitoringDaemon({
      intervals: {
        dependency: 4 * 60 * 60 * 1000,  // 4 hours
        security: 2 * 60 * 60 * 1000,    // 2 hours
        performance: 6 * 60 * 60 * 1000, // 6 hours
        integration: 8 * 60 * 60 * 1000, // 8 hours
      },
      thresholds: {
        dependency: { conflicts: 0, outdated: 10 },
        security: { critical: 0, high: 2, medium: 10 },
        performance: { bundleSize: 500000, loadTime: 3000, regression: 10 },
      },
      ci: {
        enabled: true,
        failOnCritical: true,
        failOnHigh: false,
        generateBadges: true,
        uploadToGitHub: false,
      },
      ...config,
    });

    await daemon.start();
    return daemon;
  },

  // CI/CD integration - run all checks and return exit code
  async runCIChecks(options: {
    failOnHigh?: boolean;
    failOnOutdated?: boolean;
    generateReports?: boolean;
  } = {}): Promise<{
    exitCode: number;
    results: {
      dependencies: any;
      security: any;
      tests: any;
    };
    reports?: string[];
  }> {
    const results = await this.quickAudit();
    let exitCode = 0;
    const reports: string[] = [];

    // Check failure conditions
    if (results.dependencies.summary.conflicts > 0) {
      console.error(`❌ Dependency conflicts: ${results.dependencies.summary.conflicts}`);
      exitCode = 1;
    }

    if (results.security.summary.critical > 0) {
      console.error(`❌ Critical vulnerabilities: ${results.security.summary.critical}`);
      exitCode = 1;
    }

    if (options.failOnHigh && results.security.summary.high > 0) {
      console.error(`❌ High vulnerabilities: ${results.security.summary.high}`);
      exitCode = 1;
    }

    if (options.failOnOutdated && results.dependencies.summary.outdated > 10) {
      console.error(`❌ Too many outdated dependencies: ${results.dependencies.summary.outdated}`);
      exitCode = 1;
    }

    if (results.tests.summary.failed > 0) {
      console.error(`❌ Test failures: ${results.tests.summary.failed}`);
      exitCode = 1;
    }

    // Generate reports if requested
    if (options.generateReports) {
      try {
        const auditor = new DependencyAuditor();
        const scanner = new SecurityScanner();
        
        const timestamp = new Date().toISOString().slice(0, 10);
        
        // Dependency report
        const depReport = await auditor.exportReport(results.dependencies, 'html');
        const depFile = `dependency-report-${timestamp}.html`;
        reports.push(depFile);
        
        // Security report (SARIF for GitHub)
        const secReport = await scanner.exportReport(results.security, 'sarif');
        const secFile = `security-report-${timestamp}.sarif`;
        reports.push(secFile);
        
        // Test report
        const testFile = `test-report-${timestamp}.json`;
        reports.push(testFile);
        
      } catch (error) {
        console.warn('⚠️ Failed to generate some reports:', error);
      }
    }

    return {
      exitCode,
      results: {
        dependencies: results.dependencies,
        security: results.security,
        tests: results.tests,
      },
      reports: reports.length > 0 ? reports : undefined,
    };
  },

  // Health check for the integration system
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      // Check if we can initialize all tools
      const auditor = new DependencyAuditor();
      const scanner = new SecurityScanner();
      const tester = new IntegrationTester();

      await Promise.all([
        auditor.initialize(),
        scanner.initialize(),
        tester.initialize(),
      ]);

      checks.push({
        name: 'Tool Initialization',
        status: 'pass' as const,
        message: 'All tools initialized successfully',
      });

      // Run quick checks
      const quickResults = await this.quickAudit();

      // Dependency check
      if (quickResults.dependencies.summary.conflicts === 0) {
        checks.push({
          name: 'Dependencies',
          status: 'pass' as const,
          message: `${quickResults.dependencies.summary.totalPackages} packages, no conflicts`,
        });
      } else {
        checks.push({
          name: 'Dependencies',
          status: 'fail' as const,
          message: `${quickResults.dependencies.summary.conflicts} dependency conflicts found`,
        });
        overallStatus = 'critical';
      }

      // Security check
      if (quickResults.security.summary.critical === 0 && quickResults.security.summary.high === 0) {
        checks.push({
          name: 'Security',
          status: 'pass' as const,
          message: `${quickResults.security.summary.totalVulnerabilities} total vulnerabilities, none critical/high`,
        });
      } else if (quickResults.security.summary.critical === 0) {
        checks.push({
          name: 'Security',
          status: 'warn' as const,
          message: `${quickResults.security.summary.high} high severity vulnerabilities found`,
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      } else {
        checks.push({
          name: 'Security',
          status: 'fail' as const,
          message: `${quickResults.security.summary.critical} critical vulnerabilities found`,
        });
        overallStatus = 'critical';
      }

      // Test check
      if (quickResults.tests.summary.failed === 0) {
        checks.push({
          name: 'Tests',
          status: 'pass' as const,
          message: `${quickResults.tests.summary.totalTests} tests, ${quickResults.tests.summary.successRate.toFixed(1)}% success rate`,
        });
      } else {
        checks.push({
          name: 'Tests',
          status: 'fail' as const,
          message: `${quickResults.tests.summary.failed} test failures`,
        });
        overallStatus = 'critical';
      }

    } catch (error) {
      checks.push({
        name: 'System Health',
        status: 'fail' as const,
        message: `Health check failed: ${error}`,
      });
      overallStatus = 'critical';
    }

    return {
      status: overallStatus,
      checks,
    };
  },
};

// Export individual tools for direct usage
export { DependencyAuditor, SecurityScanner, IntegrationTester, MonitoringDaemon };

// Export default collection
export default IntegrationTools;

// Version information
export const VERSION = '1.0.0';
export const TOOLS = {
  DependencyAuditor: 'Dependency conflict detection and resolution',
  SecurityScanner: 'Vulnerability scanning and security monitoring', 
  IntegrationTester: 'Comprehensive integration testing framework',
  MonitoringDaemon: 'Real-time monitoring and alerting system',
};

// Quick start function
export async function quickStart(): Promise<void> {
  console.log('🚀 Katalyst Integration Tools Quick Start\n');
  
  try {
    const health = await IntegrationTools.healthCheck();
    
    console.log(`📊 System Status: ${health.status.toUpperCase()}\n`);
    
    for (const check of health.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name}: ${check.message}`);
    }
    
    if (health.status === 'critical') {
      console.log('\n🚨 Critical issues found! Run individual tools to investigate:');
      console.log('- katalyst-integration-tools dep audit');
      console.log('- katalyst-integration-tools security scan'); 
      console.log('- katalyst-integration-tools test run');
    } else if (health.status === 'warning') {
      console.log('\n⚠️ Some issues detected. Consider reviewing:');
      console.log('- katalyst-integration-tools security scan --severity=high');
    } else {
      console.log('\n✅ All systems healthy! Consider setting up monitoring:');
      console.log('- katalyst-integration-tools monitor start');
    }
    
  } catch (error) {
    console.error('❌ Quick start failed:', error);
    console.log('\n💡 Try running: katalyst-integration-tools doctor');
  }
}