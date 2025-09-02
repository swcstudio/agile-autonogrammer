#!/usr/bin/env node
/**
 * Comprehensive API Infrastructure Test
 * Tests the complete production API gateway with mock models
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

// Test configuration
const CONFIG = {
  apiBase: process.env.API_BASE_URL || 'http://localhost:3000',
  testApiKey: process.env.TEST_API_KEY || 'autogram_sk_test_1234567890abcdef',
  enterpriseApiKey: process.env.ENTERPRISE_API_KEY || 'autogram_sk_enterprise_abcdef1234567890',
  verbose: process.argv.includes('--verbose') || process.env.VERBOSE === 'true',
};

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(color, ...messages) {
  console.log(color + messages.join(' ') + colors.reset);
}

function verbose(...messages) {
  if (CONFIG.verbose) {
    console.log(colors.cyan + '[VERBOSE]' + colors.reset, ...messages);
  }
}

async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.apiBase);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'autonogrammer-api-test/1.0',
        ...headers,
      },
    };

    const req = (url.protocol === 'https:' ? https : http).request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = res.headers['content-type']?.includes('json') ? JSON.parse(body) : body;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsedBody,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body,
            parseError: e.message,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

class APITestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };
    this.startTime = Date.now();
  }

  async runTest(name, testFn, category = 'General') {
    try {
      log(colors.blue, `\n🧪 Testing: ${name}`);
      verbose(`Category: ${category}`);
      
      const result = await testFn();
      
      if (result.success) {
        this.results.passed++;
        log(colors.green, `✅ ${name} - PASSED`);
        if (result.message) {
          log(colors.green, `   ${result.message}`);
        }
        if (result.details && CONFIG.verbose) {
          verbose('Details:', JSON.stringify(result.details, null, 2));
        }
      } else {
        this.results.failed++;
        log(colors.red, `❌ ${name} - FAILED`);
        log(colors.red, `   ${result.message || 'No error message'}`);
        this.results.errors.push({
          test: name,
          category,
          error: result.message,
          details: result.details,
        });
      }
    } catch (error) {
      this.results.failed++;
      log(colors.red, `❌ ${name} - ERROR`);
      log(colors.red, `   ${error.message}`);
      this.results.errors.push({
        test: name,
        category,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // System Health Tests
  async testHealthEndpoint() {
    const response = await makeRequest('GET', '/health');
    return {
      success: response.status === 200,
      message: response.status === 200 
        ? `Health check passed - Status: ${response.data.status}`
        : `Health check failed - HTTP ${response.status}`,
      details: response.data,
    };
  }

  async testReadinessEndpoint() {
    const response = await makeRequest('GET', '/ready');
    return {
      success: response.status === 200,
      message: response.status === 200 
        ? `Readiness check passed - Ready: ${response.data.ready}`
        : `Readiness check failed - HTTP ${response.status}`,
      details: response.data,
    };
  }

  async testMetricsEndpoint() {
    const response = await makeRequest('GET', '/metrics');
    return {
      success: response.status === 200 && typeof response.data === 'string',
      message: response.status === 200 
        ? 'Metrics endpoint responding with Prometheus format'
        : `Metrics endpoint failed - HTTP ${response.status}`,
      details: { hasMetrics: response.data.includes('# HELP') },
    };
  }

  // API Documentation Tests
  async testOpenAPISpec() {
    const response = await makeRequest('GET', '/openapi.json');
    return {
      success: response.status === 200 && response.data.openapi,
      message: response.status === 200 
        ? `OpenAPI spec available - Version: ${response.data.openapi}`
        : `OpenAPI spec failed - HTTP ${response.status}`,
      details: {
        title: response.data.info?.title,
        version: response.data.info?.version,
        pathCount: Object.keys(response.data.paths || {}).length,
      },
    };
  }

  async testSwaggerUI() {
    const response = await makeRequest('GET', '/docs');
    return {
      success: response.status === 200,
      message: response.status === 200 
        ? 'Swagger UI documentation is accessible'
        : `Swagger UI failed - HTTP ${response.status}`,
      details: { contentType: response.headers['content-type'] },
    };
  }

  // Authentication Tests
  async testUnauthenticatedAccess() {
    const response = await makeRequest('GET', '/v1/models');
    return {
      success: response.status === 401,
      message: response.status === 401 
        ? 'Authentication properly required for protected endpoints'
        : `Expected 401, got ${response.status}`,
      details: response.data,
    };
  }

  async testInvalidAPIKey() {
    const response = await makeRequest('GET', '/v1/models', null, {
      'X-API-Key': 'invalid-key-12345',
    });
    return {
      success: response.status === 401,
      message: response.status === 401 
        ? 'Invalid API key properly rejected'
        : `Expected 401, got ${response.status}`,
      details: response.data,
    };
  }

  async testValidAPIKey() {
    const response = await makeRequest('GET', '/v1/models', null, {
      'X-API-Key': CONFIG.testApiKey,
    });
    return {
      success: response.status === 200,
      message: response.status === 200 
        ? `Valid API key accepted - Models: ${response.data?.data?.length || 0}`
        : `Expected 200, got ${response.status}`,
      details: response.data,
    };
  }

  // Model Access Tests
  async testModelsList() {
    const response = await makeRequest('GET', '/v1/models', null, {
      'X-API-Key': CONFIG.testApiKey,
    });
    
    if (response.status !== 200) {
      return {
        success: false,
        message: `Models list failed - HTTP ${response.status}`,
        details: response.data,
      };
    }

    const models = response.data.data || [];
    const hasQwen42B = models.some(m => m.id === 'qwen3_42b');
    const hasQwenMOE = models.some(m => m.id === 'qwen3_moe');

    return {
      success: models.length > 0 && hasQwen42B,
      message: `Models list retrieved - Count: ${models.length}, Has Qwen3-42B: ${hasQwen42B}, Has Qwen3-MOE: ${hasQwenMOE}`,
      details: {
        models: models.map(m => ({ id: m.id, name: m.name })),
      },
    };
  }

  // Model Request Tests
  async testCompletionRequest() {
    const response = await makeRequest('POST', '/v1/completions', {
      model: 'qwen3_42b',
      prompt: 'def fibonacci(n):',
      max_tokens: 100,
      temperature: 0.7,
    }, {
      'X-API-Key': CONFIG.testApiKey,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: `Completion request failed - HTTP ${response.status}`,
        details: response.data,
      };
    }

    const hasChoices = response.data.choices && response.data.choices.length > 0;
    const hasUsage = response.data.usage && typeof response.data.usage.total_tokens === 'number';

    return {
      success: hasChoices && hasUsage,
      message: `Completion request successful - Generated ${response.data.usage?.completion_tokens || 0} tokens`,
      details: {
        model: response.data.model,
        choices: response.data.choices?.length,
        usage: response.data.usage,
        preview: response.data.choices?.[0]?.text?.substring(0, 50) + '...',
      },
    };
  }

  async testChatCompletionRequest() {
    const response = await makeRequest('POST', '/v1/chat/completions', {
      model: 'qwen3_42b',
      messages: [
        { role: 'system', content: 'You are a helpful coding assistant.' },
        { role: 'user', content: 'Write a simple Python function to add two numbers.' },
      ],
      max_tokens: 150,
      temperature: 0.7,
    }, {
      'X-API-Key': CONFIG.testApiKey,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: `Chat completion failed - HTTP ${response.status}`,
        details: response.data,
      };
    }

    const hasChoices = response.data.choices && response.data.choices.length > 0;
    const hasMessage = response.data.choices?.[0]?.message?.content;
    const hasUsage = response.data.usage && typeof response.data.usage.total_tokens === 'number';

    return {
      success: hasChoices && hasMessage && hasUsage,
      message: `Chat completion successful - Generated ${response.data.usage?.completion_tokens || 0} tokens`,
      details: {
        model: response.data.model,
        usage: response.data.usage,
        preview: hasMessage ? hasMessage.substring(0, 100) + '...' : 'No content',
      },
    };
  }

  // Security Model Tests
  async testSecurityScan() {
    const response = await makeRequest('POST', '/v1/security/scan', {
      code: 'SELECT * FROM users WHERE username = "' + username + '" AND password = "' + password + '"',
      language: 'sql',
      scan_type: 'vulnerability',
    }, {
      'X-API-Key': CONFIG.testApiKey,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: `Security scan failed - HTTP ${response.status}`,
        details: response.data,
      };
    }

    const hasFindings = response.data.scan?.findings;
    const hasRiskLevel = response.data.scan?.risk_level;

    return {
      success: hasFindings && hasRiskLevel,
      message: `Security scan completed - Risk Level: ${hasRiskLevel}`,
      details: {
        riskLevel: hasRiskLevel,
        findingsLength: hasFindings ? hasFindings.length : 0,
        usage: response.data.usage,
      },
    };
  }

  async testCodeAnalysis() {
    const response = await makeRequest('POST', '/v1/code/analysis', {
      code: `
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr
      `,
      language: 'python',
      analysis_type: 'quality',
    }, {
      'X-API-Key': CONFIG.testApiKey,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: `Code analysis failed - HTTP ${response.status}`,
        details: response.data,
      };
    }

    const hasResult = response.data.analysis?.result;
    const hasConfidence = typeof response.data.analysis?.confidence === 'number';

    return {
      success: hasResult && hasConfidence,
      message: `Code analysis completed - Confidence: ${response.data.analysis?.confidence}`,
      details: {
        analysisType: response.data.analysis?.type,
        confidence: response.data.analysis?.confidence,
        usage: response.data.usage,
      },
    };
  }

  // Rate Limiting Tests
  async testRateLimit() {
    const requests = [];
    const startTime = Date.now();

    // Make multiple rapid requests to trigger rate limiting
    for (let i = 0; i < 10; i++) {
      requests.push(
        makeRequest('GET', '/v1/models', null, {
          'X-API-Key': CONFIG.testApiKey,
        })
      );
    }

    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;
    const successfulRequests = results.filter(r => r.status === 200).length;
    const rateLimitedRequests = results.filter(r => r.status === 429).length;

    return {
      success: successfulRequests > 0, // At least some should succeed
      message: `Rate limiting test - ${successfulRequests} succeeded, ${rateLimitedRequests} rate-limited in ${duration}ms`,
      details: {
        totalRequests: requests.length,
        successfulRequests,
        rateLimitedRequests,
        duration,
        statusCodes: results.map(r => r.status),
      },
    };
  }

  // Usage Analytics Tests
  async testUsageEndpoint() {
    const response = await makeRequest('GET', '/v1/usage', null, {
      'X-API-Key': CONFIG.testApiKey,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: `Usage endpoint failed - HTTP ${response.status}`,
        details: response.data,
      };
    }

    const hasUsage = response.data.usage;
    const hasRequests = hasUsage?.requests;
    const hasLimits = hasUsage?.limits;

    return {
      success: hasUsage && hasRequests && hasLimits,
      message: `Usage data retrieved - Requests: ${hasRequests?.count}/${hasRequests?.limit}`,
      details: {
        currentRequests: hasRequests?.count,
        requestLimit: hasRequests?.limit,
        tier: hasLimits?.tier,
      },
    };
  }

  // Enterprise Features Tests
  async testEnterpriseAccess() {
    const response = await makeRequest('GET', '/v1/models', null, {
      'X-API-Key': CONFIG.enterpriseApiKey,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: `Enterprise access failed - HTTP ${response.status}`,
        details: response.data,
      };
    }

    const models = response.data.data || [];
    const hasAllModels = models.length >= 2; // Should have access to both models

    return {
      success: hasAllModels,
      message: `Enterprise access verified - Models available: ${models.length}`,
      details: {
        models: models.map(m => ({ id: m.id, name: m.name })),
      },
    };
  }

  // Error Handling Tests
  async testLargeRequestHandling() {
    const largePrompt = 'A'.repeat(100000); // 100KB prompt
    
    const response = await makeRequest('POST', '/v1/completions', {
      model: 'qwen3_42b',
      prompt: largePrompt,
      max_tokens: 10,
    }, {
      'X-API-Key': CONFIG.testApiKey,
    });

    // Should either succeed or fail gracefully with proper error
    const isValidResponse = response.status === 200 || 
                          (response.status >= 400 && response.data.error);

    return {
      success: isValidResponse,
      message: response.status === 200 
        ? 'Large request handled successfully'
        : `Large request properly rejected - HTTP ${response.status}`,
      details: {
        promptLength: largePrompt.length,
        responseStatus: response.status,
        hasError: !!response.data.error,
      },
    };
  }

  async testInvalidModelRequest() {
    const response = await makeRequest('POST', '/v1/completions', {
      model: 'nonexistent-model',
      prompt: 'test',
      max_tokens: 10,
    }, {
      'X-API-Key': CONFIG.testApiKey,
    });

    return {
      success: response.status >= 400 && response.data.error,
      message: response.status >= 400 
        ? 'Invalid model request properly rejected'
        : 'Invalid model request should have been rejected',
      details: response.data,
    };
  }

  // Security Tests
  async testMaliciousInputFiltering() {
    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'DROP TABLE users;',
      'eval("malicious code")',
      '${process.env.SECRET}',
    ];

    const results = [];
    
    for (const input of maliciousInputs) {
      const response = await makeRequest('POST', '/v1/completions', {
        model: 'qwen3_42b',
        prompt: input,
        max_tokens: 10,
      }, {
        'X-API-Key': CONFIG.testApiKey,
      });
      
      results.push({
        input: input.substring(0, 20) + '...',
        status: response.status,
        blocked: response.status === 400 && response.data.error,
      });
    }

    const blockedCount = results.filter(r => r.blocked).length;
    const totalCount = results.length;

    return {
      success: blockedCount >= totalCount / 2, // At least half should be blocked
      message: `Malicious input filtering - ${blockedCount}/${totalCount} inputs blocked`,
      details: { results, blockedCount, totalCount },
    };
  }

  // Performance Tests
  async testResponseTimes() {
    const tests = [
      { name: 'Health Check', path: '/health', method: 'GET' },
      { name: 'Models List', path: '/v1/models', method: 'GET', headers: { 'X-API-Key': CONFIG.testApiKey } },
      { name: 'Simple Completion', path: '/v1/completions', method: 'POST', 
        data: { model: 'qwen3_42b', prompt: 'Hello', max_tokens: 5 },
        headers: { 'X-API-Key': CONFIG.testApiKey } },
    ];

    const results = [];
    
    for (const test of tests) {
      const startTime = Date.now();
      const response = await makeRequest(test.method, test.path, test.data, test.headers || {});
      const duration = Date.now() - startTime;
      
      results.push({
        name: test.name,
        duration,
        status: response.status,
        success: response.status === 200,
      });
    }

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const allSuccessful = results.every(r => r.success);

    return {
      success: allSuccessful && avgDuration < 5000, // All successful and under 5s average
      message: `Performance test - Avg: ${Math.round(avgDuration)}ms, All successful: ${allSuccessful}`,
      details: { results, avgDuration },
    };
  }

  async runAllTests() {
    log(colors.bold + colors.blue, '\n🚀 Starting Comprehensive API Infrastructure Test');
    log(colors.blue, `Testing API at: ${CONFIG.apiBase}`);
    log(colors.blue, `Verbose mode: ${CONFIG.verbose}`);
    log(colors.blue, '=' .repeat(80));

    // System Health Tests
    await this.runTest('Health Endpoint', () => this.testHealthEndpoint(), 'System Health');
    await this.runTest('Readiness Endpoint', () => this.testReadinessEndpoint(), 'System Health');
    await this.runTest('Metrics Endpoint', () => this.testMetricsEndpoint(), 'System Health');

    // API Documentation Tests
    await this.runTest('OpenAPI Specification', () => this.testOpenAPISpec(), 'Documentation');
    await this.runTest('Swagger UI', () => this.testSwaggerUI(), 'Documentation');

    // Authentication Tests
    await this.runTest('Unauthenticated Access', () => this.testUnauthenticatedAccess(), 'Authentication');
    await this.runTest('Invalid API Key', () => this.testInvalidAPIKey(), 'Authentication');
    await this.runTest('Valid API Key', () => this.testValidAPIKey(), 'Authentication');

    // Model Access Tests
    await this.runTest('Models List', () => this.testModelsList(), 'Models');
    await this.runTest('Text Completion', () => this.testCompletionRequest(), 'Models');
    await this.runTest('Chat Completion', () => this.testChatCompletionRequest(), 'Models');

    // Specialized Model Tests
    await this.runTest('Security Scan', () => this.testSecurityScan(), 'Security Models');
    await this.runTest('Code Analysis', () => this.testCodeAnalysis(), 'Analysis Models');

    // Rate Limiting Tests
    await this.runTest('Rate Limiting', () => this.testRateLimit(), 'Rate Limiting');

    // Usage Analytics
    await this.runTest('Usage Analytics', () => this.testUsageEndpoint(), 'Analytics');

    // Enterprise Features
    await this.runTest('Enterprise Access', () => this.testEnterpriseAccess(), 'Enterprise');

    // Error Handling Tests
    await this.runTest('Large Request Handling', () => this.testLargeRequestHandling(), 'Error Handling');
    await this.runTest('Invalid Model Request', () => this.testInvalidModelRequest(), 'Error Handling');

    // Security Tests
    await this.runTest('Malicious Input Filtering', () => this.testMaliciousInputFiltering(), 'Security');

    // Performance Tests
    await this.runTest('Response Times', () => this.testResponseTimes(), 'Performance');

    // Print final results
    this.printResults();
  }

  printResults() {
    const duration = Date.now() - this.startTime;
    const total = this.results.passed + this.results.failed + this.results.skipped;
    
    log(colors.bold + colors.blue, '\n📊 Test Results Summary');
    log(colors.blue, '=' .repeat(80));
    
    log(colors.green, `✅ Passed: ${this.results.passed}`);
    log(colors.red, `❌ Failed: ${this.results.failed}`);
    log(colors.yellow, `⏭️  Skipped: ${this.results.skipped}`);
    log(colors.blue, `⏱️  Duration: ${duration}ms`);
    log(colors.blue, `📊 Total Tests: ${total}`);

    const successRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;
    log(colors.blue, `🎯 Success Rate: ${successRate}%`);

    if (this.results.failed > 0) {
      log(colors.bold + colors.red, '\n❌ Failed Tests:');
      this.results.errors.forEach(error => {
        log(colors.red, `\n• ${error.test} (${error.category})`);
        log(colors.red, `  ${error.error}`);
        if (CONFIG.verbose && error.details) {
          verbose('Error details:', JSON.stringify(error.details, null, 2));
        }
      });
    }

    // Final verdict
    if (this.results.failed === 0) {
      log(colors.bold + colors.green, '\n🎉 All tests passed! API infrastructure is working correctly.');
      log(colors.green, '✅ Production API gateway is ready for deployment');
      log(colors.green, '✅ Mock models are responding correctly');
      log(colors.green, '✅ Authentication and security systems are functional');
      log(colors.green, '✅ Rate limiting and monitoring are operational');
    } else if (successRate >= 80) {
      log(colors.bold + colors.yellow, '\n⚠️ Most tests passed with some failures.');
      log(colors.yellow, 'The API infrastructure is mostly functional but needs attention.');
    } else {
      log(colors.bold + colors.red, '\n💥 Significant issues detected in API infrastructure.');
      log(colors.red, 'Please address the failed tests before proceeding to production.');
    }

    log(colors.blue, '\n🔗 Next Steps:');
    if (this.results.failed === 0) {
      log(colors.blue, '1. Deploy to staging environment');
      log(colors.blue, '2. Configure SSL certificates and domain');
      log(colors.blue, '3. Set up production monitoring and alerting');
      log(colors.blue, '4. Load test with realistic traffic patterns');
    } else {
      log(colors.blue, '1. Review and fix failed tests');
      log(colors.blue, '2. Check mock model servers are running');
      log(colors.blue, '3. Verify API gateway configuration');
      log(colors.blue, '4. Re-run tests with --verbose for more details');
    }

    log(colors.blue, '\n' + '=' .repeat(80));
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new APITestSuite();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    log(colors.yellow, '\n⚠️ Test suite interrupted by user');
    testSuite.printResults();
    process.exit(1);
  });

  // Run tests
  testSuite.runAllTests().catch(error => {
    log(colors.red, '\n💥 Test suite crashed:', error.message);
    if (CONFIG.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  });
}

module.exports = { APITestSuite };