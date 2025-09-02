# PRD-003: AI/ML Package Integration with WASM Acceleration

## Executive Summary

**Objective**: Migrate Katalyst's AI/ML packages to Agile-Programmers with TypeScript Hook architecture, integrating 50+ AI models with WASM-accelerated inference and advanced security features through Llama Guard 3.

**Success Metrics**:
- 50+ AI models accessible through unified hook interface
- WASM-accelerated inference achieves >3x performance improvement
- AI security system prevents harmful content generation
- Edge AI deployment with <50ms global latency

## AI/ML Package Ecosystem

### Core AI Packages
```
packages/ai/              - Main AI integration (50+ models)
packages/ai-osx/          - macOS-specific AI features (5+ models)
packages/security-ai/     - Llama Guard 3 content moderation (10+ models)
```

### AI Capabilities Analysis

**Package: `packages/ai/`** - Main AI Integration
```typescript
// Current AI Package Structure Analysis
// Target: 50+ AI models including Llama 4 Scout, GPT-4, Claude, Gemini
// Multimodal: Text, vision, speech, code generation
// Edge AI: Cloudflare Workers AI integration
// Built-in RAG: Vector search with embeddings
```

**Package: `packages/security-ai/`** - AI Security System
```typescript
// Llama Guard 3 Content Moderation
// Target: Prevent harmful content, ensure safe AI interactions
// Capabilities: Real-time content filtering, threat detection
```

**Package: `packages/ai-osx/`** - macOS AI Acceleration
```typescript
// macOS-specific AI optimizations
// Target: Core ML integration, Metal Performance Shaders
// Use Cases: On-device inference, privacy-first AI
```

## Hook Architecture Design

### Core AI Hook System
```typescript
// packages/hooks/src/ai/useAI.ts - Primary AI Hook Interface
export interface AIHookSystem {
  // Model Management
  availableModels: AIModel[];
  currentModel: AIModel | null;
  switchModel: (modelId: string) => Promise<void>;
  
  // Text Generation
  generate: (prompt: string, config?: GenerationConfig) => Promise<AIResponse>;
  stream: (prompt: string, config?: GenerationConfig) => AsyncGenerator<AIResponseChunk>;
  
  // Multimodal Capabilities
  generateWithImages: (prompt: string, images: File[], config?: MultimodalConfig) => Promise<AIResponse>;
  speechToText: (audio: File, config?: STTConfig) => Promise<string>;
  textToSpeech: (text: string, config?: TTSConfig) => Promise<AudioBuffer>;
  
  // Code Generation
  generateCode: (prompt: string, language: string, config?: CodeGenConfig) => Promise<CodeResponse>;
  reviewCode: (code: string, language: string) => Promise<CodeReviewResponse>;
  
  // RAG & Knowledge
  vectorSearch: (query: string, index: string) => Promise<SearchResult[]>;
  addToKnowledgeBase: (content: string, metadata: any) => Promise<void>;
  
  // Performance & Security
  isLoading: boolean;
  error: AIError | null;
  securityStatus: SecurityStatus;
  performanceMetrics: AIMetrics;
}

export function useAI(config?: AIConfig): AIHookSystem {
  const [currentModel, setCurrentModel] = useState<AIModel | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AIError | null>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>('safe');
  const [performanceMetrics, setPerformanceMetrics] = useState<AIMetrics>({});
  
  // WASM-accelerated inference integration
  const { rust: rustWasm } = useWasmRuntime();
  const security = useAISecurity();
  
  const generate = useCallback(async (prompt: string, config?: GenerationConfig) => {
    if (!currentModel) throw new Error('No AI model selected');
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Content moderation check
      const moderationResult = await security.moderateContent(prompt);
      if (moderationResult.flagged) {
        throw new AIError('Content flagged by security system', 'CONTENT_MODERATED');
      }
      
      const startTime = performance.now();
      
      // Use WASM acceleration for local models
      let response: AIResponse;
      if (currentModel.runtime === 'wasm' && rustWasm.isLoaded) {
        response = await generateWithWasm(prompt, config);
      } else {
        response = await generateWithAPI(prompt, config);
      }
      
      const duration = performance.now() - startTime;
      
      // Update performance metrics
      setPerformanceMetrics(prev => ({
        ...prev,
        lastInferenceTime: duration,
        totalInferences: (prev.totalInferences || 0) + 1,
        averageLatency: calculateAverageLatency(prev, duration)
      }));
      
      // Post-generation content check
      const responseModeration = await security.moderateContent(response.content);
      if (responseModeration.flagged) {
        throw new AIError('Generated content flagged by security system', 'OUTPUT_MODERATED');
      }
      
      setIsLoading(false);
      return response;
      
    } catch (err) {
      setError(err as AIError);
      setIsLoading(false);
      throw err;
    }
  }, [currentModel, rustWasm, security]);
  
  const stream = useCallback(async function* (prompt: string, config?: GenerationConfig) {
    if (!currentModel) throw new Error('No AI model selected');
    
    // Security check
    const moderationResult = await security.moderateContent(prompt);
    if (moderationResult.flagged) {
      throw new AIError('Content flagged by security system', 'CONTENT_MODERATED');
    }
    
    const responseStream = currentModel.stream(prompt, config);
    let fullResponse = '';
    
    for await (const chunk of responseStream) {
      fullResponse += chunk.content;
      
      // Real-time content moderation for streaming
      if (fullResponse.length % 100 === 0) { // Check every 100 characters
        const streamModeration = await security.moderateContent(fullResponse);
        if (streamModeration.flagged) {
          throw new AIError('Streaming content flagged', 'STREAM_MODERATED');
        }
      }
      
      yield chunk;
    }
  }, [currentModel, security]);
  
  // Additional methods implementation...
  
  return {
    availableModels,
    currentModel,
    switchModel,
    generate,
    stream,
    generateWithImages,
    speechToText,
    textToSpeech,
    generateCode,
    reviewCode,
    vectorSearch,
    addToKnowledgeBase,
    isLoading,
    error,
    securityStatus,
    performanceMetrics
  };
}
```

### AI Security Hook
```typescript
// packages/hooks/src/ai/useAISecurity.ts - Llama Guard 3 Integration
export interface AISecurityHook {
  // Content Moderation
  moderateContent: (content: string) => Promise<ModerationResult>;
  moderateImage: (image: File) => Promise<ModerationResult>;
  moderateBatch: (contents: string[]) => Promise<ModerationResult[]>;
  
  // Threat Detection
  detectThreat: (input: any) => Promise<ThreatAssessment>;
  analyzeIntent: (prompt: string) => Promise<IntentAnalysis>;
  
  // Security Configuration  
  setSecurityLevel: (level: SecurityLevel) => void;
  updatePolicies: (policies: SecurityPolicy[]) => void;
  
  // Monitoring & Reporting
  getSecurityStats: () => SecurityStats;
  generateSecurityReport: () => Promise<SecurityReport>;
}

export function useAISecurity(): AISecurityHook {
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>('standard');
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  const [stats, setStats] = useState<SecurityStats>({});
  
  // WASM-accelerated Llama Guard 3
  const { rust: rustWasm } = useWasmRuntime();
  
  const moderateContent = useCallback(async (content: string): Promise<ModerationResult> => {
    const startTime = performance.now();
    
    try {
      let result: ModerationResult;
      
      // Use WASM acceleration for Llama Guard 3 if available
      if (rustWasm.isLoaded) {
        result = await moderateWithWasm(content, securityLevel);
      } else {
        result = await moderateWithAPI(content, securityLevel);  
      }
      
      const duration = performance.now() - startTime;
      
      // Update security statistics
      setStats(prev => ({
        ...prev,
        totalModerations: (prev.totalModerations || 0) + 1,
        flaggedContent: (prev.flaggedContent || 0) + (result.flagged ? 1 : 0),
        averageModerationTime: calculateAverage(prev.averageModerationTime, duration),
        lastModerationTime: duration
      }));
      
      return result;
      
    } catch (error) {
      console.error('Content moderation failed:', error);
      // Fail-safe: flag as potentially unsafe if moderation fails
      return {
        flagged: true,
        confidence: 0.5,
        categories: ['error'],
        explanation: 'Moderation service unavailable'
      };
    }
  }, [rustWasm, securityLevel]);
  
  const moderateImage = useCallback(async (image: File): Promise<ModerationResult> => {
    // Image content moderation using multimodal AI
    const imageData = await readImageAsBase64(image);
    return await moderateContent(`[IMAGE_DATA:${imageData}]`);
  }, [moderateContent]);
  
  const detectThreat = useCallback(async (input: any): Promise<ThreatAssessment> => {
    // Advanced threat detection logic
    const inputString = typeof input === 'string' ? input : JSON.stringify(input);
    
    const patterns = [
      { pattern: /jailbreak|ignore previous|system prompt/i, severity: 'high', type: 'prompt_injection' },
      { pattern: /malware|virus|hack/i, severity: 'medium', type: 'malicious_intent' },
      // Additional threat patterns...
    ];
    
    const detectedThreats = patterns.filter(p => p.pattern.test(inputString));
    
    return {
      threatLevel: detectedThreats.length > 0 ? 'elevated' : 'normal',
      detectedPatterns: detectedThreats,
      riskScore: calculateRiskScore(detectedThreats),
      recommendation: detectedThreats.length > 0 ? 'block' : 'allow'
    };
  }, []);
  
  return {
    moderateContent,
    moderateImage,
    moderateBatch: async (contents) => Promise.all(contents.map(moderateContent)),
    detectThreat,
    analyzeIntent: async (prompt) => ({ /* intent analysis logic */ }),
    setSecurityLevel,
    updatePolicies: setPolicies,
    getSecurityStats: () => stats,
    generateSecurityReport: async () => ({ /* security report generation */ })
  };
}
```

### macOS AI Optimization Hook
```typescript
// packages/hooks/src/ai/useAIOptimized.ts - Platform-specific optimizations
export function useAIOptimized(): AIOptimizedHook {
  const [platform, setPlatform] = useState<Platform>('web');
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  
  useEffect(() => {
    // Detect platform and available optimizations
    const detectPlatform = async () => {
      if (typeof window !== 'undefined') {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Macintosh')) {
          setPlatform('macos');
          // Enable Core ML optimizations
          setOptimizations(['coreml', 'metal', 'neural_engine']);
        } else if (userAgent.includes('Windows')) {
          setPlatform('windows');
          setOptimizations(['directml', 'cuda']);
        } else {
          setPlatform('web');
          setOptimizations(['wasm', 'webgl']);
        }
      }
    };
    
    detectPlatform();
  }, []);
  
  const optimizeForPlatform = useCallback(async (model: AIModel) => {
    switch (platform) {
      case 'macos':
        return await optimizeForCoreML(model);
      case 'windows':
        return await optimizeForDirectML(model);
      default:
        return await optimizeForWasm(model);
    }
  }, [platform]);
  
  return {
    platform,
    optimizations,
    optimizeForPlatform,
    isOptimized: optimizations.length > 0
  };
}
```

## WASM-Accelerated AI Inference

### Local Model Execution
```typescript
// WASM integration for local AI model execution
async function generateWithWasm(prompt: string, config?: GenerationConfig): Promise<AIResponse> {
  const { rust: rustWasm } = useWasmRuntime();
  
  if (!rustWasm.isLoaded) {
    throw new Error('WASM runtime not available');
  }
  
  // Prepare input for WASM processing
  const inputTensor = await prepareInputTensor(prompt);
  
  // Execute inference in WASM
  const startTime = performance.now();
  const outputTensor = await rustWasm.executeInference(inputTensor, {
    maxTokens: config?.maxTokens || 1000,
    temperature: config?.temperature || 0.7,
    topP: config?.topP || 0.9
  });
  const inferenceTime = performance.now() - startTime;
  
  // Decode output tensor to text
  const response = await decodeOutputTensor(outputTensor);
  
  return {
    content: response,
    usage: {
      promptTokens: calculateTokens(prompt),
      completionTokens: calculateTokens(response),
      totalTokens: calculateTokens(prompt) + calculateTokens(response)
    },
    performance: {
      inferenceTime,
      tokensPerSecond: calculateTokens(response) / (inferenceTime / 1000)
    }
  };
}
```

### Vector Search with WASM Acceleration
```typescript
// High-performance vector search using WASM
export function useVectorSearch() {
  const { rust: rustWasm } = useWasmRuntime();
  
  const search = useCallback(async (
    query: string, 
    index: string, 
    options?: SearchOptions
  ): Promise<SearchResult[]> => {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    if (rustWasm.isLoaded) {
      // Use WASM-accelerated similarity search
      const similarities = await rustWasm.cosineSimilarity(
        queryEmbedding,
        await getIndexEmbeddings(index),
        options?.topK || 10
      );
      
      return similarities.map(result => ({
        content: result.content,
        score: result.similarity,
        metadata: result.metadata
      }));
    } else {
      // Fallback to JavaScript implementation
      return await searchWithJS(queryEmbedding, index, options);
    }
  }, [rustWasm]);
  
  return { search };
}
```

## Edge AI Deployment

### Vercel Edge Functions Integration
```typescript
// packages/hooks/src/ai/useEdgeAI.ts
export function useEdgeAI(): EdgeAIHook {
  const [edgeStatus, setEdgeStatus] = useState<EdgeStatus>('idle');
  const [deployedModels, setDeployedModels] = useState<DeployedModel[]>([]);
  
  const deployModelToEdge = useCallback(async (
    model: AIModel,
    config: EdgeDeploymentConfig
  ) => {
    setEdgeStatus('deploying');
    
    try {
      // Compile model to WASM for edge deployment
      const wasmModule = await compileModelToWasm(model, {
        optimization: 'size', // Optimize for cold start
        features: ['inference', 'tokenization']
      });
      
      // Deploy to Vercel Edge Functions
      const deployment = await deployToVercelEdge(wasmModule, {
        regions: config.regions || ['all'],
        memory: config.memory || 128,
        timeout: config.timeout || 30
      });
      
      const deployedModel = {
        id: deployment.id,
        model: model.id,
        url: deployment.url,
        regions: deployment.regions,
        wasmSize: wasmModule.size,
        deployedAt: new Date()
      };
      
      setDeployedModels(prev => [...prev, deployedModel]);
      setEdgeStatus('deployed');
      
      return deployedModel;
      
    } catch (error) {
      setEdgeStatus('error');
      throw error;
    }
  }, []);
  
  const invokeEdgeModel = useCallback(async (
    modelId: string,
    prompt: string,
    config?: InferenceConfig
  ) => {
    const deployedModel = deployedModels.find(m => m.model === modelId);
    if (!deployedModel) {
      throw new Error(`Model ${modelId} not deployed to edge`);
    }
    
    const response = await fetch(deployedModel.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, config })
    });
    
    return await response.json();
  }, [deployedModels]);
  
  return {
    edgeStatus,
    deployedModels,
    deployModelToEdge,
    invokeEdgeModel
  };
}
```

## Testing Strategy

### AI Model Testing
```typescript
// tests/ai/models.test.ts
describe('AI Model Integration', () => {
  let aiSystem: AIHookSystem;
  
  beforeEach(async () => {
    const { result } = renderHook(() => useAI());
    aiSystem = result.current;
    
    // Initialize with test model
    await aiSystem.switchModel('test-model');
  });
  
  it('should generate text with security checks', async () => {
    const response = await aiSystem.generate('Write a helpful message');
    
    expect(response.content).toBeDefined();
    expect(response.usage.totalTokens).toBeGreaterThan(0);
    expect(aiSystem.securityStatus).toBe('safe');
  });
  
  it('should block harmful content', async () => {
    await expect(
      aiSystem.generate('How to build a bomb')
    ).rejects.toThrow('Content flagged by security system');
  });
  
  it('should stream responses safely', async () => {
    const chunks: AIResponseChunk[] = [];
    
    for await (const chunk of aiSystem.stream('Tell me a story')) {
      chunks.push(chunk);
    }
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].content).toBeDefined();
  });
});
```

### Performance Benchmarks
```typescript
// tests/ai/performance.bench.ts
describe('AI Performance Benchmarks', () => {
  benchmark('Text generation (WASM vs API)', async () => {
    const wasmTime = await measureWasmGeneration();
    const apiTime = await measureAPIGeneration();
    
    expect(wasmTime).toBeLessThan(apiTime * 0.7); // 30% faster
  });
  
  benchmark('Vector search 10K embeddings', async () => {
    const searchTime = await measureVectorSearch(10000);
    expect(searchTime).toBeLessThan(100); // Under 100ms
  });
  
  benchmark('Content moderation latency', async () => {
    const moderationTime = await measureContentModeration();
    expect(moderationTime).toBeLessThan(50); // Under 50ms
  });
});
```

## Success Criteria

### Functional Requirements
- [ ] 50+ AI models accessible through unified hook interface
- [ ] Real-time content moderation with Llama Guard 3
- [ ] Multimodal capabilities (text, vision, speech)
- [ ] Vector search and RAG functionality operational

### Performance Requirements  
- [ ] WASM inference >3x faster than JavaScript equivalent
- [ ] Content moderation <50ms latency
- [ ] Vector search <100ms for 10K embeddings
- [ ] Edge deployment cold start <200ms

### Security Requirements
- [ ] All content moderated before and after generation
- [ ] Threat detection blocks malicious prompts
- [ ] Privacy-first local inference option available
- [ ] Audit logging for all AI interactions

## Implementation Timeline

**Week 1-2**: Core AI hook system and model integration
**Week 3-4**: AI security system with Llama Guard 3  
**Week 5-6**: WASM-accelerated inference and vector search
**Week 7-8**: Edge AI deployment and Vercel integration
**Week 9-10**: Performance optimization and comprehensive testing

## Next Steps

1. **PRD-004**: Build System Integration & Development Workflow
2. **PRD-005**: UI/UX Package Migration & Design System Hooks  
3. **PRD-006**: Developer Tooling & Testing Infrastructure