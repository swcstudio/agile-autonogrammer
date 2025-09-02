export interface TestTemplate {
  name: string;
  template: string;
  variables: string[];
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
}

export interface ComponentEvent {
  name: string;
  handler: string;
}

export interface ComponentState {
  name: string;
  setter: string;
  initialValue: any;
}

export interface ComponentEffect {
  dependencies: string[];
  description: string;
}

export interface ComponentInfo {
  name: string;
  props: ComponentProp[];
  events: ComponentEvent[];
  states: ComponentState[];
  effects: ComponentEffect[];
  filePath: string;
}

export interface TestSuite {
  fileName: string;
  content: string;
  testCount: number;
  coverage: number;
}

export interface TestCoverageReport {
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
}

export interface TestMetrics {
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: TestCoverageReport;
}

export interface TestSuggestion {
  type: 'missing-test' | 'improvement' | 'refactor' | 'performance';
  severity: 'low' | 'medium' | 'high';
  description: string;
  code?: string;
  line?: number;
}

export interface MockDataSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'uuid';
    format?: string;
    required?: boolean;
    enum?: any[];
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    properties?: MockDataSchema;
    items?: MockDataSchema;
  };
}

export interface TestRunnerConfig {
  framework: 'deno' | 'jest' | 'vitest';
  coverage: boolean;
  watch: boolean;
  parallel: boolean;
  timeout: number;
  reporters: string[];
  coverageThresholds: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

export interface AITestGeneratorConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  templates?: Map<string, TestTemplate>;
}
