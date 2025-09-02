/**
 * Real-World Thread Primitives Examples
 * 
 * These examples show how the thread primitives make complex threading
 * operations trivially simple for developers to use.
 */

import React, { useState, useCallback } from 'react';
import {
  ThreadProvider,
  useCompute,
  useAsyncIO,
  useAI,
  useParallelMap,
  useWorker,
  ThreadSuspense,
  ParallelProcessor,
  StreamProcessor,
  ThreadMonitor,
  compute,
  asyncIO,
  aiProcess
} from '../components/ThreadPrimitives';

// Example 1: CPU-Intensive Data Processing
function DataProcessingExample() {
  const [data, setData] = useState<number[]>([]);
  const [results, setResults] = useState<number[]>([]);
  const processNumbers = useCompute<number[], number[]>('heavy-calculation');

  const generateData = useCallback(() => {
    const newData = Array.from({ length: 10000 }, () => Math.random() * 1000);
    setData(newData);
  }, []);

  const handleProcess = useCallback(async () => {
    try {
      // This runs on a dedicated CPU thread pool automatically
      const processed = await processNumbers(data);
      setResults(processed);
    } catch (error) {
      console.error('Processing failed:', error);
    }
  }, [data, processNumbers]);

  return (
    <div className="example-section">
      <h3>🧮 CPU-Intensive Processing</h3>
      <p>Process 10,000 numbers using optimized CPU threads</p>
      
      <div className="controls">
        <button onClick={generateData}>Generate Data</button>
        <button onClick={handleProcess} disabled={!data.length}>
          Process ({data.length} items)
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="results">
          <p>✅ Processed {results.length} items successfully!</p>
          <p>Sample results: {results.slice(0, 5).map(n => n.toFixed(2)).join(', ')}...</p>
        </div>
      )}
    </div>
  );
}

// Example 2: Parallel API Requests
function ParallelAPIExample() {
  const [urls, setUrls] = useState<string[]>([
    'https://api.github.com/users/octocat',
    'https://api.github.com/users/torvalds',
    'https://api.github.com/users/gaearon'
  ]);
  const [responses, setResponses] = useState<any[]>([]);
  const fetchData = useAsyncIO<string, any>('fetch-api');

  const handleFetchAll = useCallback(async () => {
    try {
      // All requests run in parallel on I/O optimized threads
      const results = await Promise.all(
        urls.map(url => fetchData(url))
      );
      setResponses(results);
    } catch (error) {
      console.error('Fetch failed:', error);
    }
  }, [urls, fetchData]);

  return (
    <div className="example-section">
      <h3>🌐 Parallel API Requests</h3>
      <p>Fetch multiple APIs simultaneously using I/O threads</p>
      
      <div className="controls">
        <button onClick={handleFetchAll}>Fetch All APIs</button>
      </div>
      
      {responses.length > 0 && (
        <div className="results">
          <p>✅ Fetched {responses.length} API responses!</p>
          {responses.map((response, index) => (
            <div key={index} className="api-result">
              <strong>{urls[index]}:</strong> {response?.login || 'Success'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Example 3: AI/ML Processing
function AIProcessingExample() {
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const analyzeText = useAI<string, any>('text-analysis');

  const handleAnalyze = useCallback(async () => {
    if (!inputText.trim()) return;
    
    try {
      // This would run on AI-optimized thread pool
      const result = await analyzeText(inputText);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  }, [inputText, analyzeText]);

  return (
    <div className="example-section">
      <h3>🤖 AI Text Analysis</h3>
      <p>Analyze text using AI-optimized thread pool</p>
      
      <div className="controls">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text to analyze..."
          rows={4}
          style={{ width: '100%', marginBottom: '10px' }}
        />
        <button onClick={handleAnalyze} disabled={!inputText.trim()}>
          Analyze Text
        </button>
      </div>
      
      {analysis && (
        <div className="results">
          <p>✅ Analysis complete!</p>
          <pre>{JSON.stringify(analysis, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// Example 4: Parallel Array Processing
function ParallelMapExample() {
  const [numbers] = useState(() => 
    Array.from({ length: 1000 }, (_, i) => i + 1)
  );
  const [results, setResults] = useState<number[]>([]);
  const processParallel = useParallelMap<number, number>('square-root', 'cpu-bound');

  const handleProcess = useCallback(async () => {
    try {
      // Automatically distributes work across all available CPU threads
      const squared = await processParallel(numbers);
      setResults(squared);
    } catch (error) {
      console.error('Parallel processing failed:', error);
    }
  }, [numbers, processParallel]);

  return (
    <div className="example-section">
      <h3>⚡ Parallel Array Processing</h3>
      <p>Process 1,000 numbers in parallel across all CPU cores</p>
      
      <div className="controls">
        <button onClick={handleProcess}>
          Process Array (1,000 items)
        </button>
      </div>
      
      {results.length > 0 && (
        <div className="results">
          <p>✅ Processed {results.length} items in parallel!</p>
          <p>First 10 results: {results.slice(0, 10).map(n => n.toFixed(2)).join(', ')}...</p>
        </div>
      )}
    </div>
  );
}

// Example 5: Persistent Worker
function WorkerExample() {
  const [tasks, setTasks] = useState<string[]>([]);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const { execute: processTask, stop } = useWorker<string, string>('long-running-task', 'mixed');

  const addTask = useCallback(() => {
    const newTask = `Task ${Date.now()}`;
    setTasks(prev => [...prev, newTask]);
  }, []);

  const processTasks = useCallback(async () => {
    for (const task of tasks) {
      try {
        const result = await processTask(task);
        setCompletedTasks(prev => [...prev, result]);
      } catch (error) {
        console.error(`Task ${task} failed:`, error);
      }
    }
    setTasks([]);
  }, [tasks, processTask]);

  return (
    <div className="example-section">
      <h3>👷 Persistent Worker</h3>
      <p>Long-running worker that processes tasks continuously</p>
      
      <div className="controls">
        <button onClick={addTask}>Add Task</button>
        <button onClick={processTasks} disabled={tasks.length === 0}>
          Process {tasks.length} Tasks
        </button>
        <button onClick={stop}>Stop Worker</button>
      </div>
      
      <div className="task-status">
        <p>Pending: {tasks.length} | Completed: {completedTasks.length}</p>
        {completedTasks.slice(-5).map((task, index) => (
          <div key={index} className="completed-task">✅ {task}</div>
        ))}
      </div>
    </div>
  );
}

// Example 6: React Suspense Integration
function SuspenseExample() {
  const [dataToProcess, setDataToProcess] = useState<number | null>(null);

  const startProcessing = useCallback(() => {
    setDataToProcess(Math.floor(Math.random() * 1000000));
  }, []);

  return (
    <div className="example-section">
      <h3>⏳ React Suspense Integration</h3>
      <p>Automatic loading states with React 19 Suspense</p>
      
      <button onClick={startProcessing}>Start Heavy Computation</button>
      
      {dataToProcess && (
        <ThreadSuspense
          operation="heavy-computation"
          data={dataToProcess}
          strategy="cpu-bound"
          fallback={<div className="loading">🧮 Computing result...</div>}
        >
          {(result: string) => (
            <div className="results">
              <p>✅ Computation complete!</p>
              <p>Result: {result}</p>
            </div>
          )}
        </ThreadSuspense>
      )}
    </div>
  );
}

// Example 7: Direct Function Usage (No Hooks)
function DirectUsageExample() {
  const [result, setResult] = useState<string>('');

  const handleDirectCompute = useCallback(async () => {
    try {
      // Direct usage without hooks - still gets thread optimization
      const result = await compute<number, string>('fibonacci', 35);
      setResult(`Fibonacci(35) = ${result}`);
    } catch (error) {
      console.error('Direct compute failed:', error);
    }
  }, []);

  const handleDirectIO = useCallback(async () => {
    try {
      const data = await asyncIO<string, any>('fetch-data', 'https://api.github.com/zen');
      setResult(`GitHub Zen: ${data}`);
    } catch (error) {
      console.error('Direct I/O failed:', error);
    }
  }, []);

  const handleDirectAI = useCallback(async () => {
    try {
      const analysis = await aiProcess<string, any>('sentiment-analysis', 'I love using thread primitives!');
      setResult(`Sentiment: ${JSON.stringify(analysis)}`);
    } catch (error) {
      console.error('Direct AI failed:', error);
    }
  }, []);

  return (
    <div className="example-section">
      <h3>🎯 Direct Function Usage</h3>
      <p>Use thread primitives directly without React hooks</p>
      
      <div className="controls">
        <button onClick={handleDirectCompute}>Direct Compute</button>
        <button onClick={handleDirectIO}>Direct I/O</button>
        <button onClick={handleDirectAI}>Direct AI</button>
      </div>
      
      {result && (
        <div className="results">
          <p>{result}</p>
        </div>
      )}
    </div>
  );
}

// Main Examples Component
export function ThreadPrimitivesExamples() {
  return (
    <ThreadProvider>
      <div className="thread-examples">
        <h1>🚀 Thread Primitives Examples</h1>
        <p>See how easy it is to use powerful threading in React 19!</p>
        
        {/* Performance Monitor */}
        <ThreadMonitor />
        
        {/* Examples */}
        <div className="examples-grid">
          <DataProcessingExample />
          <ParallelAPIExample />
          <AIProcessingExample />
          <ParallelMapExample />
          <WorkerExample />
          <SuspenseExample />
          <DirectUsageExample />
        </div>
        
        {/* Component-based Processing */}
        <div className="component-examples">
          <h2>🔧 Component-based Processing</h2>
          
          <ParallelProcessor
            items={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            operation="square-number"
            strategy="cpu-bound"
            onComplete={(results) => console.log('Processing complete:', results)}
            renderItem={(item, index) => (
              <div key={index} className="number-item">
                Number: {item}
              </div>
            )}
          />
          
          <StreamProcessor
            operation="process-stream-item"
            strategy="mixed"
            onResult={(result) => console.log('Stream result:', result)}
          >
            {(processData) => (
              <div className="stream-controls">
                <button onClick={() => processData({ value: Math.random() })}>
                  Process Random Data
                </button>
              </div>
            )}
          </StreamProcessor>
        </div>
      </div>
      
      <style jsx>{`
        .thread-examples {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .examples-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        
        .example-section {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: #f9f9f9;
        }
        
        .controls {
          margin: 15px 0;
        }
        
        .controls button {
          margin-right: 10px;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .controls button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .results {
          margin-top: 15px;
          padding: 10px;
          background: #e8f5e8;
          border-radius: 4px;
        }
        
        .loading {
          padding: 20px;
          text-align: center;
          font-style: italic;
          color: #666;
        }
      `}</style>
    </ThreadProvider>
  );
}