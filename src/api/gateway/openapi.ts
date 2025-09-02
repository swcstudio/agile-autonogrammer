/**
 * OpenAPI 3.0 Specification for autonogrammer.ai API
 * Comprehensive API documentation with interactive Swagger UI
 */

import { APIConfig } from './config';

export class OpenAPISpec {
  private config: APIConfig;

  constructor(config: APIConfig) {
    this.config = config;
  }

  public getSpec(): any {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Autonogrammer AI API',
        version: '1.0.0',
        description: `
# Autonogrammer AI API

Welcome to the **Autonogrammer AI API** - your gateway to advanced AI-powered development tools. Our API provides access to state-of-the-art language models specialized in code generation, security analysis, and software engineering tasks.

## Features

🤖 **Dual Model Architecture**
- **Qwen3-42B AI Coder**: Specialized in code generation, debugging, and software development
- **Qwen3-MOE Red Team**: Advanced security analysis and vulnerability detection

🔒 **Enterprise Security**
- Multi-tier authentication with API keys and OAuth2
- Comprehensive input/output filtering and validation
- Real-time threat detection and monitoring

📊 **Advanced Analytics**
- Usage tracking and cost optimization
- Performance monitoring and alerting
- Detailed request/response logging

⚡ **High Performance**
- <200ms response times with intelligent caching
- Auto-scaling infrastructure with load balancing
- 99.9% uptime SLA with global CDN

## Getting Started

1. **Sign up** for an account at [autonogrammer.ai](https://autonogrammer.ai)
2. **Generate** an API key from your dashboard
3. **Choose** your subscription tier (Free, Professional, Enterprise)
4. **Start building** with our comprehensive SDKs and examples

## Authentication

This API uses API Key authentication. Include your API key in the \`X-API-Key\` header:

\`\`\`bash
curl -H "X-API-Key: your-api-key-here" https://api.autonogrammer.ai/v1/models
\`\`\`

## Rate Limits

Rate limits vary by subscription tier:

| Tier | Requests/Hour | Concurrent | Max Tokens |
|------|---------------|------------|------------|
| Free | 1,000 | 5 | 4,096 |
| Professional | 10,000 | 20 | 8,192 |
| Enterprise | 100,000 | 100 | 16,384 |

## Support

- 📖 [Documentation](https://docs.autonogrammer.ai)
- 💬 [Community Discord](https://discord.gg/autonogrammer)
- 📧 [Enterprise Support](mailto:enterprise@autonogrammer.ai)
        `,
        termsOfService: 'https://autonogrammer.ai/terms',
        contact: {
          name: 'Autonogrammer Support',
          url: 'https://autonogrammer.ai/support',
          email: 'support@autonogrammer.ai',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `https://${this.config.domain.production.apiSubdomain}`,
          description: 'Production server',
        },
        {
          url: `https://${this.config.domain.staging.apiSubdomain}`,
          description: 'Staging server',
        },
        {
          url: `http://${this.config.domain.development.domain}:${this.config.domain.development.port}`,
          description: 'Development server',
        },
      ],
      paths: {
        '/health': {
          get: {
            tags: ['System'],
            summary: 'Health Check',
            description: 'Check the overall health status of the API',
            operationId: 'getHealth',
            responses: {
              '200': {
                description: 'System is healthy',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HealthStatus',
                    },
                  },
                },
              },
              '503': {
                description: 'System is unhealthy',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/HealthStatus',
                    },
                  },
                },
              },
            },
          },
        },
        '/v1/models': {
          get: {
            tags: ['Models'],
            summary: 'List Available Models',
            description: 'Get a list of available AI models based on your subscription tier',
            operationId: 'listModels',
            security: [{ ApiKeyAuth: [] }],
            responses: {
              '200': {
                description: 'List of available models',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ModelList',
                    },
                  },
                },
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '429': {
                $ref: '#/components/responses/RateLimited',
              },
            },
          },
        },
        '/v1/completions': {
          post: {
            tags: ['Completions'],
            summary: 'Create Completion',
            description: 'Generate text completions using the specified model',
            operationId: 'createCompletion',
            security: [{ ApiKeyAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CompletionRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Completion generated successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CompletionResponse',
                    },
                  },
                },
              },
              '400': {
                $ref: '#/components/responses/BadRequest',
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '403': {
                $ref: '#/components/responses/Forbidden',
              },
              '413': {
                $ref: '#/components/responses/PayloadTooLarge',
              },
              '429': {
                $ref: '#/components/responses/RateLimited',
              },
              '500': {
                $ref: '#/components/responses/InternalError',
              },
            },
          },
        },
        '/v1/chat/completions': {
          post: {
            tags: ['Chat'],
            summary: 'Create Chat Completion',
            description: 'Generate chat completions using the specified model with conversation context',
            operationId: 'createChatCompletion',
            security: [{ ApiKeyAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ChatCompletionRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Chat completion generated successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ChatCompletionResponse',
                    },
                  },
                },
              },
              '400': {
                $ref: '#/components/responses/BadRequest',
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '403': {
                $ref: '#/components/responses/Forbidden',
              },
              '413': {
                $ref: '#/components/responses/PayloadTooLarge',
              },
              '429': {
                $ref: '#/components/responses/RateLimited',
              },
              '500': {
                $ref: '#/components/responses/InternalError',
              },
            },
          },
        },
        '/v1/code/analysis': {
          post: {
            tags: ['Code Analysis'],
            summary: 'Analyze Code',
            description: 'Perform comprehensive code analysis including quality, performance, and maintainability assessment',
            operationId: 'analyzeCode',
            security: [{ ApiKeyAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CodeAnalysisRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Code analysis completed successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CodeAnalysisResponse',
                    },
                  },
                },
              },
              '400': {
                $ref: '#/components/responses/BadRequest',
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '403': {
                $ref: '#/components/responses/Forbidden',
              },
              '429': {
                $ref: '#/components/responses/RateLimited',
              },
              '500': {
                $ref: '#/components/responses/InternalError',
              },
            },
          },
        },
        '/v1/security/scan': {
          post: {
            tags: ['Security'],
            summary: 'Security Scan',
            description: 'Perform security vulnerability scanning and threat assessment on code',
            operationId: 'scanSecurity',
            security: [{ ApiKeyAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SecurityScanRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Security scan completed successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/SecurityScanResponse',
                    },
                  },
                },
              },
              '400': {
                $ref: '#/components/responses/BadRequest',
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '403': {
                $ref: '#/components/responses/Forbidden',
              },
              '429': {
                $ref: '#/components/responses/RateLimited',
              },
              '500': {
                $ref: '#/components/responses/InternalError',
              },
            },
          },
        },
        '/v1/usage': {
          get: {
            tags: ['Analytics'],
            summary: 'Get Usage Statistics',
            description: 'Retrieve current usage statistics, limits, and billing information',
            operationId: 'getUsage',
            security: [{ ApiKeyAuth: [] }],
            responses: {
              '200': {
                description: 'Usage statistics retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/UsageResponse',
                    },
                  },
                },
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '500': {
                $ref: '#/components/responses/InternalError',
              },
            },
          },
        },
        '/auth/api-keys': {
          post: {
            tags: ['Authentication'],
            summary: 'Create API Key',
            description: 'Generate a new API key for your account',
            operationId: 'createApiKey',
            security: [{ BearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreateApiKeyRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'API key created successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ApiKeyResponse',
                    },
                  },
                },
              },
              '400': {
                $ref: '#/components/responses/BadRequest',
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '500': {
                $ref: '#/components/responses/InternalError',
              },
            },
          },
          get: {
            tags: ['Authentication'],
            summary: 'List API Keys',
            description: 'Get a list of your API keys and their usage statistics',
            operationId: 'listApiKeys',
            security: [{ BearerAuth: [] }],
            responses: {
              '200': {
                description: 'API keys retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ApiKeyListResponse',
                    },
                  },
                },
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '500': {
                $ref: '#/components/responses/InternalError',
              },
            },
          },
        },
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for authentication. Get yours at https://autonogrammer.ai/dashboard',
          },
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for user authentication',
          },
        },
        schemas: {
          HealthStatus: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy'],
                description: 'Overall system health status',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Timestamp of the health check',
              },
              version: {
                type: 'string',
                description: 'API version',
              },
              uptime: {
                type: 'number',
                description: 'System uptime in seconds',
              },
              models: {
                type: 'object',
                description: 'Status of individual models',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['healthy', 'degraded', 'unhealthy'],
                    },
                    latency: {
                      type: 'number',
                      description: 'Response latency in milliseconds',
                    },
                    lastCheck: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                },
              },
            },
            required: ['status', 'timestamp', 'version'],
          },
          ModelList: {
            type: 'object',
            properties: {
              object: {
                type: 'string',
                enum: ['list'],
              },
              data: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Model',
                },
              },
            },
            required: ['object', 'data'],
          },
          Model: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Model identifier',
                example: 'qwen3_42b',
              },
              object: {
                type: 'string',
                enum: ['model'],
              },
              owned_by: {
                type: 'string',
                description: 'Model owner',
                example: 'autonogrammer',
              },
              name: {
                type: 'string',
                description: 'Human-readable model name',
                example: 'Qwen3-42B AI Coder',
              },
              capabilities: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'List of model capabilities',
                example: ['code_generation', 'debugging', 'refactoring'],
              },
              context_window: {
                type: 'integer',
                description: 'Maximum context window size in tokens',
                example: 262144,
              },
              max_tokens: {
                type: 'integer',
                description: 'Maximum output tokens per request',
                example: 16384,
              },
              pricing: {
                type: 'object',
                properties: {
                  inputTokens: {
                    type: 'number',
                    description: 'Cost per input token in USD',
                    example: 0.003,
                  },
                  outputTokens: {
                    type: 'number',
                    description: 'Cost per output token in USD',
                    example: 0.006,
                  },
                },
              },
            },
            required: ['id', 'object', 'owned_by', 'name'],
          },
          CompletionRequest: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'ID of the model to use',
                example: 'qwen3_42b',
                default: 'qwen3_42b',
              },
              prompt: {
                type: 'string',
                description: 'The prompt to complete',
                example: 'def fibonacci(n):',
              },
              max_tokens: {
                type: 'integer',
                description: 'Maximum tokens to generate',
                minimum: 1,
                maximum: 16384,
                default: 100,
                example: 150,
              },
              temperature: {
                type: 'number',
                description: 'Sampling temperature (0-2)',
                minimum: 0,
                maximum: 2,
                default: 1,
                example: 0.7,
              },
              top_p: {
                type: 'number',
                description: 'Nucleus sampling parameter',
                minimum: 0,
                maximum: 1,
                default: 1,
                example: 0.9,
              },
              n: {
                type: 'integer',
                description: 'Number of completions to generate',
                minimum: 1,
                maximum: 10,
                default: 1,
                example: 1,
              },
              stop: {
                oneOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } },
                ],
                description: 'Stop sequences',
                example: ['\n\n', '###'],
              },
            },
            required: ['prompt'],
          },
          CompletionResponse: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique completion ID',
                example: 'cmpl-7QyqpwdfhqwajicIEznoc6Q47XAyW',
              },
              object: {
                type: 'string',
                enum: ['text_completion'],
              },
              created: {
                type: 'integer',
                description: 'Unix timestamp of completion creation',
                example: 1677664795,
              },
              model: {
                type: 'string',
                description: 'Model used for completion',
                example: 'qwen3_42b',
              },
              choices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: {
                      type: 'string',
                      description: 'Generated text',
                    },
                    index: {
                      type: 'integer',
                      description: 'Choice index',
                    },
                    logprobs: {
                      type: 'object',
                      nullable: true,
                      description: 'Log probabilities',
                    },
                    finish_reason: {
                      type: 'string',
                      enum: ['stop', 'length', 'content_filter'],
                      description: 'Reason completion finished',
                    },
                  },
                },
              },
              usage: {
                $ref: '#/components/schemas/Usage',
              },
            },
            required: ['id', 'object', 'created', 'model', 'choices'],
          },
          ChatCompletionRequest: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'ID of the model to use',
                example: 'qwen3_42b',
                default: 'qwen3_42b',
              },
              messages: {
                type: 'array',
                description: 'List of messages in the conversation',
                items: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['system', 'user', 'assistant'],
                      description: 'Role of the message author',
                    },
                    content: {
                      type: 'string',
                      description: 'Content of the message',
                    },
                  },
                  required: ['role', 'content'],
                },
                example: [
                  {
                    role: 'system',
                    content: 'You are a helpful coding assistant.',
                  },
                  {
                    role: 'user',
                    content: 'Write a Python function to reverse a string.',
                  },
                ],
              },
              max_tokens: {
                type: 'integer',
                description: 'Maximum tokens to generate',
                minimum: 1,
                maximum: 16384,
                default: 100,
                example: 150,
              },
              temperature: {
                type: 'number',
                description: 'Sampling temperature (0-2)',
                minimum: 0,
                maximum: 2,
                default: 1,
                example: 0.7,
              },
              top_p: {
                type: 'number',
                description: 'Nucleus sampling parameter',
                minimum: 0,
                maximum: 1,
                default: 1,
                example: 0.9,
              },
              n: {
                type: 'integer',
                description: 'Number of completions to generate',
                minimum: 1,
                maximum: 10,
                default: 1,
                example: 1,
              },
              stream: {
                type: 'boolean',
                description: 'Whether to stream responses',
                default: false,
              },
            },
            required: ['messages'],
          },
          ChatCompletionResponse: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique completion ID',
                example: 'chatcmpl-7QyqpwdfhqwajicIEznoc6Q47XAyW',
              },
              object: {
                type: 'string',
                enum: ['chat.completion'],
              },
              created: {
                type: 'integer',
                description: 'Unix timestamp of completion creation',
                example: 1677664795,
              },
              model: {
                type: 'string',
                description: 'Model used for completion',
                example: 'qwen3_42b',
              },
              choices: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: {
                      type: 'integer',
                      description: 'Choice index',
                    },
                    message: {
                      type: 'object',
                      properties: {
                        role: {
                          type: 'string',
                          enum: ['assistant'],
                        },
                        content: {
                          type: 'string',
                          description: 'Generated response',
                        },
                      },
                      required: ['role', 'content'],
                    },
                    finish_reason: {
                      type: 'string',
                      enum: ['stop', 'length', 'content_filter'],
                      description: 'Reason completion finished',
                    },
                  },
                },
              },
              usage: {
                $ref: '#/components/schemas/Usage',
              },
            },
            required: ['id', 'object', 'created', 'model', 'choices'],
          },
          CodeAnalysisRequest: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Source code to analyze',
                example: 'def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]',
              },
              language: {
                type: 'string',
                description: 'Programming language',
                example: 'python',
                enum: ['python', 'javascript', 'typescript', 'java', 'cpp', 'rust', 'go', 'php', 'ruby'],
              },
              analysis_type: {
                type: 'string',
                description: 'Type of analysis to perform',
                example: 'quality',
                enum: ['quality', 'performance', 'maintainability'],
                default: 'quality',
              },
            },
            required: ['code', 'language'],
          },
          CodeAnalysisResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Whether analysis completed successfully',
              },
              analysis: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    description: 'Type of analysis performed',
                  },
                  language: {
                    type: 'string',
                    description: 'Programming language analyzed',
                  },
                  result: {
                    type: 'string',
                    description: 'Detailed analysis results',
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score (0-1)',
                    minimum: 0,
                    maximum: 1,
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Analysis timestamp',
                  },
                },
                required: ['type', 'language', 'result', 'confidence', 'timestamp'],
              },
              usage: {
                $ref: '#/components/schemas/Usage',
              },
            },
            required: ['success', 'analysis'],
          },
          SecurityScanRequest: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Source code to scan for vulnerabilities',
                example: 'SELECT * FROM users WHERE username = "' + username + '" AND password = "' + password + '"',
              },
              language: {
                type: 'string',
                description: 'Programming language',
                example: 'sql',
                enum: ['python', 'javascript', 'typescript', 'java', 'cpp', 'rust', 'go', 'php', 'ruby', 'sql'],
              },
              scan_type: {
                type: 'string',
                description: 'Type of security scan to perform',
                example: 'vulnerability',
                enum: ['vulnerability', 'injection', 'authentication'],
                default: 'vulnerability',
              },
            },
            required: ['code', 'language'],
          },
          SecurityScanResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Whether scan completed successfully',
              },
              scan: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    description: 'Type of security scan performed',
                  },
                  language: {
                    type: 'string',
                    description: 'Programming language scanned',
                  },
                  findings: {
                    type: 'string',
                    description: 'Detailed security findings',
                  },
                  risk_level: {
                    type: 'string',
                    enum: ['low', 'medium', 'high', 'critical'],
                    description: 'Overall risk level assessment',
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Scan timestamp',
                  },
                },
                required: ['type', 'language', 'findings', 'risk_level', 'timestamp'],
              },
              usage: {
                $ref: '#/components/schemas/Usage',
              },
            },
            required: ['success', 'scan'],
          },
          Usage: {
            type: 'object',
            properties: {
              prompt_tokens: {
                type: 'integer',
                description: 'Number of tokens in the prompt',
                example: 25,
              },
              completion_tokens: {
                type: 'integer',
                description: 'Number of tokens in the completion',
                example: 150,
              },
              total_tokens: {
                type: 'integer',
                description: 'Total number of tokens used',
                example: 175,
              },
            },
            required: ['prompt_tokens', 'completion_tokens', 'total_tokens'],
          },
          UsageResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Whether request was successful',
              },
              usage: {
                type: 'object',
                properties: {
                  current_period: {
                    type: 'object',
                    properties: {
                      start: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Current billing period start',
                      },
                      end: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Current billing period end',
                      },
                    },
                  },
                  requests: {
                    type: 'object',
                    properties: {
                      count: {
                        type: 'integer',
                        description: 'Requests made in current period',
                      },
                      limit: {
                        type: 'integer',
                        description: 'Request limit for current tier',
                      },
                    },
                  },
                  tokens: {
                    type: 'object',
                    properties: {
                      input: {
                        type: 'integer',
                        description: 'Input tokens used',
                      },
                      output: {
                        type: 'integer',
                        description: 'Output tokens used',
                      },
                      total: {
                        type: 'integer',
                        description: 'Total tokens used',
                      },
                    },
                  },
                  cost: {
                    type: 'object',
                    properties: {
                      current_period: {
                        type: 'number',
                        description: 'Cost for current period in USD',
                      },
                      projected_monthly: {
                        type: 'number',
                        description: 'Projected monthly cost in USD',
                      },
                    },
                  },
                  limits: {
                    type: 'object',
                    properties: {
                      tier: {
                        type: 'string',
                        description: 'Current subscription tier',
                      },
                      requests_per_hour: {
                        type: 'integer',
                        description: 'Request rate limit per hour',
                      },
                      concurrent_requests: {
                        type: 'integer',
                        description: 'Concurrent request limit',
                      },
                      max_tokens_per_request: {
                        type: 'integer',
                        description: 'Maximum tokens per request',
                      },
                    },
                  },
                },
              },
            },
            required: ['success', 'usage'],
          },
          CreateApiKeyRequest: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Human-readable name for the API key',
                example: 'Production API Key',
              },
              tier: {
                type: 'string',
                enum: ['free', 'professional', 'enterprise'],
                description: 'Subscription tier for this API key',
                default: 'free',
              },
            },
            required: ['name'],
          },
          ApiKeyResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Whether API key was created successfully',
              },
              apiKey: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Unique API key ID',
                  },
                  name: {
                    type: 'string',
                    description: 'Human-readable name',
                  },
                  key: {
                    type: 'string',
                    description: 'The actual API key (only shown once)',
                  },
                  tier: {
                    type: 'string',
                    description: 'Subscription tier',
                  },
                  createdAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Creation timestamp',
                  },
                  expiresAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Expiration timestamp',
                  },
                },
                required: ['id', 'name', 'key', 'tier', 'createdAt'],
              },
            },
            required: ['success', 'apiKey'],
          },
          ApiKeyListResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Whether request was successful',
              },
              apiKeys: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'Unique API key ID',
                    },
                    name: {
                      type: 'string',
                      description: 'Human-readable name',
                    },
                    tier: {
                      type: 'string',
                      description: 'Subscription tier',
                    },
                    createdAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Creation timestamp',
                    },
                    expiresAt: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Expiration timestamp',
                    },
                    lastUsed: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Last usage timestamp',
                      nullable: true,
                    },
                    usageStats: {
                      type: 'object',
                      properties: {
                        requests: {
                          type: 'integer',
                          description: 'Total requests made',
                        },
                        tokens: {
                          type: 'integer',
                          description: 'Total tokens used',
                        },
                        cost: {
                          type: 'number',
                          description: 'Total cost in USD',
                        },
                      },
                    },
                  },
                  required: ['id', 'name', 'tier', 'createdAt'],
                },
              },
            },
            required: ['success', 'apiKeys'],
          },
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: 'Error message',
              },
              message: {
                type: 'string',
                description: 'Detailed error description',
              },
              type: {
                type: 'string',
                description: 'Error type',
              },
              param: {
                type: 'string',
                description: 'Invalid parameter name',
              },
              code: {
                type: 'string',
                description: 'Error code',
              },
              requestId: {
                type: 'string',
                description: 'Unique request ID for debugging',
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Error timestamp',
              },
            },
            required: ['error'],
          },
        },
        responses: {
          BadRequest: {
            description: 'Bad Request - Invalid parameters',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          Unauthorized: {
            description: 'Unauthorized - Invalid API key',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          Forbidden: {
            description: 'Forbidden - Insufficient permissions',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          PayloadTooLarge: {
            description: 'Payload Too Large - Request exceeds size limits',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          RateLimited: {
            description: 'Rate Limited - Too many requests',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
            headers: {
              'X-RateLimit-Limit': {
                description: 'Request limit per time window',
                schema: {
                  type: 'integer',
                },
              },
              'X-RateLimit-Remaining': {
                description: 'Remaining requests in current window',
                schema: {
                  type: 'integer',
                },
              },
              'X-RateLimit-Reset': {
                description: 'Time when rate limit resets',
                schema: {
                  type: 'integer',
                },
              },
              'Retry-After': {
                description: 'Seconds to wait before retrying',
                schema: {
                  type: 'integer',
                },
              },
            },
          },
          InternalError: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
        },
      },
      tags: [
        {
          name: 'System',
          description: 'System health and status endpoints',
        },
        {
          name: 'Authentication',
          description: 'API key management and OAuth2 authentication',
        },
        {
          name: 'Models',
          description: 'Model information and capabilities',
        },
        {
          name: 'Completions',
          description: 'Text completion generation',
        },
        {
          name: 'Chat',
          description: 'Conversational AI completions',
        },
        {
          name: 'Code Analysis',
          description: 'Code quality and performance analysis',
        },
        {
          name: 'Security',
          description: 'Security vulnerability scanning and assessment',
        },
        {
          name: 'Analytics',
          description: 'Usage statistics and billing information',
        },
      ],
      externalDocs: {
        description: 'Complete API Documentation',
        url: 'https://docs.autonogrammer.ai',
      },
    };
  }
}