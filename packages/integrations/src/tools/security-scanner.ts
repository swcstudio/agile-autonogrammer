import { readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { glob } from 'glob';

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  package: string;
  version: string;
  title: string;
  description: string;
  cve?: string;
  cwe?: string;
  cvss?: number;
  patchedVersions?: string[];
  vulnerableVersions: string[];
  references: string[];
  firstDetected: Date;
  lastUpdated: Date;
  affectedFiles: string[];
  exploitAvailable?: boolean;
  exploitMaturity?: string;
  recommendation: string;
}

export interface SecurityAlert {
  id: string;
  type: 'vulnerability' | 'policy_violation' | 'license_issue' | 'malware';
  severity: 'critical' | 'high' | 'medium' | 'low';
  integration: string;
  package: string;
  message: string;
  actionRequired: boolean;
  autoFixable: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  suppressedAt?: Date;
  suppressionReason?: string;
}

export interface LicenseInfo {
  spdxId: string;
  name: string;
  url: string;
  approved: boolean;
  copyleft: boolean;
  commercial: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SecurityPolicy {
  allowedLicenses: string[];
  blockedLicenses: string[];
  maxSeverityLevel: 'low' | 'medium' | 'high' | 'critical';
  requireSecurityReview: boolean;
  autoUpdatePolicy: 'none' | 'patch' | 'minor' | 'all';
  alertThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  exemptions: Array<{
    package: string;
    version?: string;
    reason: string;
    expiresAt?: Date;
    approvedBy: string;
  }>;
}

export interface SecurityReport {
  scanId: string;
  timestamp: Date;
  duration: number;
  integrations: string[];
  summary: {
    totalVulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    fixable: number;
    newVulnerabilities: number;
    resolvedVulnerabilities: number;
  };
  vulnerabilities: SecurityVulnerability[];
  alerts: SecurityAlert[];
  licenseIssues: Array<{
    package: string;
    license: LicenseInfo;
    issue: string;
  }>;
  recommendations: Array<{
    type: 'update' | 'replace' | 'remove' | 'audit';
    package: string;
    description: string;
    priority: number;
  }>;
  compliance: {
    policyViolations: number;
    complianceScore: number;
    status: 'compliant' | 'non_compliant' | 'review_required';
  };
  trends: {
    vulnerabilityTrend: 'improving' | 'stable' | 'degrading';
    riskScore: number;
    riskTrend: number;
  };
  nextScanDate: Date;
}

export interface VulnerabilityDatabase {
  version: string;
  lastUpdated: Date;
  vulnerabilities: Map<string, SecurityVulnerability[]>;
  advisories: Map<string, any>;
  exploits: Map<string, any>;
}

export class SecurityScanner {
  private vulnDb: VulnerabilityDatabase | null = null;
  private policy: SecurityPolicy;
  private scanHistory: SecurityReport[] = [];
  private alertHistory: SecurityAlert[] = [];

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = {
      allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
      blockedLicenses: ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'SSPL-1.0'],
      maxSeverityLevel: 'high',
      requireSecurityReview: true,
      autoUpdatePolicy: 'patch',
      alertThresholds: {
        critical: 0,
        high: 2,
        medium: 10,
      },
      exemptions: [],
      ...policy,
    };
  }

  async initialize(): Promise<void> {
    try {
      await this.loadVulnerabilityDatabase();
      await this.loadScanHistory();
      await this.loadAlertHistory();
    } catch (error) {
      console.warn('Failed to initialize security scanner:', error);
      this.vulnDb = this.createEmptyDatabase();
    }
  }

  private async loadVulnerabilityDatabase(): Promise<void> {
    // In production, this would fetch from multiple sources:
    // - GitHub Advisory Database
    // - NPM Audit API
    // - OSV Database
    // - Snyk Database
    // - Custom vulnerability feeds

    const mockVulnDb: VulnerabilityDatabase = {
      version: '2024.08.31',
      lastUpdated: new Date(),
      vulnerabilities: new Map(),
      advisories: new Map(),
      exploits: new Map(),
    };

    // Mock some common vulnerabilities for demonstration
    const mockVulnerabilities: SecurityVulnerability[] = [
      {
        id: 'GHSA-67hx-6x53-jw92',
        severity: 'high',
        package: 'lodash',
        version: '<4.17.21',
        title: 'Prototype Pollution in lodash',
        description: 'Lodash versions prior to 4.17.21 are vulnerable to prototype pollution.',
        cve: 'CVE-2019-10744',
        cwe: 'CWE-1321',
        cvss: 7.4,
        patchedVersions: ['>=4.17.21'],
        vulnerableVersions: ['<4.17.21'],
        references: [
          'https://github.com/lodash/lodash/pull/4336',
          'https://nvd.nist.gov/vuln/detail/CVE-2019-10744',
        ],
        firstDetected: new Date('2019-07-26'),
        lastUpdated: new Date('2020-05-20'),
        affectedFiles: [],
        exploitAvailable: true,
        exploitMaturity: 'proof-of-concept',
        recommendation: 'Update lodash to version 4.17.21 or later',
      },
    ];

    for (const vuln of mockVulnerabilities) {
      const existing = mockVulnDb.vulnerabilities.get(vuln.package) || [];
      existing.push(vuln);
      mockVulnDb.vulnerabilities.set(vuln.package, existing);
    }

    this.vulnDb = mockVulnDb;
  }

  private createEmptyDatabase(): VulnerabilityDatabase {
    return {
      version: '0.0.0',
      lastUpdated: new Date(),
      vulnerabilities: new Map(),
      advisories: new Map(),
      exploits: new Map(),
    };
  }

  private async loadScanHistory(): Promise<void> {
    try {
      const historyPath = resolve(process.cwd(), '.katalyst', 'security-history.json');
      const historyData = await readFile(historyPath, 'utf-8');
      this.scanHistory = JSON.parse(historyData).map((report: any) => ({
        ...report,
        timestamp: new Date(report.timestamp),
        nextScanDate: new Date(report.nextScanDate),
      }));
    } catch {
      this.scanHistory = [];
    }
  }

  private async loadAlertHistory(): Promise<void> {
    try {
      const alertPath = resolve(process.cwd(), '.katalyst', 'security-alerts.json');
      const alertData = await readFile(alertPath, 'utf-8');
      this.alertHistory = JSON.parse(alertData).map((alert: any) => ({
        ...alert,
        createdAt: new Date(alert.createdAt),
        resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
        suppressedAt: alert.suppressedAt ? new Date(alert.suppressedAt) : undefined,
      }));
    } catch {
      this.alertHistory = [];
    }
  }

  async scanIntegrations(integrationPaths?: string[]): Promise<SecurityReport> {
    const startTime = Date.now();
    const scanId = `scan-${Date.now()}`;

    if (!this.vulnDb) {
      await this.initialize();
    }

    // Discover integrations if not provided
    const paths = integrationPaths || await this.discoverIntegrations();
    
    const vulnerabilities: SecurityVulnerability[] = [];
    const alerts: SecurityAlert[] = [];
    const licenseIssues: any[] = [];
    const recommendations: any[] = [];

    for (const path of paths) {
      try {
        const integrationVulns = await this.scanIntegration(path);
        vulnerabilities.push(...integrationVulns);

        const integrationAlerts = await this.generateAlerts(path, integrationVulns);
        alerts.push(...integrationAlerts);

        const licenseCheck = await this.checkLicenses(path);
        licenseIssues.push(...licenseCheck);

        const integrationRecs = await this.generateRecommendations(path, integrationVulns);
        recommendations.push(...integrationRecs);
      } catch (error) {
        console.warn(`Failed to scan integration at ${path}:`, error);
      }
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(vulnerabilities);
    
    // Assess compliance
    const compliance = this.assessCompliance(vulnerabilities, alerts);
    
    // Calculate trends
    const trends = this.calculateTrends(vulnerabilities);

    const report: SecurityReport = {
      scanId,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      integrations: paths,
      summary,
      vulnerabilities,
      alerts,
      licenseIssues,
      recommendations,
      compliance,
      trends,
      nextScanDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    };

    // Store scan history
    this.scanHistory.push(report);
    await this.saveScanHistory();

    // Store alerts
    this.alertHistory.push(...alerts);
    await this.saveAlertHistory();

    return report;
  }

  private async discoverIntegrations(): Promise<string[]> {
    const integrationPaths = await glob('src/integrations/**/*.ts', {
      cwd: resolve(process.cwd(), 'packages/integrations'),
      absolute: true,
    });

    return integrationPaths.filter(path => !path.includes('.test.') && !path.includes('.spec.'));
  }

  private async scanIntegration(integrationPath: string): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    try {
      // Read the integration file
      const content = await readFile(integrationPath, 'utf-8');
      
      // Extract dependencies from import statements and package references
      const dependencies = this.extractDependencies(content);
      
      // Check each dependency against vulnerability database
      for (const dep of dependencies) {
        const depVulns = this.vulnDb?.vulnerabilities.get(dep.name) || [];
        
        for (const vuln of depVulns) {
          if (this.isVersionVulnerable(dep.version, vuln.vulnerableVersions)) {
            vulnerabilities.push({
              ...vuln,
              affectedFiles: [integrationPath],
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan integration ${integrationPath}:`, error);
    }

    return vulnerabilities;
  }

  private extractDependencies(content: string): Array<{ name: string; version: string }> {
    const dependencies: Array<{ name: string; version: string }> = [];
    
    // Extract from import statements
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const packageName = match[1];
      
      // Skip relative imports
      if (packageName.startsWith('.') || packageName.startsWith('/')) {
        continue;
      }
      
      // Extract package name (handle scoped packages)
      const normalizedName = packageName.startsWith('@') 
        ? packageName.split('/').slice(0, 2).join('/')
        : packageName.split('/')[0];
      
      dependencies.push({
        name: normalizedName,
        version: 'unknown', // In production, would resolve from package.json
      });
    }
    
    return dependencies;
  }

  private isVersionVulnerable(version: string, vulnerableVersions: string[]): boolean {
    // Simplified version checking - in production would use semver
    if (version === 'unknown') return true;
    
    for (const vulnRange of vulnerableVersions) {
      if (vulnRange.includes('<') && version < vulnRange.replace('<', '')) {
        return true;
      }
    }
    
    return false;
  }

  private async generateAlerts(integrationPath: string, vulnerabilities: SecurityVulnerability[]): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    const integrationName = integrationPath.split('/').pop()?.replace('.ts', '') || 'unknown';

    for (const vuln of vulnerabilities) {
      // Skip if exempted
      if (this.isExempted(vuln.package, vuln.version)) {
        continue;
      }

      // Check if exceeds severity threshold
      if (this.exceedsSeverityThreshold(vuln.severity)) {
        alerts.push({
          id: `alert-${Date.now()}-${Math.random()}`,
          type: 'vulnerability',
          severity: vuln.severity,
          integration: integrationName,
          package: vuln.package,
          message: `Security vulnerability ${vuln.id} detected in ${vuln.package}@${vuln.version}: ${vuln.title}`,
          actionRequired: vuln.severity === 'critical' || vuln.severity === 'high',
          autoFixable: Boolean(vuln.patchedVersions?.length),
          createdAt: new Date(),
        });
      }
    }

    return alerts;
  }

  private async checkLicenses(integrationPath: string): Promise<any[]> {
    // In production, would check package licenses against policy
    return [];
  }

  private async generateRecommendations(integrationPath: string, vulnerabilities: SecurityVulnerability[]): Promise<any[]> {
    const recommendations: any[] = [];

    for (const vuln of vulnerabilities) {
      if (vuln.patchedVersions?.length) {
        recommendations.push({
          type: 'update',
          package: vuln.package,
          description: `Update ${vuln.package} to ${vuln.patchedVersions[0]} to fix ${vuln.id}`,
          priority: this.getSeverityPriority(vuln.severity),
        });
      }
    }

    return recommendations;
  }

  private calculateSummary(vulnerabilities: SecurityVulnerability[]) {
    const summary = {
      totalVulnerabilities: vulnerabilities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      fixable: 0,
      newVulnerabilities: 0,
      resolvedVulnerabilities: 0,
    };

    for (const vuln of vulnerabilities) {
      summary[vuln.severity]++;
      if (vuln.patchedVersions?.length) {
        summary.fixable++;
      }
    }

    // Calculate new/resolved against previous scan
    const lastScan = this.scanHistory[this.scanHistory.length - 1];
    if (lastScan) {
      const lastVulnIds = new Set(lastScan.vulnerabilities.map(v => v.id));
      const currentVulnIds = new Set(vulnerabilities.map(v => v.id));
      
      summary.newVulnerabilities = vulnerabilities.filter(v => !lastVulnIds.has(v.id)).length;
      summary.resolvedVulnerabilities = lastScan.vulnerabilities.filter(v => !currentVulnIds.has(v.id)).length;
    }

    return summary;
  }

  private assessCompliance(vulnerabilities: SecurityVulnerability[], alerts: SecurityAlert[]) {
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;

    const policyViolations = 
      (criticalCount > this.policy.alertThresholds.critical ? 1 : 0) +
      (highCount > this.policy.alertThresholds.high ? 1 : 0) +
      (mediumCount > this.policy.alertThresholds.medium ? 1 : 0);

    const complianceScore = Math.max(0, 100 - (criticalCount * 25) - (highCount * 10) - (mediumCount * 2));
    
    const status = policyViolations === 0 ? 'compliant' : 
                   criticalCount > 0 ? 'non_compliant' : 'review_required';

    return {
      policyViolations,
      complianceScore,
      status,
    };
  }

  private calculateTrends(vulnerabilities: SecurityVulnerability[]) {
    const currentRiskScore = this.calculateRiskScore(vulnerabilities);
    
    let riskTrend = 0;
    let vulnerabilityTrend: 'improving' | 'stable' | 'degrading' = 'stable';

    if (this.scanHistory.length > 0) {
      const lastScan = this.scanHistory[this.scanHistory.length - 1];
      const lastRiskScore = this.calculateRiskScore(lastScan.vulnerabilities);
      
      riskTrend = currentRiskScore - lastRiskScore;
      
      if (vulnerabilities.length < lastScan.vulnerabilities.length) {
        vulnerabilityTrend = 'improving';
      } else if (vulnerabilities.length > lastScan.vulnerabilities.length) {
        vulnerabilityTrend = 'degrading';
      }
    }

    return {
      vulnerabilityTrend,
      riskScore: currentRiskScore,
      riskTrend,
    };
  }

  private calculateRiskScore(vulnerabilities: SecurityVulnerability[]): number {
    let score = 0;
    
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score += 10; break;
        case 'high': score += 7; break;
        case 'medium': score += 4; break;
        case 'low': score += 1; break;
        default: score += 0; break;
      }
      
      // Add bonus for exploits
      if (vuln.exploitAvailable) {
        score += 3;
      }
    }
    
    return score;
  }

  private isExempted(packageName: string, version: string): boolean {
    return this.policy.exemptions.some(exemption => {
      if (exemption.package !== packageName) return false;
      if (exemption.version && exemption.version !== version) return false;
      if (exemption.expiresAt && exemption.expiresAt < new Date()) return false;
      return true;
    });
  }

  private exceedsSeverityThreshold(severity: string): boolean {
    const severityLevels = ['info', 'low', 'medium', 'high', 'critical'];
    const severityIndex = severityLevels.indexOf(severity);
    const thresholdIndex = severityLevels.indexOf(this.policy.maxSeverityLevel);
    
    return severityIndex >= thresholdIndex;
  }

  private getSeverityPriority(severity: string): number {
    switch (severity) {
      case 'critical': return 5;
      case 'high': return 4;
      case 'medium': return 3;
      case 'low': return 2;
      case 'info': return 1;
      default: return 0;
    }
  }

  private async saveScanHistory(): Promise<void> {
    try {
      const historyPath = resolve(process.cwd(), '.katalyst', 'security-history.json');
      
      // Keep only last 30 scans
      const recentHistory = this.scanHistory.slice(-30);
      
      await writeFile(historyPath, JSON.stringify(recentHistory, null, 2));
    } catch (error) {
      console.warn('Failed to save scan history:', error);
    }
  }

  private async saveAlertHistory(): Promise<void> {
    try {
      const alertPath = resolve(process.cwd(), '.katalyst', 'security-alerts.json');
      
      // Keep only unresolved alerts and last 100 resolved alerts
      const unresolvedAlerts = this.alertHistory.filter(alert => !alert.resolvedAt);
      const resolvedAlerts = this.alertHistory
        .filter(alert => alert.resolvedAt)
        .slice(-100);
      
      const filteredHistory = [...unresolvedAlerts, ...resolvedAlerts];
      
      await writeFile(alertPath, JSON.stringify(filteredHistory, null, 2));
    } catch (error) {
      console.warn('Failed to save alert history:', error);
    }
  }

  // Public API methods for integration with CI/CD and monitoring
  
  async getSecurityDashboard(): Promise<any> {
    const lastScan = this.scanHistory[this.scanHistory.length - 1];
    if (!lastScan) return null;

    const activeAlerts = this.alertHistory.filter(alert => !alert.resolvedAt && !alert.suppressedAt);
    
    return {
      lastScanDate: lastScan.timestamp,
      nextScanDate: lastScan.nextScanDate,
      summary: lastScan.summary,
      compliance: lastScan.compliance,
      trends: lastScan.trends,
      activeAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
      riskScore: lastScan.trends.riskScore,
      recommendations: lastScan.recommendations.slice(0, 5), // Top 5
    };
  }

  async resolveAlert(alertId: string, resolution: string): Promise<boolean> {
    const alertIndex = this.alertHistory.findIndex(alert => alert.id === alertId);
    
    if (alertIndex === -1) return false;
    
    this.alertHistory[alertIndex].resolvedAt = new Date();
    await this.saveAlertHistory();
    
    return true;
  }

  async suppressAlert(alertId: string, reason: string, duration?: number): Promise<boolean> {
    const alertIndex = this.alertHistory.findIndex(alert => alert.id === alertId);
    
    if (alertIndex === -1) return false;
    
    this.alertHistory[alertIndex].suppressedAt = new Date();
    this.alertHistory[alertIndex].suppressionReason = reason;
    
    await this.saveAlertHistory();
    
    return true;
  }

  async updateVulnerabilityDatabase(): Promise<boolean> {
    try {
      // In production, would fetch from vulnerability databases
      console.log('Updating vulnerability database...');
      
      if (this.vulnDb) {
        this.vulnDb.lastUpdated = new Date();
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update vulnerability database:', error);
      return false;
    }
  }

  async exportReport(report: SecurityReport, format: 'json' | 'csv' | 'html' | 'sarif' = 'json'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
        
      case 'csv':
        return this.exportToCSV(report);
        
      case 'html':
        return this.exportToHTML(report);
        
      case 'sarif':
        return this.exportToSARIF(report);
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCSV(report: SecurityReport): string {
    const headers = ['Integration', 'Package', 'Version', 'Vulnerability ID', 'Severity', 'Title', 'CVE', 'Fix Available'];
    const rows = [headers];

    for (const vuln of report.vulnerabilities) {
      const integration = vuln.affectedFiles[0]?.split('/').pop()?.replace('.ts', '') || 'unknown';
      rows.push([
        integration,
        vuln.package,
        vuln.version,
        vuln.id,
        vuln.severity,
        vuln.title,
        vuln.cve || '',
        vuln.patchedVersions?.length ? 'Yes' : 'No',
      ]);
    }

    return rows.map(row => row.join(',')).join('\n');
  }

  private exportToHTML(report: SecurityReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Scan Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
        .critical { border-left: 4px solid #d32f2f; }
        .high { border-left: 4px solid #f57c00; }
        .medium { border-left: 4px solid #fbc02d; }
        .low { border-left: 4px solid #388e3c; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Scan Report</h1>
        <p>Generated: ${report.timestamp.toISOString()}</p>
        <p>Scan ID: ${report.scanId}</p>
        <p>Duration: ${report.duration}ms</p>
    </div>
    
    <div class="summary">
        <div class="card critical">
            <h3>Critical</h3>
            <p>${report.summary.critical}</p>
        </div>
        <div class="card high">
            <h3>High</h3>
            <p>${report.summary.high}</p>
        </div>
        <div class="card medium">
            <h3>Medium</h3>
            <p>${report.summary.medium}</p>
        </div>
        <div class="card low">
            <h3>Low</h3>
            <p>${report.summary.low}</p>
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Package</th>
                <th>Severity</th>
                <th>Vulnerability</th>
                <th>Fix Available</th>
            </tr>
        </thead>
        <tbody>
            ${report.vulnerabilities.map(vuln => `
                <tr class="${vuln.severity}">
                    <td>${vuln.package}@${vuln.version}</td>
                    <td>${vuln.severity.toUpperCase()}</td>
                    <td>
                        <strong>${vuln.title}</strong><br>
                        ${vuln.id}${vuln.cve ? ` (${vuln.cve})` : ''}
                    </td>
                    <td>${vuln.patchedVersions?.length ? 'Yes' : 'No'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }

  private exportToSARIF(report: SecurityReport): string {
    // SARIF (Static Analysis Results Interchange Format) for GitHub security tab
    const sarif = {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'katalyst-security-scanner',
            version: '1.0.0',
            informationUri: 'https://katalyst.dev/security',
          },
        },
        results: report.vulnerabilities.map(vuln => ({
          ruleId: vuln.id,
          level: this.mapSeverityToSARIF(vuln.severity),
          message: {
            text: vuln.title,
          },
          locations: vuln.affectedFiles.map(file => ({
            physicalLocation: {
              artifactLocation: {
                uri: file,
              },
            },
          })),
          properties: {
            cve: vuln.cve,
            cvss: vuln.cvss,
            package: vuln.package,
            version: vuln.version,
            patchedVersions: vuln.patchedVersions,
          },
        })),
      }],
    };

    return JSON.stringify(sarif, null, 2);
  }

  private mapSeverityToSARIF(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'note';
      case 'info': return 'note';
      default: return 'note';
    }
  }
}

// CLI usage example
if (require.main === module) {
  async function main() {
    const scanner = new SecurityScanner({
      maxSeverityLevel: 'medium',
      alertThresholds: {
        critical: 0,
        high: 1,
        medium: 5,
      },
    });

    await scanner.initialize();
    
    console.log('🔍 Scanning integrations for security vulnerabilities...');
    const report = await scanner.scanIntegrations();
    
    console.log('\n📊 Security Scan Results:');
    console.log(`Total vulnerabilities: ${report.summary.totalVulnerabilities}`);
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`High: ${report.summary.high}`);
    console.log(`Medium: ${report.summary.medium}`);
    console.log(`Low: ${report.summary.low}`);
    console.log(`Fixable: ${report.summary.fixable}`);
    console.log(`Compliance: ${report.compliance.status}`);
    console.log(`Risk Score: ${report.trends.riskScore}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      for (const rec of report.recommendations.slice(0, 3)) {
        console.log(`- ${rec.description}`);
      }
    }
    
    // Export reports
    const jsonReport = await scanner.exportReport(report, 'json');
    await writeFile(resolve(process.cwd(), 'security-report.json'), jsonReport);
    
    const htmlReport = await scanner.exportReport(report, 'html');
    await writeFile(resolve(process.cwd(), 'security-report.html'), htmlReport);
    
    console.log('\n📄 Reports exported to security-report.json and security-report.html');
  }

  main().catch(console.error);
}