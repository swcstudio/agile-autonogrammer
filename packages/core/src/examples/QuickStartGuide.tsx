/**
 * Quick Start Guide - Get Up and Running with Thread Primitives in Minutes
 * 
 * This guide shows developers how to go from zero to production-ready
 * threading in just a few minutes with minimal code changes.
 */

import React, { useState } from 'react';
import { 
  ThreadProvider,
  useCompute,
  useAsyncIO,
  useAI,
  useParallelMap,
  compute,
  parallelMap,
  ThreadMonitor
} from '../components/ThreadPrimitives';

export function QuickStartGuide() {
  return (
    <div className="quick-start-guide">
      <h1>🚀 Thread Primitives Quick Start</h1>
      <p>Get production-ready threading in your React app in under 5 minutes!</p>

      <div className="guide-sections">
        <InstallationSection />
        <BasicSetupSection />
        <SimpleExamplesSection />
        <AdvancedPatternsSection />
        <ProductionTipsSection />
        <TroubleshootingSection />
      </div>
    </div>
  );
}

function InstallationSection() {
  return (
    <section className="guide-section">
      <h2>📦 Step 1: Installation</h2>
      <p>Add thread primitives to your project:</p>
      
      <div className="code-block">
        <pre><code>{`npm install @swcstudio/multithreading

# or with yarn
yarn add @swcstudio/multithreading`}</code></pre>
      </div>
      
      <div className="note">
        <strong>Note:</strong> The native binaries are automatically installed for your platform!
      </div>
    </section>
  );
}

function BasicSetupSection() {
  return (
    <section className="guide-section">
      <h2>⚙️ Step 2: Basic Setup</h2>
      <p>Wrap your app with the ThreadProvider:</p>
      
      <div className="code-block">
        <pre><code>{`import { ThreadProvider } from '@swcstudio/multithreading';

function App() {
  return (
    <ThreadProvider>
      <YourAppContent />
    </ThreadProvider>
  );
}`}</code></pre>
      </div>
      
      <div className="success">
        <strong>That's it!</strong> Your app now has access to production-grade threading.
      </div>
    </section>
  );
}

function SimpleExamplesSection() {
  return (
    <section className="guide-section">
      <h2>🎯 Step 3: Simple Examples</h2>
      
      <div className="example-tabs">
        <ExampleTab title="CPU-Heavy Task" id="cpu-example">
          <CPUExample />
        </ExampleTab>
        
        <ExampleTab title="Parallel Processing" id="parallel-example">
          <ParallelExample />
        </ExampleTab>
        
        <ExampleTab title="API Requests" id="api-example">
          <APIExample />
        </ExampleTab>
        
        <ExampleTab title="AI Processing" id="ai-example">
          <AIExample />
        </ExampleTab>
      </div>
    </section>
  );
}

function CPUExample() {
  const [result, setResult] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processData = useCompute<number[], number>('heavy-math');

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const data = Array.from({ length: 10000 }, (_, i) => i + 1);
      const processed = await processData(data);
      setResult(processed);
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="example-content">
      <h4>Process 10,000 numbers using optimized CPU threads</h4>
      
      <div className="code-block">
        <pre><code>{`import { useCompute } from '@swcstudio/multithreading';

function MyComponent() {
  const processData = useCompute('heavy-math');
  
  const handleClick = async () => {
    const data = Array.from({ length: 10000 }, (_, i) => i + 1);
    const result = await processData(data);
    console.log('Processed:', result);
  };
  
  return <button onClick={handleClick}>Process Data</button>;
}`}</code></pre>
      </div>
      
      <div className="live-demo">
        <button onClick={handleProcess} disabled={isProcessing}>
          {isProcessing ? '🧮 Processing...' : '🚀 Process 10K Numbers'}
        </button>
        {result !== null && (
          <div className="result">✅ Result: {result.toFixed(2)}</div>
        )}
      </div>
    </div>
  );
}

function ParallelExample() {
  const [results, setResults] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const processParallel = useParallelMap<number, number>('square-numbers', 'cpu-bound');

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const numbers = Array.from({ length: 1000 }, (_, i) => i + 1);
      const squared = await processParallel(numbers);
      setResults(squared.slice(0, 10)); // Show first 10 results
    } catch (error) {
      console.error('Processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="example-content">
      <h4>Process arrays in parallel across all CPU cores</h4>
      
      <div className="code-block">
        <pre><code>{`import { useParallelMap } from '@swcstudio/multithreading';

function MyComponent() {
  const processParallel = useParallelMap('square-numbers', 'cpu-bound');
  
  const handleClick = async () => {
    const numbers = [1, 2, 3, 4, 5, ...]; // Large array
    const results = await processParallel(numbers);
    console.log('All results:', results);
  };
  
  return <button onClick={handleClick}>Process Array</button>;
}`}</code></pre>
      </div>
      
      <div className="live-demo">
        <button onClick={handleProcess} disabled={isProcessing}>
          {isProcessing ? '⚡ Processing...' : '📊 Process 1K Numbers in Parallel'}
        </button>
        {results.length > 0 && (
          <div className="result">
            ✅ First 10 results: {results.map(n => n.toFixed(0)).join(', ')}...
          </div>
        )}
      </div>
    </div>
  );
}

function APIExample() {
  const [responses, setResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchAPI = useAsyncIO<string, any>('fetch-json');

  const handleFetch = async () => {
    setIsLoading(true);
    try {
      const urls = [
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://jsonplaceholder.typicode.com/users/1',
        'https://jsonplaceholder.typicode.com/albums/1'
      ];
      
      // All requests run in parallel on I/O threads
      const results = await Promise.all(urls.map(url => fetchAPI(url)));
      setResponses(results);
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="example-content">
      <h4>Make parallel API requests using I/O optimized threads</h4>
      
      <div className="code-block">
        <pre><code>{`import { useAsyncIO } from '@swcstudio/multithreading';

function MyComponent() {
  const fetchAPI = useAsyncIO('fetch-json');
  
  const handleClick = async () => {
    const urls = ['api1.com', 'api2.com', 'api3.com'];
    
    // All requests run in parallel
    const results = await Promise.all(
      urls.map(url => fetchAPI(url))
    );
    
    console.log('All APIs loaded:', results);
  };
  
  return <button onClick={handleClick}>Fetch APIs</button>;
}`}</code></pre>
      </div>
      
      <div className="live-demo">
        <button onClick={handleFetch} disabled={isLoading}>
          {isLoading ? '🌐 Fetching...' : '📡 Fetch 3 APIs in Parallel'}
        </button>
        {responses.length > 0 && (
          <div className="result">
            ✅ Loaded {responses.length} API responses successfully!
          </div>
        )}
      </div>
    </div>
  );
}

function AIExample() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const analyzeText = useAI<string, any>('sentiment-analysis');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const text = "I absolutely love using thread primitives! They make my React app so much faster and more responsive.";
      const result = await analyzeText(text);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="example-content">
      <h4>Run AI/ML tasks on AI-optimized thread pools</h4>
      
      <div className="code-block">
        <pre><code>{`import { useAI } from '@swcstudio/multithreading';

function MyComponent() {
  const analyzeText = useAI('sentiment-analysis');
  
  const handleClick = async () => {
    const text = "Your text to analyze...";
    const analysis = await analyzeText(text);
    console.log('AI Analysis:', analysis);
  };
  
  return <button onClick={handleClick}>Analyze Text</button>;
}`}</code></pre>
      </div>
      
      <div className="live-demo">
        <button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? '🤖 Analyzing...' : '🧠 Analyze Sentiment'}
        </button>
        {analysis && (
          <div className="result">
            ✅ Sentiment: <strong>{analysis.sentiment}</strong> 
            (Confidence: {(analysis.confidence * 100).toFixed(1)}%)
          </div>
        )}
      </div>
    </div>
  );
}

function AdvancedPatternsSection() {
  return (
    <section className="guide-section">
      <h2>🎓 Advanced Patterns</h2>
      
      <div className="pattern-grid">
        <div className="pattern-card">
          <h4>🔄 Persistent Workers</h4>
          <div className="code-block">
            <pre><code>{`const { execute, stop } = useWorker('long-task', 'cpu-bound');

// Process many tasks efficiently
for (const task of tasks) {
  const result = await execute(task);
  console.log(result);
}

// Cleanup when done
stop();`}</code></pre>
          </div>
        </div>

        <div className="pattern-card">
          <h4>⏳ React Suspense</h4>
          <div className="code-block">
            <pre><code>{`<ThreadSuspense
  operation="heavy-task"
  data={inputData}
  fallback={<LoadingSpinner />}
>
  {(result) => <ResultDisplay data={result} />}
</ThreadSuspense>`}</code></pre>
          </div>
        </div>

        <div className="pattern-card">
          <h4>📊 Performance Monitoring</h4>
          <div className="code-block">
            <pre><code>{`function MyApp() {
  return (
    <ThreadProvider>
      <ThreadMonitor /> {/* Built-in monitoring */}
      <YourComponents />
    </ThreadProvider>
  );
}`}</code></pre>
          </div>
        </div>

        <div className="pattern-card">
          <h4>🎯 Direct Usage</h4>
          <div className="code-block">
            <pre><code>{`import { compute, asyncIO, aiProcess } from '@swcstudio/multithreading';

// Use anywhere, even outside React
const result = await compute('fibonacci', 35);
const data = await asyncIO('fetch', url);
const analysis = await aiProcess('classify', text);`}</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductionTipsSection() {
  return (
    <section className="guide-section">
      <h2>🏭 Production Tips</h2>
      
      <div className="tips-grid">
        <div className="tip-card success">
          <h4>✅ Do This</h4>
          <ul>
            <li>Use appropriate strategies: <code>cpu-bound</code>, <code>io-bound</code>, <code>ai-optimized</code></li>
            <li>Batch similar operations for better performance</li>
            <li>Monitor thread metrics in development</li>
            <li>Set reasonable timeouts for long-running tasks</li>
            <li>Handle errors gracefully with try-catch</li>
          </ul>
        </div>

        <div className="tip-card warning">
          <h4>⚠️ Avoid This</h4>
          <ul>
            <li>Don't use threads for very small/fast operations</li>
            <li>Avoid creating too many workers simultaneously</li>
            <li>Don't forget to stop persistent workers</li>
            <li>Avoid blocking the main thread while waiting</li>
            <li>Don't ignore memory management for large datasets</li>
          </ul>
        </div>
      </div>

      <div className="performance-checklist">
        <h4>🎯 Performance Checklist</h4>
        <ul className="checklist">
          <li>✅ Profile your app to identify bottlenecks</li>
          <li>✅ Use the right strategy for each operation type</li>
          <li>✅ Implement proper error handling and timeouts</li>
          <li>✅ Monitor CPU and memory usage in production</li>
          <li>✅ Test on various device configurations</li>
          <li>✅ Use ThreadMonitor during development</li>
        </ul>
      </div>
    </section>
  );
}

function TroubleshootingSection() {
  return (
    <section className="guide-section">
      <h2>🔧 Troubleshooting</h2>
      
      <div className="troubleshooting-grid">
        <div className="issue-card">
          <h4>❌ "Module not found" errors</h4>
          <p><strong>Solution:</strong> Make sure you've installed the package and restarted your dev server.</p>
          <div className="code-block">
            <pre><code>npm install @swcstudio/multithreading
npm start</code></pre>
          </div>
        </div>

        <div className="issue-card">
          <h4>❌ Performance not improving</h4>
          <p><strong>Solution:</strong> Check if your tasks are CPU-intensive enough to benefit from threading.</p>
          <div className="code-block">
            <pre><code>// Use ThreadMonitor to check utilization
<ThreadMonitor />

// Profile your operations
console.time('operation');
await compute('your-operation', data);
console.timeEnd('operation');</code></pre>
          </div>
        </div>

        <div className="issue-card">
          <h4>❌ Memory usage too high</h4>
          <p><strong>Solution:</strong> Process data in smaller batches and cleanup workers.</p>
          <div className="code-block">
            <pre><code>// Process in batches
const batches = chunk(largeArray, 1000);
for (const batch of batches) {
  await processParallel(batch);
}

// Stop workers when done
worker.stop();</code></pre>
          </div>
        </div>

        <div className="issue-card">
          <h4>❌ TypeScript errors</h4>
          <p><strong>Solution:</strong> Make sure you have the latest types and TypeScript version.</p>
          <div className="code-block">
            <pre><code>// Explicitly type your operations
const compute = useCompute<InputType, OutputType>('operation');

// Or use type assertions
const result = await compute(data) as MyResultType;</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}

// Helper components

function ExampleTab({ title, id, children }: { 
  title: string; 
  id: string; 
  children: React.ReactNode; 
}) {
  const [isActive, setIsActive] = useState(id === 'cpu-example');
  
  return (
    <ThreadProvider>
      <div className="example-tab">
        <button 
          className={`tab-button ${isActive ? 'active' : ''}`}
          onClick={() => setIsActive(!isActive)}
        >
          {title}
        </button>
        {isActive && (
          <div className="tab-content">
            {children}
          </div>
        )}
      </div>
    </ThreadProvider>
  );
}

// Styles (would be in separate CSS file in production)
const styles = `
  .quick-start-guide {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .guide-section {
    margin: 40px 0;
    padding: 30px;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    background: white;
  }

  .code-block {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 20px;
    margin: 15px 0;
    overflow-x: auto;
  }

  .code-block pre {
    margin: 0;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.5;
  }

  .note {
    background: #e3f2fd;
    border-left: 4px solid #2196f3;
    padding: 15px;
    margin: 15px 0;
    border-radius: 4px;
  }

  .success {
    background: #e8f5e8;
    border-left: 4px solid #4caf50;
    padding: 15px;
    margin: 15px 0;
    border-radius: 4px;
  }

  .example-tabs {
    margin: 20px 0;
  }

  .tab-button {
    background: #f5f5f5;
    border: 1px solid #ddd;
    padding: 10px 20px;
    margin-right: 10px;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
  }

  .tab-button.active {
    background: white;
    border-bottom: none;
  }

  .tab-content {
    border: 1px solid #ddd;
    border-radius: 0 6px 6px 6px;
    padding: 20px;
    margin-top: -1px;
  }

  .live-demo {
    background: #f0f7ff;
    border: 1px solid #b3d9ff;
    border-radius: 8px;
    padding: 20px;
    margin: 15px 0;
  }

  .live-demo button {
    background: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  }

  .live-demo button:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .result {
    margin-top: 15px;
    padding: 10px;
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
    color: #155724;
  }

  .pattern-grid,
  .tips-grid,
  .troubleshooting-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin: 20px 0;
  }

  .pattern-card,
  .tip-card,
  .issue-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
  }

  .tip-card.success {
    border-color: #4caf50;
    background: #f1f8e9;
  }

  .tip-card.warning {
    border-color: #ff9800;
    background: #fff3e0;
  }

  .checklist {
    list-style: none;
    padding: 0;
  }

  .checklist li {
    margin: 8px 0;
    padding: 5px 0;
  }
`;

export default QuickStartGuide;