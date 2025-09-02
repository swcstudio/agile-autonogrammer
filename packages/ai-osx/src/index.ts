/**
 * AI-OSX - WebAssembly-based AI-native Operating System
 * 
 * Built on the Katalyst framework with integrated security AI capabilities
 * Features GPU-accelerated terminals, cognitive architecture, and distributed computing
 */

// Core AI-OSX System
export { default as AIOperatingSystemCore } from './core/AIOperatingSystem';

// Kernel Components
export { default as AIWasmRuntimeManager } from './kernel/WasmRuntimeManager';

// Terminal Components
export { default as AIGPUTerminal } from './terminal/GPUTerminal';

// Cognitive Architecture
export { default as BrainBraunBeyondArchitecture } from './cognitive/BrainBraunBeyond';

// React Hooks and Providers
export { useAIOperatingSystem } from './hooks/useAIOperatingSystem';
export { AIOperatingSystemProvider } from './providers/AIOperatingSystemProvider';

// React Components
export { AITerminal } from './components/AITerminal';
export { CognitiveInterface } from './components/CognitiveInterface';
export { SystemDashboard } from './components/SystemDashboard';

// Utilities
export { createAIOperatingSystem } from './utils/createAIOperatingSystem';
export { configureAIOperatingSystem } from './utils/configureAIOperatingSystem';

// Types
export type {
  AIOperatingSystem,
  AIKernel,
  AIUserSpace,
  AIIntelligenceLayer,
  AISecurityLayer,
  AIPerformanceLayer,
  AIOperatingSystemConfig,
  AIOperatingSystemState,
  AIOperatingSystemEvent,
  AIOperatingSystemError,
  AsyncAIOperatingSystemResult,
  
  // WASM Runtime Types
  WasmRuntimeManager,
  WasmexRuntime,
  WasmerRuntime,
  DenoWasmRuntime,
  WasmModule,
  WasmInstance,
  WasmResult,
  WasmRuntimeMetrics,
  
  // Terminal Types
  AITerminal as AITerminalType,
  TerminalSession,
  GPUTerminalRenderer,
  TerminalAI,
  TerminalMultiplexer,
  TerminalSecurity,
  TerminalPerformance,
  CommandAnalysis,
  CommandSuggestion,
  OutputExplanation,
  
  // Cognitive Architecture Types
  CognitiveArchitecture,
  CognitiveBrainLayer,
  ExecutionBraunLayer,
  EmergentBeyondLayer,
  FieldResonanceSystem,
  AIConsciousness,
  UserIntent,
  ActionPlan,
  CognitiveState,
  CognitiveContext,
  
  // Multi-Modal AI Types
  MultiModalProcessor,
  TextProcessor,
  CodeProcessor,
  ImageProcessor,
  AudioProcessor,
  VideoProcessor,
  
  // Security Integration Types
  SecurityFramework,
  RedTeamIntegration,
  PurpleTeamIntegration,
  GreenHatIntegration,
  QuantumSafeFeatures,
  ZeroTrustIntegration,
  
  // Performance Types
  PerformanceMonitoring,
  PerformanceMetrics,
  SystemMetrics,
  AIMetrics,
  
  // Cross-Platform Deployment Types
  CrossPlatformDeployment,
  TauriDeployment,
  LynxReactDeployment,
  PWADeployment,
  
  // Plugin System Types
  AIOperatingSystemPlugin,
  PluginCapabilities,
  PluginLifecycle,
  PluginAPI,
  
  // Utility Types
  DeepPartial,
  AIOperatingSystemResult
} from './types';

// Constants
export const AI_OSX_VERSION = '1.0.0';
export const AI_OSX_BUILD = Date.now();
export const AI_OSX_CAPABILITIES = [
  'webassembly_runtime',
  'gpu_acceleration',
  'ai_cognition',
  'security_framework',
  'multi_modal_ai',
  'quantum_safe_crypto',
  'distributed_computing',
  'cross_platform_deployment'
] as const;

// Default Configurations
export const DEFAULT_AI_OSX_CONFIG = {
  kernel: {
    wasmRuntimes: [
      {
        enabled: true,
        maxInstances: 4,
        memoryLimit: 128 * 1024 * 1024, // 128MB
        timeoutMs: 30000
      }
    ],
    memoryLimits: {
      system: 512 * 1024 * 1024, // 512MB
      user: 1024 * 1024 * 1024,  // 1GB
      ai: 2048 * 1024 * 1024     // 2GB
    },
    security: {
      level: 'standard',
      enableSandboxing: true,
      enableAuditLogging: true
    },
    performance: {
      enableGPU: true,
      maxCPUUsage: 0.8,
      memoryPressureThreshold: 0.9
    }
  },
  userSpace: {
    defaultShell: '/bin/zsh',
    terminals: [
      {
        id: 'default',
        width: 80,
        height: 24,
        fontSize: 14,
        fontFamily: 'JetBrains Mono',
        theme: 'dark',
        cursorStyle: 'block',
        scrollback: 10000,
        shell: '/bin/zsh',
        gpu: {
          enabled: true,
          powerPreference: 'high-performance'
        },
        ai: {
          enabled: true,
          completionDelay: 100,
          securityScanning: true,
          contextAware: true
        },
        multiplexing: {
          enabled: true,
          maxSessions: 10,
          sessionPersistence: true
        }
      }
    ],
    editors: [],
    desktop: {
      theme: 'dark',
      wallpaper: null,
      animations: true
    },
    applications: []
  },
  aiLayer: {
    models: [
      '@cf/meta/llama-4-scout-17b-16e-instruct',
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/qwen/qwq-32b',
      '@cf/deepseek/deepseek-r1-distill-qwen-32b'
    ],
    assistants: [
      {
        name: 'Code Assistant',
        model: '@cf/qwen/qwen2.5-coder-32b-instruct',
        capabilities: ['code_generation', 'code_analysis', 'debugging']
      },
      {
        name: 'Security Assistant', 
        model: '@cf/meta/llama-guard-3-11b',
        capabilities: ['security_analysis', 'threat_detection', 'compliance_checking']
      }
    ],
    cognition: {
      enableBrainBraunBeyond: true,
      consciousnessLevel: 'adaptive',
      learningRate: 0.1,
      creativityMode: 'enhanced'
    },
    multiModal: {
      enableTextProcessing: true,
      enableCodeProcessing: true,
      enableImageProcessing: true,
      enableAudioProcessing: false,
      enableVideoProcessing: false
    },
    learning: {
      enableFederatedLearning: true,
      privacyPreserving: true,
      localModels: true
    }
  },
  security: {
    redTeamMode: true,
    purpleTeamMode: true,
    greenHatMode: true,
    quantumSafe: true,
    zeroTrust: true,
    complianceStandards: ['OWASP', 'PCI-DSS', 'HIPAA', 'GDPR', 'SOC2'],
    severityThreshold: 'Medium',
    realTimeScanning: true,
    auditLogging: true
  },
  performance: {
    enableMonitoring: true,
    enableOptimization: true,
    enableScaling: true,
    enableCaching: true,
    targetFPS: 60,
    maxMemoryUsage: 0.8,
    enablePreemptiveGC: true
  },
  development: {
    enableHotReload: true,
    enableDebugging: true,
    enableProfiling: true,
    logLevel: 'info'
  }
};

// Utility functions for quick setup
export function createDefaultAIOperatingSystem() {
  return createAIOperatingSystem(DEFAULT_AI_OSX_CONFIG);
}

export function getAIOperatingSystemInfo() {
  return {
    version: AI_OSX_VERSION,
    build: AI_OSX_BUILD,
    capabilities: AI_OSX_CAPABILITIES,
    supportedPlatforms: ['web', 'desktop', 'mobile'],
    requiredFeatures: ['WebAssembly', 'WebGPU', 'SharedArrayBuffer'],
    recommendedFeatures: ['WebCodecs', 'WebAuth', 'WebHID']
  };
}

// Feature Detection
export function checkAIOperatingSystemSupport(): {
  supported: boolean;
  features: Record<string, boolean>;
  warnings: string[];
  errors: string[];
} {
  const features = {
    webassembly: typeof WebAssembly !== 'undefined',
    webgpu: 'gpu' in navigator,
    sharedarraybuffer: typeof SharedArrayBuffer !== 'undefined',
    webworkers: typeof Worker !== 'undefined',
    indexeddb: 'indexedDB' in window,
    webrtc: 'RTCPeerConnection' in window,
    webcrypto: 'crypto' in window && 'subtle' in crypto,
    clipboard: 'clipboard' in navigator,
    permissions: 'permissions' in navigator,
    serviceworker: 'serviceWorker' in navigator
  };

  const warnings: string[] = [];
  const errors: string[] = [];

  // Required features
  if (!features.webassembly) {
    errors.push('WebAssembly is required but not supported');
  }
  
  if (!features.webworkers) {
    errors.push('Web Workers are required but not supported');
  }

  if (!features.indexeddb) {
    errors.push('IndexedDB is required but not supported');
  }

  // Recommended features
  if (!features.webgpu) {
    warnings.push('WebGPU not available - falling back to Canvas 2D rendering');
  }

  if (!features.sharedarraybuffer) {
    warnings.push('SharedArrayBuffer not available - multithreading performance may be reduced');
  }

  if (!features.webcrypto) {
    warnings.push('Web Crypto API not available - some security features may be limited');
  }

  const supported = errors.length === 0;

  return {
    supported,
    features,
    warnings,
    errors
  };
}

// Environment Detection
export function detectAIOperatingSystemEnvironment() {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  const environment = {
    browser: 'unknown',
    os: 'unknown',
    mobile: false,
    capabilities: {
      touchscreen: 'ontouchstart' in window,
      orientation: 'orientation' in window,
      deviceMotion: 'DeviceMotionEvent' in window,
      fullscreen: 'requestFullscreen' in document.documentElement,
      pointerlock: 'requestPointerLock' in document.documentElement,
      gamepad: 'getGamepads' in navigator,
      midi: 'requestMIDIAccess' in navigator,
      bluetooth: 'bluetooth' in navigator,
      usb: 'usb' in navigator
    },
    performance: {
      cores: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory || 4,
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    }
  };

  // Browser detection
  if (userAgent.includes('chrome')) environment.browser = 'chrome';
  else if (userAgent.includes('firefox')) environment.browser = 'firefox';
  else if (userAgent.includes('safari')) environment.browser = 'safari';
  else if (userAgent.includes('edge')) environment.browser = 'edge';

  // OS detection
  if (platform.includes('win')) environment.os = 'windows';
  else if (platform.includes('mac')) environment.os = 'macos';
  else if (platform.includes('linux')) environment.os = 'linux';
  else if (userAgent.includes('android')) environment.os = 'android';
  else if (userAgent.includes('iphone') || userAgent.includes('ipad')) environment.os = 'ios';

  // Mobile detection
  environment.mobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

  return environment;
}

// Error Classes
export class AIOperatingSystemInitializationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'AIOperatingSystemInitializationError';
  }
}

export class AIOperatingSystemRuntimeError extends Error {
  constructor(message: string, public component: string, public cause?: Error) {
    super(message);
    this.name = 'AIOperatingSystemRuntimeError';
    this.component = component;
  }
}

export class AIOperatingSystemSecurityError extends Error {
  constructor(message: string, public severity: 'low' | 'medium' | 'high' | 'critical', public cause?: Error) {
    super(message);
    this.name = 'AIOperatingSystemSecurityError';
    this.severity = severity;
  }
}

// Development helpers
export const DEV_TOOLS = {
  enableDebugMode: () => {
    (globalThis as any).__AI_OSX_DEBUG__ = true;
    console.log('🔧 AI-OSX Debug Mode Enabled');
  },
  
  disableDebugMode: () => {
    (globalThis as any).__AI_OSX_DEBUG__ = false;
    console.log('🔧 AI-OSX Debug Mode Disabled');
  },
  
  isDebugMode: () => {
    return !!(globalThis as any).__AI_OSX_DEBUG__;
  },

  getSystemInfo: () => {
    return {
      ...getAIOperatingSystemInfo(),
      environment: detectAIOperatingSystemEnvironment(),
      support: checkAIOperatingSystemSupport(),
      debug: DEV_TOOLS.isDebugMode()
    };
  }
};

// Re-export key types from security-ai for convenience
export type {
  VulnerabilityReport,
  AttackSimulationResult,
  SecurityMetrics,
  SecurityLearningModule
} from '@katalyst/security-ai';

// Package metadata
export const PACKAGE_INFO = {
  name: '@katalyst/ai-osx',
  version: AI_OSX_VERSION,
  description: 'AI-OSX: WebAssembly-based AI-native operating system built on Katalyst framework',
  author: 'Katalyst Team',
  license: 'MIT',
  homepage: 'https://katalyst.ai',
  repository: 'https://github.com/katalyst-team/katalyst-core',
  keywords: [
    'ai-osx',
    'webassembly',
    'operating-system', 
    'ai-native',
    'katalyst',
    'terminal',
    'editor',
    'cognitive-architecture',
    'security-ai',
    'gpu-acceleration'
  ],
  capabilities: AI_OSX_CAPABILITIES,
  build: AI_OSX_BUILD
} as const;