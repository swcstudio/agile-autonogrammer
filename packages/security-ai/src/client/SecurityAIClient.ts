/**
 * Security AI Client
 * 
 * TypeScript client for connecting to Katalyst's Security AI service
 * Supports Red Team, Purple Team, and Green Hat operations
 */

import type {
  SecurityScanRequest,
  SecurityScanResponse,
  VulnerabilityReport,
  ThreatDetectionRequest,
  ThreatDetectionResult,
  AttackSimulationRequest,
  AttackSimulationResult,
  EthicalHackingRequest,
  EthicalHackingResponse,
  SecurityAuditReport,
  SecurityConfig
} from '../types';

export interface SecurityAIClientConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTimeout?: number;
}

export class SecurityAIClient {
  private config: Required<SecurityAIClientConfig>;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(config: SecurityAIClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '/api/security',
      apiKey: config.apiKey || '',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableCache: config.enableCache ?? true,
      cacheTimeout: config.cacheTimeout || 300000, // 5 minutes
    };
  }

  /**
   * Scan code for vulnerabilities
   */
  async scanVulnerabilities(request: SecurityScanRequest): Promise<VulnerabilityReport> {
    const cacheKey = `scan:${this.hashRequest(request)}`;
    
    // Check cache first
    if (this.config.enableCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached as VulnerabilityReport;
      }
    }

    const response = await this.makeRequest<VulnerabilityReport>('/scan', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    // Cache successful response
    if (this.config.enableCache && response) {
      this.setCache(cacheKey, response);
    }

    return response;
  }

  /**
   * Detect threats in real-time
   */
  async detectThreats(request: ThreatDetectionRequest): Promise<ThreatDetectionResult> {
    return this.makeRequest<ThreatDetectionResult>('/threat-detect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Run Purple Team attack simulation
   */
  async simulateAttack(request: AttackSimulationRequest): Promise<AttackSimulationResult> {
    return this.makeRequest<AttackSimulationResult>('/attack-sim', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Green Hat ethical hacking assistance
   */
  async getEthicalHackingGuidance(request: EthicalHackingRequest): Promise<EthicalHackingResponse> {
    return this.makeRequest<EthicalHackingResponse>('/ethical-hack', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Comprehensive security audit
   */
  async performSecurityAudit(codebase: {
    files: { path: string; content: string }[];
    language: string;
    framework?: string;
  }): Promise<SecurityAuditReport> {
    return this.makeRequest<SecurityAuditReport>('/audit', {
      method: 'POST',
      body: JSON.stringify(codebase),
    });
  }

  /**
   * Get security recommendations
   */
  async getSecurityRecommendations(
    vulnerabilities: any[],
    context?: { framework?: string; language?: string }
  ): Promise<string[]> {
    return this.makeRequest<string[]>('/recommendations', {
      method: 'POST',
      body: JSON.stringify({ vulnerabilities, context }),
    });
  }

  /**
   * Validate security fixes
   */
  async validateFixes(
    originalCode: string,
    fixedCode: string,
    vulnerabilities: any[]
  ): Promise<{ fixed: any[]; remaining: any[]; newIssues: any[] }> {
    return this.makeRequest('/validate-fixes', {
      method: 'POST',
      body: JSON.stringify({
        originalCode,
        fixedCode,
        vulnerabilities,
      }),
    });
  }

  /**
   * Get threat intelligence updates
   */
  async getThreatIntelligence(): Promise<{
    indicators: any[];
    campaigns: any[];
    signatures: any[];
    lastUpdated: string;
  }> {
    const cacheKey = 'threat-intelligence';
    
    if (this.config.enableCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await this.makeRequest('/threat-intel', {
      method: 'GET',
    });

    if (this.config.enableCache) {
      this.setCache(cacheKey, response, 600000); // Cache for 10 minutes
    }

    return response;
  }

  /**
   * Stream real-time security events
   */
  streamSecurityEvents(
    callback: (event: any) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(`${this.config.baseUrl}/events/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        errorCallback?.(new Error('Failed to parse SSE data'));
      }
    };

    eventSource.onerror = (event) => {
      errorCallback?.(new Error('SSE connection error'));
    };

    // Return cleanup function
    return () => eventSource.close();
  }

  /**
   * Upload file for scanning
   */
  async uploadFile(file: File, options?: { language?: string }): Promise<VulnerabilityReport> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.language) {
      formData.append('language', options.language);
    }

    return this.makeRequest<VulnerabilityReport>('/upload-scan', {
      method: 'POST',
      body: formData,
      skipJsonHeaders: true,
    });
  }

  /**
   * Batch scan multiple files
   */
  async batchScan(files: File[]): Promise<VulnerabilityReport[]> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    return this.makeRequest<VulnerabilityReport[]>('/batch-scan', {
      method: 'POST',
      body: formData,
      skipJsonHeaders: true,
    });
  }

  /**
   * Get scan history
   */
  async getScanHistory(limit = 50): Promise<VulnerabilityReport[]> {
    return this.makeRequest<VulnerabilityReport[]>(`/history?limit=${limit}`, {
      method: 'GET',
    });
  }

  /**
   * Delete scan from history
   */
  async deleteScan(scanId: string): Promise<void> {
    await this.makeRequest(`/history/${scanId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<any> {
    return this.makeRequest('/metrics', {
      method: 'GET',
    });
  }

  /**
   * Update security configuration
   */
  async updateSecurityConfig(config: Partial<SecurityConfig>): Promise<SecurityConfig> {
    return this.makeRequest<SecurityConfig>('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; version: string; uptime: number }> {
    return this.makeRequest('/health', {
      method: 'GET',
    });
  }

  // Private methods

  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit & { skipJsonHeaders?: boolean } = {}
  ): Promise<T> {
    const { skipJsonHeaders, ...fetchOptions } = options;
    
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      ...(!skipJsonHeaders && { 'Content-Type': 'application/json' }),
      ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      'X-Client': 'Katalyst-Security-AI',
      'X-Version': '1.0.0',
      ...options.headers,
    };

    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new SecurityAPIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorText
          );
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text() as any;
        }

      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof SecurityAPIError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Wait before retry
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  private hashRequest(request: any): string {
    // Simple hash function for cache keys
    const str = JSON.stringify(request);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): any | null {
    if (!this.config.enableCache) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, customTimeout?: number): void {
    if (!this.config.enableCache) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up expired entries periodically
    if (this.cache.size > 100) { // Arbitrary limit
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.config.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export class SecurityAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public responseText?: string
  ) {
    super(message);
    this.name = 'SecurityAPIError';
  }
}

// Utility function to create a configured client
export function createSecurityAIClient(config?: SecurityAIClientConfig): SecurityAIClient {
  // Auto-detect configuration from environment
  const defaultConfig: SecurityAIClientConfig = {
    baseUrl: typeof window !== 'undefined' 
      ? window.location.origin + '/api/security'
      : process.env.SECURITY_AI_URL || 'http://localhost:8787/api/security',
    apiKey: typeof window !== 'undefined'
      ? (window as any).KATALYST_API_KEY
      : process.env.KATALYST_API_KEY,
    ...config,
  };

  return new SecurityAIClient(defaultConfig);
}

// Singleton instance for convenience
let defaultClient: SecurityAIClient | null = null;

export function getSecurityAIClient(): SecurityAIClient {
  if (!defaultClient) {
    defaultClient = createSecurityAIClient();
  }
  return defaultClient;
}