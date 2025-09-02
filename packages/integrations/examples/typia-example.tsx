/**
 * Typia Integration Example for Katalyst Core
 *
 * This example demonstrates ultra-fast TypeScript validation/serialization
 * with Katalyst's superior React 19 framework architecture.
 *
 * CRITICAL: Typia enhances but never replaces Katalyst's patterns:
 * - Frontend: React 19 + TanStack Router + Zustand (Katalyst Superior)
 * - Validation: Typia compile-time optimized (30,000x faster)
 * - Architecture: Validation enhances Katalyst without replacement
 */

import React, { useState, useEffect } from 'react';
import {
  TypiaHealthCheck,
  TypiaRuntimeProvider,
  useTypia,
  withTypia,
} from '../components/TypiaRuntimeProvider.tsx';
import {
  useTypiaForm,
  useTypiaGeneration,
  useTypiaJsonSchema,
  useTypiaPerformance,
  useTypiaProtobuf,
  useTypiaSerialization,
  useTypiaValidation,
} from '../hooks/use-typia.ts';
import type { TypiaConfig } from '../integrations/typia.ts';

// Example Typia Configuration
const typiaConfig: TypiaConfig = {
  validation: true,
  serialization: true,
  randomGeneration: true,
  protobuf: true,
  jsonSchema: true,
  optimization: true,
  strictMode: true,
  target: 'es2020',
};

// Example data types for demonstration
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  role: 'admin' | 'user' | 'moderator';
  metadata: {
    lastLogin: Date;
    preferences: Record<string, any>;
  };
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  inStock: boolean;
  specifications: {
    weight: number;
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: number;
  metadata: {
    requestId: string;
    processingTime: number;
  };
}

// Validation Example Component
function TypiaValidationExample() {
  const { validate, assert, is, equals, performance } = useTypiaValidation<User>();
  const [testData, setTestData] = useState<unknown>({});
  const [validationResult, setValidationResult] = useState<any>(null);

  const testValidation = () => {
    const sampleUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      role: 'admin',
      metadata: {
        lastLogin: new Date(),
        preferences: { theme: 'dark', language: 'en' },
      },
    };

    const result = validate(sampleUser);
    setValidationResult(result);
  };

  const testInvalidData = () => {
    const invalidUser = {
      id: 'not-a-number',
      name: '',
      email: 'invalid-email',
      role: 'invalid-role',
    };

    const result = validate(invalidUser);
    setValidationResult(result);
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>⚡ Typia Validation ({performance.speedup})</h3>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={testValidation}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
          }}
        >
          Test Valid User
        </button>
        <button
          onClick={testInvalidData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Test Invalid User
        </button>
      </div>

      {validationResult && (
        <div
          style={{
            padding: '15px',
            backgroundColor: validationResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${validationResult.success ? '#10b981' : '#ef4444'}`,
            borderRadius: '4px',
          }}
        >
          <div>
            <strong>Success:</strong> {validationResult.success ? 'Yes' : 'No'}
          </div>
          {validationResult.errors.length > 0 && (
            <div>
              <strong>Errors:</strong>
              <ul>
                {validationResult.errors.map((error: any, index: number) => (
                  <li key={index}>
                    {error.path}: {error.expected}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <small>Performance: {performance.speedup}</small>
          </div>
        </div>
      )}
    </div>
  );
}

// Serialization Example Component
function TypiaSerializationExample() {
  const { stringify, parse, assertStringify, performance, cacheStats } =
    useTypiaSerialization<Product>();
  const [serializedData, setSerializedData] = useState<string>('');
  const [parsedData, setParsedData] = useState<any>(null);

  const sampleProduct: Product = {
    id: 1,
    name: 'Gaming Laptop',
    description: 'High-performance gaming laptop with RTX graphics',
    price: 1299.99,
    category: 'Electronics',
    tags: ['gaming', 'laptop', 'rtx', 'high-performance'],
    inStock: true,
    specifications: {
      weight: 2.5,
      dimensions: {
        width: 35.6,
        height: 2.4,
        depth: 24.2,
      },
    },
  };

  const testSerialization = () => {
    const serialized = stringify(sampleProduct, { cache: true });
    setSerializedData(serialized);

    const parsed = parse(serialized);
    setParsedData(parsed);
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>🚀 Typia Serialization ({performance.speedup})</h3>

      <button
        onClick={testSerialization}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          marginBottom: '15px',
        }}
      >
        Test Serialization
      </button>

      <div style={{ marginBottom: '10px' }}>
        <strong>Cache Stats:</strong> {cacheStats.size} items cached
        <button
          onClick={cacheStats.clear}
          style={{
            marginLeft: '10px',
            padding: '4px 8px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
          }}
        >
          Clear Cache
        </button>
      </div>

      {serializedData && (
        <div style={{ marginBottom: '15px' }}>
          <div>
            <strong>Serialized JSON:</strong>
          </div>
          <pre
            style={{
              padding: '10px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '200px',
            }}
          >
            {serializedData}
          </pre>
        </div>
      )}

      {parsedData && (
        <div>
          <div>
            <strong>Parsed Data:</strong>
          </div>
          <pre
            style={{
              padding: '10px',
              backgroundColor: '#f0f9ff',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '200px',
            }}
          >
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Random Generation Example Component
function TypiaGenerationExample() {
  const { random, randomBatch, history, clearHistory, performance } = useTypiaGeneration<User>();
  const [generatedData, setGeneratedData] = useState<User | null>(null);
  const [batchData, setBatchData] = useState<User[]>([]);

  const generateSingleUser = () => {
    const user = random();
    setGeneratedData(user);
  };

  const generateUserBatch = () => {
    const users = randomBatch(5);
    setBatchData(users);
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>🎲 Typia Random Generation ({performance.speedup})</h3>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={generateSingleUser}
          style={{
            padding: '8px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
          }}
        >
          Generate User
        </button>
        <button
          onClick={generateUserBatch}
          style={{
            padding: '8px 16px',
            backgroundColor: '#06b6d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
          }}
        >
          Generate 5 Users
        </button>
        <button
          onClick={clearHistory}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Clear History ({history.length})
        </button>
      </div>

      {generatedData && (
        <div style={{ marginBottom: '15px' }}>
          <div>
            <strong>Generated User:</strong>
          </div>
          <pre
            style={{
              padding: '10px',
              backgroundColor: '#faf5ff',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '150px',
            }}
          >
            {JSON.stringify(generatedData, null, 2)}
          </pre>
        </div>
      )}

      {batchData.length > 0 && (
        <div>
          <div>
            <strong>Generated Batch ({batchData.length} users):</strong>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            {batchData.map((user, index) => (
              <div
                key={index}
                style={{
                  padding: '8px',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #14b8a6',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <div>
                  <strong>#{user.id}</strong>
                </div>
                <div>{user.name}</div>
                <div>{user.email}</div>
                <div>Role: {user.role}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Form Example with Typia Validation
function TypiaFormExample() {
  const initialUser: User = {
    id: 0,
    name: '',
    email: '',
    age: undefined,
    role: 'user',
    metadata: {
      lastLogin: new Date(),
      preferences: {},
    },
  };

  const { values, errors, touched, setValue, validateForm, reset, isValid } =
    useTypiaForm(initialUser);
  const [submitResult, setSubmitResult] = useState<string>('');

  const handleSubmit = () => {
    if (validateForm()) {
      setSubmitResult('✅ Form submitted successfully with Typia validation!');
    } else {
      setSubmitResult('❌ Form validation failed');
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>📝 Typia Form Validation</h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '15px',
        }}
      >
        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: errors.name ? '1px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '4px',
            }}
          />
          {errors.name && <div style={{ color: '#ef4444', fontSize: '12px' }}>{errors.name}</div>}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            value={values.email}
            onChange={(e) => setValue('email', e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: errors.email ? '1px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '4px',
            }}
          />
          {errors.email && <div style={{ color: '#ef4444', fontSize: '12px' }}>{errors.email}</div>}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Age (optional):</label>
          <input
            type="number"
            value={values.age || ''}
            onChange={(e) =>
              setValue('age', e.target.value ? Number.parseInt(e.target.value) : undefined)
            }
            style={{
              width: '100%',
              padding: '8px',
              border: errors.age ? '1px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '4px',
            }}
          />
          {errors.age && <div style={{ color: '#ef4444', fontSize: '12px' }}>{errors.age}</div>}
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Role:</label>
          <select
            value={values.role}
            onChange={(e) => setValue('role', e.target.value as 'admin' | 'user' | 'moderator')}
            style={{
              width: '100%',
              padding: '8px',
              border: errors.role ? '1px solid #ef4444' : '1px solid #d1d5db',
              borderRadius: '4px',
            }}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
          {errors.role && <div style={{ color: '#ef4444', fontSize: '12px' }}>{errors.role}</div>}
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          style={{
            padding: '8px 16px',
            backgroundColor: isValid ? '#10b981' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: isValid ? 'pointer' : 'not-allowed',
          }}
        >
          Submit (Typia Validated)
        </button>
        <button
          onClick={reset}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Reset
        </button>
      </div>

      {submitResult && (
        <div
          style={{
            padding: '10px',
            backgroundColor: submitResult.includes('✅') ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${submitResult.includes('✅') ? '#10b981' : '#ef4444'}`,
            borderRadius: '4px',
          }}
        >
          {submitResult}
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#6b7280' }}>
        Valid: {isValid ? 'Yes' : 'No'} | Real-time validation: 30,000x faster than alternatives
      </div>
    </div>
  );
}

// Integration Status Component
function TypiaIntegrationStatus() {
  const { performance, benchmark, benchmarks } = useTypiaPerformance();
  const typia = useTypia();

  const runPerformanceTest = () => {
    const testData = { name: 'Test', email: 'test@example.com' };

    benchmark('validation', () => {
      for (let i = 0; i < 1000; i++) {
        typia.validation.is(testData);
      }
    });

    benchmark('serialization', () => {
      for (let i = 0; i < 1000; i++) {
        typia.serialization.stringify(testData);
      }
    });

    benchmark('generation', () => {
      for (let i = 0; i < 100; i++) {
        typia.generation.random();
      }
    });
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: typia.isEnabled ? '#f0fdf4' : '#fef3f2',
        border: `1px solid ${typia.isEnabled ? '#10b981' : '#f87171'}`,
        borderRadius: '8px',
        marginBottom: '20px',
      }}
    >
      <h3>Typia Integration Status</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <p>
            <strong>Status:</strong> {typia.isEnabled ? '✅ Active' : '⚠️ Mock Mode'}
          </p>
          <p>
            <strong>Performance:</strong> {performance.validationSpeedup}
          </p>
          <p>
            <strong>Serialization:</strong> {performance.serializationSpeedup}
          </p>
          <p>
            <strong>Compile-time:</strong> {performance.compileTimeOptimization ? '✅' : '❌'}
          </p>
          <p>
            <strong>Zero Runtime:</strong> {performance.zeroRuntimeOverhead ? '✅' : '❌'}
          </p>
        </div>
        <div>
          <p>
            <strong>Framework:</strong> {typia.integration.framework}
          </p>
          <p>
            <strong>Role:</strong> {typia.integration.role}
          </p>
          <p>
            <strong>Katalyst Superior:</strong> ✅ Preserved
          </p>
          <p>
            <strong>Features:</strong> {typia.integration.features.length}
          </p>
        </div>
      </div>

      <button
        onClick={runPerformanceTest}
        style={{
          marginTop: '15px',
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        Run Performance Test
      </button>

      {Object.keys(benchmarks).some(
        (key) => benchmarks[key as keyof typeof benchmarks] !== null
      ) && (
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: '#f9fafb',
            borderRadius: '4px',
          }}
        >
          <strong>Benchmark Results:</strong>
          {benchmarks.validation && (
            <div>Validation (1000 ops): {benchmarks.validation.duration.toFixed(2)}ms</div>
          )}
          {benchmarks.serialization && (
            <div>Serialization (1000 ops): {benchmarks.serialization.duration.toFixed(2)}ms</div>
          )}
          {benchmarks.generation && (
            <div>Generation (100 ops): {benchmarks.generation.duration.toFixed(2)}ms</div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Example App Component
export function TypiaKatalystExample() {
  return (
    <TypiaRuntimeProvider
      config={typiaConfig}
      mockProvider={true} // Use mock for demo - set to false for real Typia
      onError={(error) => console.error('Typia Runtime Error:', error)}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <h1>⚡ 🎯 Typia + Katalyst Integration Example</h1>

        <div
          style={{
            padding: '15px',
            backgroundColor: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <strong>🎯 Architecture:</strong> Katalyst (React 19 + TanStack + Zustand) with Typia
          ultra-fast validation.
          <br />
          <strong>✨ Key Principle:</strong> Typia enhances validation performance - Katalyst
          remains architecturally superior.
          <br />
          <strong>🚀 Performance:</strong> 30,000x faster validation with zero runtime overhead.
        </div>

        <TypiaHealthCheck
          fallback={
            <div
              style={{
                padding: '20px',
                backgroundColor: '#fef2f2',
                border: '1px solid #ef4444',
                borderRadius: '8px',
              }}
            >
              <h3>⚡ Typia Setup Required</h3>
              <p>
                For full Typia performance, configure the Typia transformer in your build process.
              </p>
              <code
                style={{
                  display: 'block',
                  padding: '10px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  margin: '10px 0',
                }}
              >
                npm install typia @typia/unplugin
                <br />
                // Configure unplugin-typia in your build tool
              </code>
              <p>Currently running in mock mode for demonstration.</p>
            </div>
          }
        >
          <TypiaIntegrationStatus />
          <TypiaValidationExample />
          <TypiaSerializationExample />
          <TypiaGenerationExample />
          <TypiaFormExample />
        </TypiaHealthCheck>
      </div>
    </TypiaRuntimeProvider>
  );
}

// HOC Example - Enhanced component with Typia
const EnhancedTypiaComponent = withTypia<{ title: string }>(({ title, typia }) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>Typia Status: {typia.isEnabled ? 'Ultra-fast mode' : 'Mock mode'}</p>
      <p>Performance: {typia.performance.validationSpeedup}</p>
      <p>Integration: {typia.integration.framework} (Katalyst Superior)</p>
    </div>
  );
});

export default TypiaKatalystExample;
