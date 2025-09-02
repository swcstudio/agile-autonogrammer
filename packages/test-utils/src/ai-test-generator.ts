import { readFile, writeFile } from 'node:fs/promises';
import { parse } from '@typescript-eslint/parser';
import { traverse } from '@typescript-eslint/visitor-keys';
import { OpenAI } from 'openai';
import type { ComponentInfo, TestSuite, TestTemplate } from './types';

export class AITestGenerator {
  private openai: OpenAI;
  private templates: Map<string, TestTemplate>;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({ apiKey });
    this.templates = new Map();
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates() {
    // Component test template
    this.templates.set('component', {
      name: 'React Component Test',
      template: `
describe('{{componentName}}', () => {
  {{#props}}
  test('renders with {{propName}} prop', () => {
    render(<{{componentName}} {{propName}}="{{testValue}}" />);
    {{assertion}};
  });
  {{/props}}
  
  {{#events}}
  test('handles {{eventName}} event', () => {
    const {{handlerName}} = jest.fn();
    render(<{{componentName}} {{eventProp}}={{handlerName}} />);
    {{triggerEvent}};
    expect({{handlerName}}).toHaveBeenCalled();
  });
  {{/events}}
  
  {{#states}}
  test('manages {{stateName}} state', () => {
    const { result } = renderHook(() => {{componentName}}.useInternalState());
    act(() => {
      result.current.{{stateUpdater}}({{newValue}});
    });
    expect(result.current.{{stateName}}).toBe({{expectedValue}});
  });
  {{/states}}
});`,
      variables: ['componentName', 'props', 'events', 'states'],
    });

    // API test template
    this.templates.set('api', {
      name: 'API Endpoint Test',
      template: `
describe('{{endpoint}}', () => {
  {{#methods}}
  describe('{{method}} {{path}}', () => {
    test('returns {{expectedStatus}} for valid request', async () => {
      const response = await request(app)
        .{{methodLower}}('{{path}}')
        {{#body}}.send({{requestBody}}){{/body}}
        {{#headers}}.set('{{headerName}}', '{{headerValue}}'){{/headers}};
      
      expect(response.status).toBe({{expectedStatus}});
      {{#responseValidation}}
      expect(response.body).toMatchObject({{expectedResponse}});
      {{/responseValidation}}
    });
    
    {{#errorCases}}
    test('returns {{errorStatus}} for {{errorCase}}', async () => {
      const response = await request(app)
        .{{methodLower}}('{{path}}')
        .send({{errorBody}});
      
      expect(response.status).toBe({{errorStatus}});
      expect(response.body.error).toBeDefined();
    });
    {{/errorCases}}
  });
  {{/methods}}
});`,
      variables: ['endpoint', 'methods', 'errorCases'],
    });

    // Hook test template
    this.templates.set('hook', {
      name: 'React Hook Test',
      template: `
describe('{{hookName}}', () => {
  test('returns initial state', () => {
    const { result } = renderHook(() => {{hookName}}({{initialArgs}}));
    expect(result.current).toMatchObject({{expectedInitial}});
  });
  
  {{#updates}}
  test('updates {{updateDescription}}', () => {
    const { result } = renderHook(() => {{hookName}}());
    
    act(() => {
      {{updateAction}};
    });
    
    expect(result.current).toMatchObject({{expectedAfterUpdate}});
  });
  {{/updates}}
  
  {{#effects}}
  test('{{effectDescription}}', async () => {
    const { result, rerender } = renderHook(
      ({ deps }) => {{hookName}}(deps),
      { initialProps: { deps: {{initialDeps}} } }
    );
    
    rerender({ deps: {{updatedDeps}} });
    
    await waitFor(() => {
      expect(result.current).toMatchObject({{expectedAfterEffect}});
    });
  });
  {{/effects}}
});`,
      variables: ['hookName', 'updates', 'effects'],
    });

    // Integration test template
    this.templates.set('integration', {
      name: 'Integration Test',
      template: `
describe('{{featureName}} Integration', () => {
  let {{#services}}{{serviceName}}, {{/services}};
  
  beforeEach(async () => {
    {{#services}}
    {{serviceName}} = await create{{ServiceName}}();
    {{/services}}
  });
  
  afterEach(async () => {
    {{#services}}
    await {{serviceName}}.cleanup();
    {{/services}}
  });
  
  test('{{scenarioDescription}}', async () => {
    // Arrange
    {{#arrange}}
    {{arrangeStep}};
    {{/arrange}}
    
    // Act
    {{#act}}
    {{actStep}};
    {{/act}}
    
    // Assert
    {{#assert}}
    expect({{assertion}}).toBe({{expected}});
    {{/assert}}
  });
});`,
      variables: ['featureName', 'services', 'scenarios'],
    });
  }

  async analyzeComponent(filePath: string): Promise<ComponentInfo> {
    const content = await readFile(filePath, 'utf-8');
    const ast = parse(content, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    });

    const componentInfo: ComponentInfo = {
      name: '',
      props: [],
      events: [],
      states: [],
      effects: [],
      filePath,
    };

    // Traverse AST to extract component information
    traverse(ast, {
      enter(node: any) {
        if (node.type === 'FunctionDeclaration' || node.type === 'ArrowFunctionExpression') {
          if (node.id && /^[A-Z]/.test(node.id.name)) {
            componentInfo.name = node.id.name;

            // Extract props from parameters
            if (node.params[0] && node.params[0].type === 'ObjectPattern') {
              componentInfo.props = node.params[0].properties.map((prop: any) => ({
                name: prop.key.name,
                type: 'unknown', // Would need type inference
                required: !prop.optional,
              }));
            }
          }
        }

        // Detect event handlers
        if (node.type === 'JSXAttribute' && node.name.name.startsWith('on')) {
          componentInfo.events.push({
            name: node.name.name,
            handler: node.value?.expression?.name || 'handler',
          });
        }

        // Detect useState calls
        if (node.type === 'CallExpression' && node.callee.name === 'useState') {
          const stateVar = node.parent?.id?.elements?.[0]?.name;
          const setterVar = node.parent?.id?.elements?.[1]?.name;
          if (stateVar && setterVar) {
            componentInfo.states.push({
              name: stateVar,
              setter: setterVar,
              initialValue: node.arguments[0],
            });
          }
        }
      },
    });

    return componentInfo;
  }

  async generateTests(componentInfo: ComponentInfo, template = 'component'): Promise<TestSuite> {
    const testTemplate = this.templates.get(template);
    if (!testTemplate) {
      throw new Error(`Template ${template} not found`);
    }

    // Generate test content using AI
    const prompt = `
Generate comprehensive tests for a React component with the following information:
Component Name: ${componentInfo.name}
Props: ${JSON.stringify(componentInfo.props)}
Events: ${JSON.stringify(componentInfo.events)}
States: ${JSON.stringify(componentInfo.states)}

Generate tests that cover:
1. Rendering with different prop combinations
2. Event handler invocations
3. State updates and side effects
4. Edge cases and error scenarios
5. Accessibility requirements

Format the response as JSON with the structure matching the template variables.
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert test engineer specializing in React testing.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const testData = JSON.parse(completion.choices[0].message.content || '{}');

    // Render template with data
    const testContent = this.renderTemplate(testTemplate.template, {
      componentName: componentInfo.name,
      ...testData,
    });

    return {
      fileName: `${componentInfo.name}.test.tsx`,
      content: testContent,
      testCount: this.countTests(testContent),
      coverage: await this.estimateCoverage(componentInfo, testContent),
    };
  }

  private renderTemplate(template: string, data: any): string {
    return template
      .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
        const items = data[key];
        if (!Array.isArray(items)) return '';

        return items
          .map((item) => content.replace(/\{\{(\w+)\}\}/g, (m: string, k: string) => item[k] || ''))
          .join('\n');
      })
      .replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || '');
  }

  private countTests(content: string): number {
    const testMatches = content.match(/test\s*\(/g);
    return testMatches ? testMatches.length : 0;
  }

  private async estimateCoverage(
    componentInfo: ComponentInfo,
    testContent: string
  ): Promise<number> {
    // Simple heuristic: check if major features are tested
    let coverage = 0;
    const totalFeatures =
      componentInfo.props.length + componentInfo.events.length + componentInfo.states.length + 1; // +1 for basic render

    if (testContent.includes('render')) coverage++;

    componentInfo.props.forEach((prop) => {
      if (testContent.includes(prop.name)) coverage++;
    });

    componentInfo.events.forEach((event) => {
      if (testContent.includes(event.name)) coverage++;
    });

    componentInfo.states.forEach((state) => {
      if (testContent.includes(state.name)) coverage++;
    });

    return Math.round((coverage / totalFeatures) * 100);
  }

  async generateTestSuite(
    directory: string,
    options: {
      recursive?: boolean;
      template?: string;
      output?: string;
    } = {}
  ): Promise<TestSuite[]> {
    const testSuites: TestSuite[] = [];

    // Find all component files
    const files = await this.findComponentFiles(directory, options.recursive);

    for (const file of files) {
      try {
        const componentInfo = await this.analyzeComponent(file);
        const testSuite = await this.generateTests(componentInfo, options.template);

        if (options.output) {
          const outputPath = file.replace(/\.tsx?$/, '.test.tsx');
          await writeFile(outputPath, testSuite.content);
        }

        testSuites.push(testSuite);
      } catch (error) {
        console.error(`Failed to generate tests for ${file}:`, error);
      }
    }

    return testSuites;
  }

  private async findComponentFiles(directory: string, recursive = true): Promise<string[]> {
    // Implementation would use fs.readdir recursively
    // For now, return mock data
    return [];
  }

  async suggestTestImprovements(testFile: string): Promise<string[]> {
    const content = await readFile(testFile, 'utf-8');

    const prompt = `
Analyze this test file and suggest improvements:

${content}

Focus on:
1. Missing test cases
2. Better assertions
3. Performance optimizations
4. Maintainability improvements
5. Edge cases not covered

Provide specific, actionable suggestions.
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert test engineer. Provide specific, actionable test improvements.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const suggestions = completion.choices[0].message.content || '';
    return suggestions.split('\n').filter((s) => s.trim().length > 0);
  }

  async generateMockData(schema: any, count = 1): Promise<any[]> {
    const prompt = `
Generate ${count} realistic mock data objects matching this schema:
${JSON.stringify(schema, null, 2)}

Requirements:
- Use realistic values (not just "test" or "example")
- Ensure uniqueness for ID fields
- Follow the exact schema structure
- Return as JSON array
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Generate realistic test data following the exact schema provided.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    return JSON.parse(completion.choices[0].message.content || '[]');
  }
}

// Export singleton instance
export const aiTestGenerator = new AITestGenerator(process.env.OPENAI_API_KEY);

// Export test generation CLI
export async function generateTestsForFile(filePath: string, outputPath?: string) {
  const generator = new AITestGenerator();
  const componentInfo = await generator.analyzeComponent(filePath);
  const testSuite = await generator.generateTests(componentInfo);

  if (outputPath) {
    await writeFile(outputPath, testSuite.content);
    console.log(`Generated ${testSuite.testCount} tests with ~${testSuite.coverage}% coverage`);
  }

  return testSuite;
}
