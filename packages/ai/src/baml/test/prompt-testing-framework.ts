/**
 * BAML Prompt Testing Framework
 * Test and optimize prompt variations for Claude Code
 */

import { BAMLRuntime, ExecutionResult } from '../runtime/baml-runtime';

export interface TestCase<T = any> {
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput?: T;
  validators: Validator<T>[];
  variations?: PromptVariation[];
}

export interface PromptVariation {
  id: string;
  name: string;
  modifiers: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    prefixModifier?: string;
    suffixModifier?: string;
    style?: string;
  };
}

export interface Validator<T = any> {
  name: string;
  check: (output: T) => ValidationResult;
  weight?: number;
  required?: boolean;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  message?: string;
  details?: any;
}

export interface TestResult<T = any> {
  testCase: string;
  variation: string;
  execution: ExecutionResult<T>;
  validation: {
    passed: boolean;
    score: number;
    validators: Array<{
      name: string;
      result: ValidationResult;
    }>;
  };
  performance: {
    latency: number;
    tokens: number;
    costEstimate: number;
  };
}

export interface TestSuiteResult {
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    averageScore: number;
    bestVariation: string;
    worstVariation: string;
  };
  results: TestResult[];
  recommendations: string[];
  comparison: VariationComparison[];
}

export interface VariationComparison {
  variationId: string;
  metrics: {
    successRate: number;
    averageScore: number;
    averageLatency: number;
    averageTokens: number;
    costPerRun: number;
  };
}

export class PromptTestingFramework {
  private runtime: BAMLRuntime;
  private testCases: Map<string, TestCase> = new Map();
  private defaultVariations: PromptVariation[] = [
    {
      id: 'baseline',
      name: 'Baseline',
      modifiers: {}
    },
    {
      id: 'concise',
      name: 'Concise',
      modifiers: {
        maxTokens: 500,
        prefixModifier: 'Be extremely concise. ',
        suffixModifier: ' Provide only essential information.'
      }
    },
    {
      id: 'detailed',
      name: 'Detailed',
      modifiers: {
        maxTokens: 4000,
        prefixModifier: 'Provide comprehensive analysis. ',
        suffixModifier: ' Include all relevant details and explanations.'
      }
    },
    {
      id: 'creative',
      name: 'Creative',
      modifiers: {
        temperature: 0.8,
        prefixModifier: 'Think creatively and explore alternatives. '
      }
    },
    {
      id: 'strict',
      name: 'Strict',
      modifiers: {
        temperature: 0.2,
        prefixModifier: 'Follow instructions precisely. ',
        suffixModifier: ' Be exact and deterministic.'
      }
    }
  ];

  constructor(runtime: BAMLRuntime) {
    this.runtime = runtime;
    this.initializeBuiltInValidators();
  }

  /**
   * Register a test case
   */
  registerTestCase(testCase: TestCase): void {
    this.testCases.set(testCase.name, testCase);
  }

  /**
   * Run a single test case with all variations
   */
  async runTestCase(
    testCaseName: string,
    functionName: string,
    variations?: PromptVariation[]
  ): Promise<TestSuiteResult> {
    const testCase = this.testCases.get(testCaseName);
    if (!testCase) {
      throw new Error(`Test case ${testCaseName} not found`);
    }

    const variationsToTest = variations || testCase.variations || this.defaultVariations;
    const results: TestResult[] = [];

    for (const variation of variationsToTest) {
      const result = await this.executeTestWithVariation(
        testCase,
        functionName,
        variation
      );
      results.push(result);
    }

    return this.analyzeResults(results);
  }

  /**
   * Run all registered test cases
   */
  async runAllTests(functionName: string): Promise<Map<string, TestSuiteResult>> {
    const allResults = new Map<string, TestSuiteResult>();

    for (const [name, testCase] of this.testCases) {
      const result = await this.runTestCase(name, functionName);
      allResults.set(name, result);
    }

    return allResults;
  }

  /**
   * A/B test two specific variations
   */
  async abTest(
    testCaseName: string,
    functionName: string,
    variationA: PromptVariation,
    variationB: PromptVariation,
    iterations: number = 10
  ): Promise<{
    winner: string;
    confidence: number;
    results: {
      [key: string]: {
        successRate: number;
        averageScore: number;
        averageLatency: number;
      };
    };
  }> {
    const testCase = this.testCases.get(testCaseName);
    if (!testCase) {
      throw new Error(`Test case ${testCaseName} not found`);
    }

    const resultsA: TestResult[] = [];
    const resultsB: TestResult[] = [];

    for (let i = 0; i < iterations; i++) {
      resultsA.push(await this.executeTestWithVariation(testCase, functionName, variationA));
      resultsB.push(await this.executeTestWithVariation(testCase, functionName, variationB));
    }

    const statsA = this.calculateStats(resultsA);
    const statsB = this.calculateStats(resultsB);

    const winner = statsA.averageScore > statsB.averageScore ? variationA.id : variationB.id;
    const confidence = this.calculateConfidence(statsA, statsB, iterations);

    return {
      winner,
      confidence,
      results: {
        [variationA.id]: statsA,
        [variationB.id]: statsB
      }
    };
  }

  /**
   * Optimize prompts using evolutionary algorithm
   */
  async optimizePrompt(
    testCaseName: string,
    functionName: string,
    generations: number = 5,
    populationSize: number = 10
  ): Promise<{
    bestVariation: PromptVariation;
    score: number;
    evolution: Array<{
      generation: number;
      bestScore: number;
      averageScore: number;
    }>;
  }> {
    const testCase = this.testCases.get(testCaseName);
    if (!testCase) {
      throw new Error(`Test case ${testCaseName} not found`);
    }

    let population = this.generateInitialPopulation(populationSize);
    const evolution: any[] = [];

    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness of current population
      const evaluated = await Promise.all(
        population.map(async (variation) => {
          const result = await this.executeTestWithVariation(testCase, functionName, variation);
          return {
            variation,
            score: result.validation.score
          };
        })
      );

      // Sort by fitness
      evaluated.sort((a, b) => b.score - a.score);

      // Record evolution stats
      const bestScore = evaluated[0].score;
      const averageScore = evaluated.reduce((sum, e) => sum + e.score, 0) / evaluated.length;
      evolution.push({ generation: gen, bestScore, averageScore });

      // Select top performers
      const survivors = evaluated.slice(0, Math.floor(populationSize / 2));

      // Create next generation through crossover and mutation
      population = [
        ...survivors.map(s => s.variation),
        ...this.createOffspring(survivors.map(s => s.variation), populationSize - survivors.length)
      ];
    }

    // Final evaluation
    const finalEvaluated = await Promise.all(
      population.map(async (variation) => {
        const result = await this.executeTestWithVariation(testCase, functionName, variation);
        return {
          variation,
          score: result.validation.score
        };
      })
    );

    finalEvaluated.sort((a, b) => b.score - a.score);

    return {
      bestVariation: finalEvaluated[0].variation,
      score: finalEvaluated[0].score,
      evolution
    };
  }

  private async executeTestWithVariation(
    testCase: TestCase,
    functionName: string,
    variation: PromptVariation
  ): Promise<TestResult> {
    const startTime = Date.now();

    // Apply variation modifiers to input
    const modifiedInput = this.applyVariationToInput(testCase.input, variation);

    // Execute with the runtime
    const execution = await this.runtime.execute(
      functionName,
      modifiedInput,
      {
        testVariation: variation.id
      }
    );

    // Validate output
    const validationResults = testCase.validators.map(validator => ({
      name: validator.name,
      result: validator.check(execution.data)
    }));

    const passed = validationResults.every(v => 
      !testCase.validators.find(val => val.name === v.name)?.required || v.result.passed
    );

    const score = this.calculateWeightedScore(validationResults, testCase.validators);

    return {
      testCase: testCase.name,
      variation: variation.id,
      execution,
      validation: {
        passed,
        score,
        validators: validationResults
      },
      performance: {
        latency: execution.metrics.latency,
        tokens: execution.metrics.tokens,
        costEstimate: this.estimateCost(execution.metrics.tokens)
      }
    };
  }

  private applyVariationToInput(
    input: Record<string, any>,
    variation: PromptVariation
  ): Record<string, any> {
    const modified = { ...input };

    if (variation.modifiers.prefixModifier) {
      // Add prefix to relevant string inputs
      for (const key in modified) {
        if (typeof modified[key] === 'string' && key.includes('prompt')) {
          modified[key] = variation.modifiers.prefixModifier + modified[key];
        }
      }
    }

    if (variation.modifiers.suffixModifier) {
      // Add suffix to relevant string inputs
      for (const key in modified) {
        if (typeof modified[key] === 'string' && key.includes('prompt')) {
          modified[key] = modified[key] + variation.modifiers.suffixModifier;
        }
      }
    }

    return modified;
  }

  private calculateWeightedScore(
    results: Array<{ name: string; result: ValidationResult }>,
    validators: Validator[]
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of results) {
      const validator = validators.find(v => v.name === result.name);
      const weight = validator?.weight || 1;
      totalWeight += weight;
      weightedSum += result.result.score * weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private analyzeResults(results: TestResult[]): TestSuiteResult {
    const passed = results.filter(r => r.validation.passed).length;
    const scores = results.map(r => r.validation.score);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    const sortedByScore = [...results].sort((a, b) => b.validation.score - a.validation.score);
    const bestVariation = sortedByScore[0]?.variation || 'none';
    const worstVariation = sortedByScore[sortedByScore.length - 1]?.variation || 'none';

    // Calculate variation comparisons
    const variationMap = new Map<string, TestResult[]>();
    for (const result of results) {
      const existing = variationMap.get(result.variation) || [];
      existing.push(result);
      variationMap.set(result.variation, existing);
    }

    const comparison: VariationComparison[] = [];
    for (const [variationId, variationResults] of variationMap) {
      const successRate = variationResults.filter(r => r.validation.passed).length / variationResults.length;
      const avgScore = variationResults.reduce((sum, r) => sum + r.validation.score, 0) / variationResults.length;
      const avgLatency = variationResults.reduce((sum, r) => sum + r.performance.latency, 0) / variationResults.length;
      const avgTokens = variationResults.reduce((sum, r) => sum + r.performance.tokens, 0) / variationResults.length;

      comparison.push({
        variationId,
        metrics: {
          successRate,
          averageScore: avgScore,
          averageLatency: avgLatency,
          averageTokens: avgTokens,
          costPerRun: this.estimateCost(avgTokens)
        }
      });
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, comparison);

    return {
      summary: {
        totalTests: results.length,
        passed,
        failed: results.length - passed,
        averageScore,
        bestVariation,
        worstVariation
      },
      results,
      recommendations,
      comparison
    };
  }

  private generateRecommendations(results: TestResult[], comparison: VariationComparison[]): string[] {
    const recommendations: string[] = [];

    // Find best performing variation
    const bestVariation = comparison.sort((a, b) => b.metrics.averageScore - a.metrics.averageScore)[0];
    if (bestVariation) {
      recommendations.push(
        `Use variation '${bestVariation.variationId}' for best overall performance (score: ${bestVariation.metrics.averageScore.toFixed(2)})`
      );
    }

    // Find most cost-effective variation
    const costEffective = comparison.sort((a, b) => 
      (a.metrics.costPerRun / a.metrics.averageScore) - (b.metrics.costPerRun / b.metrics.averageScore)
    )[0];
    if (costEffective && costEffective.variationId !== bestVariation?.variationId) {
      recommendations.push(
        `Consider '${costEffective.variationId}' for cost-effectiveness (${costEffective.metrics.costPerRun.toFixed(4)}$ per run)`
      );
    }

    // Check for consistent failures
    const failurePatterns = this.analyzeFailurePatterns(results);
    if (failurePatterns.length > 0) {
      recommendations.push(...failurePatterns);
    }

    return recommendations;
  }

  private analyzeFailurePatterns(results: TestResult[]): string[] {
    const patterns: string[] = [];
    const validatorFailures = new Map<string, number>();

    for (const result of results) {
      for (const validator of result.validation.validators) {
        if (!validator.result.passed) {
          validatorFailures.set(
            validator.name,
            (validatorFailures.get(validator.name) || 0) + 1
          );
        }
      }
    }

    for (const [validator, count] of validatorFailures) {
      if (count > results.length * 0.5) {
        patterns.push(`Frequent failures in '${validator}' validator (${count}/${results.length} tests)`);
      }
    }

    return patterns;
  }

  private calculateStats(results: TestResult[]) {
    const successRate = results.filter(r => r.validation.passed).length / results.length;
    const averageScore = results.reduce((sum, r) => sum + r.validation.score, 0) / results.length;
    const averageLatency = results.reduce((sum, r) => sum + r.performance.latency, 0) / results.length;

    return {
      successRate,
      averageScore,
      averageLatency
    };
  }

  private calculateConfidence(statsA: any, statsB: any, iterations: number): number {
    // Simple confidence calculation based on score difference and sample size
    const scoreDiff = Math.abs(statsA.averageScore - statsB.averageScore);
    const maxDiff = 1.0; // Assuming scores are 0-1
    const normalized = scoreDiff / maxDiff;
    const sampleFactor = Math.min(iterations / 100, 1); // More iterations = more confidence
    
    return normalized * sampleFactor;
  }

  private generateInitialPopulation(size: number): PromptVariation[] {
    const population: PromptVariation[] = [];
    
    for (let i = 0; i < size; i++) {
      population.push({
        id: `gen0_${i}`,
        name: `Generation 0 Variant ${i}`,
        modifiers: {
          temperature: Math.random() * 0.8 + 0.2,
          maxTokens: Math.floor(Math.random() * 3000) + 500,
          prefixModifier: this.randomPrefix(),
          suffixModifier: this.randomSuffix()
        }
      });
    }

    return population;
  }

  private createOffspring(parents: PromptVariation[], count: number): PromptVariation[] {
    const offspring: PromptVariation[] = [];
    
    for (let i = 0; i < count; i++) {
      const parent1 = parents[Math.floor(Math.random() * parents.length)];
      const parent2 = parents[Math.floor(Math.random() * parents.length)];
      
      offspring.push(this.crossover(parent1, parent2, i));
    }

    return offspring;
  }

  private crossover(parent1: PromptVariation, parent2: PromptVariation, index: number): PromptVariation {
    return {
      id: `offspring_${Date.now()}_${index}`,
      name: `Offspring ${index}`,
      modifiers: {
        temperature: Math.random() > 0.5 ? parent1.modifiers.temperature : parent2.modifiers.temperature,
        maxTokens: Math.random() > 0.5 ? parent1.modifiers.maxTokens : parent2.modifiers.maxTokens,
        prefixModifier: Math.random() > 0.5 ? parent1.modifiers.prefixModifier : parent2.modifiers.prefixModifier,
        suffixModifier: Math.random() > 0.5 ? parent1.modifiers.suffixModifier : parent2.modifiers.suffixModifier
      }
    };
  }

  private randomPrefix(): string {
    const prefixes = [
      'Be concise and clear. ',
      'Think step by step. ',
      'Consider all aspects. ',
      'Focus on the key points. ',
      'Provide detailed analysis. '
    ];
    return prefixes[Math.floor(Math.random() * prefixes.length)];
  }

  private randomSuffix(): string {
    const suffixes = [
      ' Explain your reasoning.',
      ' Be specific.',
      ' Include examples.',
      ' Verify your answer.',
      ' Consider edge cases.'
    ];
    return suffixes[Math.floor(Math.random() * suffixes.length)];
  }

  private estimateCost(tokens: number): number {
    // Rough estimate: $0.01 per 1000 tokens
    return (tokens / 1000) * 0.01;
  }

  private initializeBuiltInValidators(): void {
    // These would be pre-built validators that can be reused across test cases
  }
}