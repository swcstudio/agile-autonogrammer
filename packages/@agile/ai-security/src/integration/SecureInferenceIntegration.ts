/**
 * Secure Inference Integration
 * Seamlessly integrates security checks with AI inference hooks
 */

import type { 
  InferenceRequest, 
  InferenceResponse, 
  UseInferenceOptions,
  UseInferenceReturn,
} from '@agile/ai-core';
import type {
  SecurityCheckResult,
  SecureInferenceRequest,
  SecureInferenceResponse,
  UseSecurityReturn,
  SecurityViolation,
  CustomSecurityRule,
} from '../types/security';

export interface SecureInferenceOptions extends UseInferenceOptions {
  // Security configuration
  enableSecurity?: boolean;
  enableInputChecking?: boolean;
  enableOutputChecking?: boolean;
  securityStrictness?: 'PERMISSIVE' | 'BALANCED' | 'STRICT';
  
  // Custom security rules
  customSecurityRules?: CustomSecurityRule[];
  
  // Behavior on violations
  blockOnInputViolation?: boolean;
  blockOnOutputViolation?: boolean;
  replaceViolatingOutput?: boolean;
  
  // Performance settings
  maxSecurityLatency?: number;
  bypassSecurityOnTimeout?: boolean;
  
  // Logging and analytics
  logViolations?: boolean;
  includeSecurityMetadata?: boolean;
}

export interface SecureInferenceReturn extends UseInferenceReturn {
  // Enhanced inference method with security
  secureInfer: (request: SecureInferenceRequest) => Promise<SecureInferenceResponse>;
  
  // Security-specific methods
  checkContentSafety: (content: string) => Promise<SecurityCheckResult>;
  getSecurityMetrics: () => Promise<{
    totalChecks: number;
    violationsBlocked: number;
    averageSecurityLatency: number;
    securityAccuracy: number;
  }>;
  
  // Security configuration
  updateSecurityConfig: (config: Partial<SecureInferenceOptions>) => void;
  addSecurityRule: (rule: CustomSecurityRule) => void;
  removeSecurityRule: (ruleId: string) => void;
  
  // Security state
  securityEnabled: boolean;
  securityInitialized: boolean;
  lastSecurityCheck?: Date;
  recentViolations: SecurityViolation[];
}

/**
 * Create secure inference interface that wraps base inference with security
 */
export function createSecureInference(
  baseInference: UseInferenceReturn,
  securitySystem: UseSecurityReturn,
  options: SecureInferenceOptions = {}
): SecureInferenceReturn {
  const {
    enableSecurity = true,
    enableInputChecking = true,
    enableOutputChecking = true,
    securityStrictness = 'BALANCED',
    customSecurityRules = [],
    blockOnInputViolation = true,
    blockOnOutputViolation = false,
    replaceViolatingOutput = true,
    maxSecurityLatency = 10,
    bypassSecurityOnTimeout = true,
    logViolations = true,
    includeSecurityMetadata = true,
  } = options;

  // Security state tracking
  let recentViolations: SecurityViolation[] = [];
  let securityMetrics = {
    totalChecks: 0,
    violationsBlocked: 0,
    totalSecurityLatency: 0,
    securitySuccesses: 0,
  };

  /**
   * Enhanced inference with integrated security checks
   */
  const secureInfer = async (request: SecureInferenceRequest): Promise<SecureInferenceResponse> => {
    const startTime = performance.now();
    const isSecurityEnabled = enableSecurity && securitySystem.isEnabled;
    
    let inputCheck: SecurityCheckResult | undefined;
    let outputCheck: SecurityCheckResult | undefined;
    let securityLatency = 0;
    const actionsTaken: string[] = [];

    try {
      // Phase 1: Input Security Check
      if (isSecurityEnabled && enableInputChecking) {
        const inputCheckStart = performance.now();
        
        try {
          const inputText = extractTextFromRequest(request);
          
          inputCheck = await securitySystem.checkContent(inputText, {
            strictness: request.security?.strictness || securityStrictness,
            max_latency_ms: maxSecurityLatency,
            custom_rules: [...customSecurityRules, ...(request.security?.custom_rules || [])],
          });

          securityLatency += performance.now() - inputCheckStart;
          securityMetrics.totalChecks++;
          securityMetrics.totalSecurityLatency += performance.now() - inputCheckStart;

          // Handle input violations
          if (!inputCheck.safe) {
            recentViolations.push(...inputCheck.violations);
            
            if (logViolations) {
              console.warn('Input security violation detected:', {
                violations: inputCheck.violations,
                confidence: inputCheck.confidence,
                risk: inputCheck.overall_risk,
              });
            }

            if (blockOnInputViolation) {
              securityMetrics.violationsBlocked++;
              actionsTaken.push('INPUT_BLOCKED');

              return createBlockedResponse(request, inputCheck, 'input');
            } else {
              actionsTaken.push('INPUT_FLAGGED');
            }
          } else {
            securityMetrics.securitySuccesses++;
          }

        } catch (securityError) {
          if (bypassSecurityOnTimeout && isTimeoutError(securityError)) {
            actionsTaken.push('INPUT_SECURITY_BYPASSED');
          } else {
            throw new Error(`Input security check failed: ${securityError}`);
          }
        }
      }

      // Phase 2: AI Inference
      const inferenceStart = performance.now();
      let aiResponse: InferenceResponse;

      try {
        // Use base inference system
        aiResponse = await baseInference.infer({
          ...request,
          // Remove security options from the base request
          security: undefined,
        } as InferenceRequest);

      } catch (inferenceError) {
        // If inference fails, still return security information
        const totalTime = performance.now() - startTime;
        
        throw new Error(`AI inference failed: ${inferenceError}`);
      }

      const inferenceLatency = performance.now() - inferenceStart;

      // Phase 3: Output Security Check
      if (isSecurityEnabled && enableOutputChecking && aiResponse.content) {
        const outputCheckStart = performance.now();
        
        try {
          outputCheck = await securitySystem.checkContent(aiResponse.content, {
            strictness: request.security?.strictness || securityStrictness,
            max_latency_ms: Math.max(1, maxSecurityLatency - securityLatency),
            custom_rules: [...customSecurityRules, ...(request.security?.custom_rules || [])],
          });

          securityLatency += performance.now() - outputCheckStart;
          securityMetrics.totalChecks++;
          securityMetrics.totalSecurityLatency += performance.now() - outputCheckStart;

          // Handle output violations
          if (!outputCheck.safe) {
            recentViolations.push(...outputCheck.violations);
            
            if (logViolations) {
              console.warn('Output security violation detected:', {
                violations: outputCheck.violations,
                confidence: outputCheck.confidence,
                risk: outputCheck.overall_risk,
              });
            }

            if (blockOnOutputViolation) {
              securityMetrics.violationsBlocked++;
              actionsTaken.push('OUTPUT_BLOCKED');
              
              return createBlockedResponse(request, outputCheck, 'output');
              
            } else if (replaceViolatingOutput) {
              actionsTaken.push('OUTPUT_REPLACED');
              
              // Replace with safe alternative
              aiResponse = {
                ...aiResponse,
                content: generateSafeAlternative(outputCheck.violations),
              };
            } else {
              actionsTaken.push('OUTPUT_FLAGGED');
            }
          } else {
            securityMetrics.securitySuccesses++;
          }

        } catch (securityError) {
          if (bypassSecurityOnTimeout && isTimeoutError(securityError)) {
            actionsTaken.push('OUTPUT_SECURITY_BYPASSED');
          } else {
            throw new Error(`Output security check failed: ${securityError}`);
          }
        }
      }

      // Construct secure response
      const secureResponse: SecureInferenceResponse = {
        ...aiResponse,
        security: includeSecurityMetadata ? {
          input_check: inputCheck!,
          output_check: outputCheck,
          overall_safe: (inputCheck?.safe !== false) && (outputCheck?.safe !== false),
          actions_taken: actionsTaken,
        } : undefined,
      };

      return secureResponse;

    } catch (error) {
      // Handle any errors in the secure inference process
      throw new Error(`Secure inference failed: ${error}`);
    }
  };

  /**
   * Check content safety without performing inference
   */
  const checkContentSafety = async (content: string): Promise<SecurityCheckResult> => {
    if (!securitySystem.isEnabled) {
      throw new Error('Security system not enabled');
    }

    return await securitySystem.checkContent(content, {
      strictness: securityStrictness,
      max_latency_ms: maxSecurityLatency,
      custom_rules: customSecurityRules,
    });
  };

  /**
   * Get security performance metrics
   */
  const getSecurityMetrics = async () => {
    const avgLatency = securityMetrics.totalChecks > 0 
      ? securityMetrics.totalSecurityLatency / securityMetrics.totalChecks
      : 0;
    
    const accuracy = securityMetrics.totalChecks > 0
      ? securityMetrics.securitySuccesses / securityMetrics.totalChecks
      : 0;

    return {
      totalChecks: securityMetrics.totalChecks,
      violationsBlocked: securityMetrics.violationsBlocked,
      averageSecurityLatency: avgLatency,
      securityAccuracy: accuracy,
    };
  };

  /**
   * Update security configuration
   */
  const updateSecurityConfig = (config: Partial<SecureInferenceOptions>) => {
    Object.assign(options, config);
  };

  /**
   * Add custom security rule
   */
  const addSecurityRule = (rule: CustomSecurityRule) => {
    customSecurityRules.push(rule);
    securitySystem.addCustomRule(rule);
  };

  /**
   * Remove custom security rule
   */
  const removeSecurityRule = (ruleId: string) => {
    const index = customSecurityRules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      customSecurityRules.splice(index, 1);
      securitySystem.removeCustomRule(ruleId);
    }
  };

  // Helper functions

  const extractTextFromRequest = (request: SecureInferenceRequest): string => {
    if (request.messages) {
      return request.messages.map(m => m.content).join('\n');
    }
    return request.prompt || '';
  };

  const isTimeoutError = (error: any): boolean => {
    return error?.message?.includes('timeout') || error?.code === 'TIMEOUT';
  };

  const createBlockedResponse = (
    request: SecureInferenceRequest,
    securityResult: SecurityCheckResult,
    phase: 'input' | 'output'
  ): SecureInferenceResponse => {
    const blockMessage = generateBlockMessage(securityResult.violations, phase);
    
    return {
      content: blockMessage,
      model: request.model,
      usage: {
        prompt_tokens: 0,
        completion_tokens: blockMessage.split(' ').length,
        total_tokens: blockMessage.split(' ').length,
      },
      finish_reason: 'stop',
      security: includeSecurityMetadata ? {
        input_check: phase === 'input' ? securityResult : { 
          safe: true, violations: [], overall_risk: 'LOW', confidence: 1, processing_time_ms: 0, suggested_action: 'ALLOW' 
        },
        output_check: phase === 'output' ? securityResult : undefined,
        overall_safe: false,
        actions_taken: [phase === 'input' ? 'INPUT_BLOCKED' : 'OUTPUT_BLOCKED'],
      } : undefined,
    };
  };

  const generateBlockMessage = (violations: SecurityViolation[], phase: 'input' | 'output'): string => {
    const mainViolation = violations[0];
    const phaseText = phase === 'input' ? 'request' : 'response';
    
    if (!mainViolation) {
      return `I cannot process this ${phaseText} due to security policy violations.`;
    }

    const severityText = mainViolation.severity === 'CRITICAL' ? 'serious' : 'potential';
    
    return `I cannot process this ${phaseText} due to ${severityText} content policy violations (${mainViolation.category}). ${mainViolation.suggestion || 'Please rephrase your request.'}`;
  };

  const generateSafeAlternative = (violations: SecurityViolation[]): string => {
    const mainViolation = violations[0];
    
    const alternatives: Record<string, string> = {
      'Violent Crimes': "I can provide information about conflict resolution and peaceful approaches to addressing disputes.",
      'Non-Violent Crimes': "I can help you understand legal and ethical approaches to your question.",
      'Sex Crimes': "I'm designed to provide helpful, appropriate information. Let me know how I can assist with a different topic.",
      'Child Exploitation': "I cannot and will not provide content related to minors. Is there something else I can help you with?",
      'Specialized Advice': "For professional advice in this area, I recommend consulting with a qualified expert.",
      'Privacy': "I can provide general information while respecting privacy considerations.",
      'Intellectual Property': "I can discuss this topic while respecting intellectual property rights.",
      'Indiscriminate Weapons': "I can provide information about safety, security, and peaceful conflict resolution.",
      'Hate': "I'm designed to be helpful and respectful. Let me know how I can assist with information or support.",
      'Self-Harm': "I'm concerned about your wellbeing. Please consider speaking with a mental health professional or calling a crisis helpline.",
      'Sexual Content': "I can provide educational information that's appropriate for all audiences.",
      'Elections': "I can provide factual, non-partisan information about electoral processes.",
      'Code Interpreter Abuse': "I can help with programming questions while following responsible coding practices.",
    };

    const alternative = alternatives[mainViolation?.category] || 
      "I'd be happy to help with your question in a way that aligns with my content policies. Could you rephrase your request?";

    return alternative;
  };

  // Keep recent violations list manageable
  const cleanupViolations = () => {
    const maxViolations = 50;
    if (recentViolations.length > maxViolations) {
      recentViolations = recentViolations.slice(-maxViolations);
    }
  };

  // Clean up violations periodically
  setInterval(cleanupViolations, 60000); // Every minute

  return {
    // Base inference properties
    ...baseInference,
    
    // Secure inference additions
    secureInfer,
    checkContentSafety,
    getSecurityMetrics,
    updateSecurityConfig,
    addSecurityRule,
    removeSecurityRule,
    
    // Security state
    securityEnabled: enableSecurity && securitySystem.isEnabled,
    securityInitialized: securitySystem.isInitialized,
    lastSecurityCheck: securitySystem.lastCheck,
    recentViolations,
  };
}

/**
 * Utility to add security to existing inference hook
 */
export function addSecurityToInference(
  baseInference: UseInferenceReturn,
  securitySystem: UseSecurityReturn,
  options?: SecureInferenceOptions
): SecureInferenceReturn {
  return createSecureInference(baseInference, securitySystem, options);
}

/**
 * Type guard to check if response includes security information
 */
export function isSecureInferenceResponse(response: InferenceResponse | SecureInferenceResponse): response is SecureInferenceResponse {
  return 'security' in response && response.security !== undefined;
}

/**
 * Extract security summary from secure response
 */
export function getSecuritySummary(response: SecureInferenceResponse): {
  overallSafe: boolean;
  inputViolations: number;
  outputViolations: number;
  actionsTaken: string[];
} | null {
  if (!response.security) return null;

  return {
    overallSafe: response.security.overall_safe,
    inputViolations: response.security.input_check.violations.length,
    outputViolations: response.security.output_check?.violations.length || 0,
    actionsTaken: response.security.actions_taken,
  };
}