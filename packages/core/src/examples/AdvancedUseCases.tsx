/**
 * Advanced Use Cases - Real-World Production Examples
 * 
 * These examples demonstrate the power of thread primitives in complex,
 * production-ready scenarios that would be impossible or slow with traditional JavaScript.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ThreadProvider,
  useCompute,
  useAsyncIO,
  useAI,
  useParallelMap,
  useWorker,
  parallelMap,
  compute,
  aiProcess,
  ThreadMonitor
} from '../components/ThreadPrimitives';

export function AdvancedUseCases() {
  return (
    <ThreadProvider>
      <div className="advanced-use-cases">
        <h1>🚀 Advanced Use Cases - Production Examples</h1>
        <p>Real-world scenarios where thread primitives deliver game-changing performance</p>

        <div className="use-cases-grid">
          <RealTimeDataProcessing />
          <ImageProcessingPipeline />
          <FinancialRiskCalculation />
          <MLInferencePipeline />
          <CryptographicOperations />
          <GamePhysicsSimulation />
          <VideoTranscoding />
          <BlockchainMining />
        </div>

        <div className="monitoring-section">
          <h2>📊 System Performance Monitor</h2>
          <ThreadMonitor />
        </div>
      </div>
    </ThreadProvider>
  );
}

// 1. Real-Time Data Processing Pipeline
function RealTimeDataProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [metrics, setMetrics] = useState<any>({});
  const [dataPoints, setDataPoints] = useState<number[]>([]);
  
  const { execute: processStream } = useWorker<any, any>('stream-processor', 'mixed');
  const processParallel = useParallelMap<any, any>('data-aggregation', 'cpu-bound');

  const startRealTimeProcessing = useCallback(async () => {
    setIsProcessing(true);
    
    // Simulate real-time data stream (IoT sensors, financial tickers, etc.)
    const dataStream = generateRealTimeData();
    
    try {
      for await (const batch of dataStream) {
        // Process each batch in parallel
        const processed = await processParallel(batch);
        
        // Aggregate results
        const aggregated = await processStream({
          type: 'aggregate',
          data: processed,
          timestamp: Date.now()
        });
        
        // Update UI with real-time metrics
        setMetrics(aggregated.metrics);
        setDataPoints(prev => [...prev.slice(-100), aggregated.value]); // Keep last 100 points
        
        // Small delay to simulate real-time processing
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Stream processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [processStream, processParallel]);

  return (
    <div className="use-case-card">
      <h3>📊 Real-Time Data Processing</h3>
      <p>Process thousands of data points per second from IoT sensors, financial feeds, or analytics events</p>
      
      <div className="example-code">
        <pre><code>{`// Process real-time streams with automatic load balancing
const processStream = useWorker('stream-processor', 'mixed');
const processParallel = useParallelMap('data-aggregation', 'cpu-bound');

for await (const batch of dataStream) {
  // Each batch processed in parallel across CPU cores
  const processed = await processParallel(batch);
  
  // Stream aggregation on dedicated worker
  const result = await processStream({
    type: 'aggregate',
    data: processed
  });
  
  updateDashboard(result);
}`}</code></pre>
      </div>

      <div className="demo-controls">
        <button 
          onClick={startRealTimeProcessing} 
          disabled={isProcessing}
          className="primary-button"
        >
          {isProcessing ? '📡 Processing Stream...' : '🚀 Start Real-Time Processing'}
        </button>
      </div>

      {Object.keys(metrics).length > 0 && (
        <div className="real-time-metrics">
          <div className="metric">
            <label>Throughput:</label>
            <span>{metrics.throughput?.toFixed(0) || 0} ops/sec</span>
          </div>
          <div className="metric">
            <label>Latency:</label>
            <span>{metrics.latency?.toFixed(2) || 0}ms</span>
          </div>
          <div className="metric">
            <label>Data Points:</label>
            <span>{dataPoints.length}</span>
          </div>
          <div className="chart">
            <svg width="300" height="100" viewBox="0 0 300 100">
              <path
                d={generateSVGPath(dataPoints)}
                stroke="#4CAF50"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>
      )}

      <div className="use-case-benefits">
        <h4>🎯 Perfect For:</h4>
        <ul>
          <li>IoT sensor data processing</li>
          <li>Financial market data feeds</li>
          <li>Real-time analytics dashboards</li>
          <li>Event stream processing</li>
        </ul>
      </div>
    </div>
  );
}

// 2. Image Processing Pipeline
function ImageProcessingPipeline() {
  const [images, setImages] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const processImages = useParallelMap<File, string>('image-processing', 'cpu-bound');

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setImages(files);
  }, []);

  const startProcessing = useCallback(async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Process all images in parallel
      const results = await processImages(images);
      setProcessedImages(results);
      setProgress(100);
    } catch (error) {
      console.error('Image processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [images, processImages]);

  return (
    <div className="use-case-card">
      <h3>🖼️ Image Processing Pipeline</h3>
      <p>Apply filters, transformations, and AI analysis to hundreds of images simultaneously</p>
      
      <div className="example-code">
        <pre><code>{`// Process multiple images in parallel using SIMD optimizations
const processImages = useParallelMap('image-processing', 'cpu-bound');

// Automatically distributes work across all CPU cores
const results = await processImages(imageFiles);

// Each image gets: resize, filter, face detection, compression
// All happening simultaneously on different cores`}</code></pre>
      </div>

      <div className="demo-controls">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          className="file-input"
        />
        <button 
          onClick={startProcessing}
          disabled={isProcessing || images.length === 0}
          className="primary-button"
        >
          {isProcessing ? `🖼️ Processing ${images.length} images...` : `🚀 Process ${images.length} Images`}
        </button>
      </div>

      {isProcessing && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{progress.toFixed(0)}%</span>
        </div>
      )}

      {processedImages.length > 0 && (
        <div className="results">
          <p>✅ Processed {processedImages.length} images successfully!</p>
          <div className="processed-images">
            {processedImages.slice(0, 6).map((imageUrl, index) => (
              <div key={index} className="processed-image">
                <img src={imageUrl} alt={`Processed ${index}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="use-case-benefits">
        <h4>🎯 Capabilities:</h4>
        <ul>
          <li>Batch resize and optimization</li>
          <li>AI-powered object detection</li>
          <li>Filter and effect application</li>
          <li>Format conversion and compression</li>
        </ul>
      </div>
    </div>
  );
}

// 3. Financial Risk Calculation
function FinancialRiskCalculation() {
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateRisk = useCompute<any, any>('monte-carlo-simulation');
  const processPortfolio = useParallelMap<any, any>('portfolio-analysis', 'cpu-bound');

  const generateSamplePortfolio = useCallback(() => {
    const assets = [
      { symbol: 'AAPL', weight: 0.25, price: 150, volatility: 0.3 },
      { symbol: 'GOOGL', weight: 0.20, price: 2800, volatility: 0.35 },
      { symbol: 'MSFT', weight: 0.20, price: 300, volatility: 0.28 },
      { symbol: 'TSLA', weight: 0.15, price: 800, volatility: 0.6 },
      { symbol: 'NVDA', weight: 0.20, price: 500, volatility: 0.45 }
    ];
    setPortfolio(assets);
  }, []);

  const runRiskAnalysis = useCallback(async () => {
    if (portfolio.length === 0) return;
    
    setIsCalculating(true);
    
    try {
      // Run Monte Carlo simulation with 1 million scenarios
      const monteCarloResults = await calculateRisk({
        portfolio,
        scenarios: 1000000,
        timeHorizon: 252, // 1 year in trading days
        confidenceIntervals: [0.95, 0.99]
      });

      // Calculate additional risk metrics in parallel
      const additionalMetrics = await processPortfolio(portfolio);

      setRiskMetrics({
        ...monteCarloResults,
        portfolioMetrics: additionalMetrics
      });
    } catch (error) {
      console.error('Risk calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [portfolio, calculateRisk, processPortfolio]);

  return (
    <div className="use-case-card">
      <h3>💰 Financial Risk Calculation</h3>
      <p>Run million-scenario Monte Carlo simulations for portfolio risk analysis</p>
      
      <div className="example-code">
        <pre><code>{`// Monte Carlo simulation with 1M scenarios
const calculateRisk = useCompute('monte-carlo-simulation');

const results = await calculateRisk({
  portfolio: assets,
  scenarios: 1000000,
  timeHorizon: 252,
  confidenceIntervals: [0.95, 0.99]
});

// Value at Risk, Expected Shortfall, Sharpe Ratio
// All computed in parallel using native performance`}</code></pre>
      </div>

      <div className="demo-controls">
        <button onClick={generateSamplePortfolio} className="secondary-button">
          📊 Generate Sample Portfolio
        </button>
        <button 
          onClick={runRiskAnalysis}
          disabled={isCalculating || portfolio.length === 0}
          className="primary-button"
        >
          {isCalculating ? '🧮 Running Simulation...' : '⚡ Calculate Risk (1M scenarios)'}
        </button>
      </div>

      {portfolio.length > 0 && (
        <div className="portfolio-display">
          <h4>Portfolio Assets:</h4>
          {portfolio.map((asset, index) => (
            <div key={index} className="asset-row">
              <span className="asset-symbol">{asset.symbol}</span>
              <span className="asset-weight">{(asset.weight * 100).toFixed(1)}%</span>
              <span className="asset-volatility">Vol: {(asset.volatility * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}

      {riskMetrics && (
        <div className="risk-results">
          <h4>📈 Risk Analysis Results</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <label>Value at Risk (95%)</label>
              <span className="risk-value">${riskMetrics.var95?.toFixed(0) || 'N/A'}</span>
            </div>
            <div className="metric-card">
              <label>Value at Risk (99%)</label>
              <span className="risk-value">${riskMetrics.var99?.toFixed(0) || 'N/A'}</span>
            </div>
            <div className="metric-card">
              <label>Expected Shortfall</label>
              <span className="risk-value">${riskMetrics.expectedShortfall?.toFixed(0) || 'N/A'}</span>
            </div>
            <div className="metric-card">
              <label>Sharpe Ratio</label>
              <span className="risk-value">{riskMetrics.sharpeRatio?.toFixed(2) || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="use-case-benefits">
        <h4>🎯 Applications:</h4>
        <ul>
          <li>Portfolio optimization</li>
          <li>Risk management</li>
          <li>Regulatory compliance</li>
          <li>Trading strategy backtesting</li>
        </ul>
      </div>
    </div>
  );
}

// 4. ML Inference Pipeline
function MLInferencePipeline() {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const analyzeText = useAI<string, any>('nlp-pipeline');
  const processInBatch = useParallelMap<string, any>('batch-inference', 'ai-optimized');

  const runFullAnalysis = useCallback(async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    
    try {
      // Run complete NLP pipeline
      const analysis = await analyzeText(inputText);
      setResults(analysis);
    } catch (error) {
      console.error('ML inference failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, analyzeText]);

  const runBatchAnalysis = useCallback(async () => {
    const sampleTexts = [
      "I absolutely love this product! It's amazing and works perfectly.",
      "This is the worst purchase I've ever made. Complete waste of money.",
      "The service was okay, nothing special but not terrible either.",
      "Outstanding quality and excellent customer support. Highly recommended!",
      "Mediocre product with some good features but overall disappointing."
    ];
    
    setIsProcessing(true);
    
    try {
      const batchResults = await processInBatch(sampleTexts);
      setResults({ batchAnalysis: batchResults });
    } catch (error) {
      console.error('Batch inference failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [processInBatch]);

  return (
    <div className="use-case-card">
      <h3>🤖 ML Inference Pipeline</h3>
      <p>Run complex NLP models with sentiment analysis, named entity recognition, and text classification</p>
      
      <div className="example-code">
        <pre><code>{`// AI-optimized thread pool for ML inference
const analyzeText = useAI('nlp-pipeline');
const processInBatch = useParallelMap('batch-inference', 'ai-optimized');

// Single inference
const result = await analyzeText(text);

// Batch processing with AI optimization
const results = await processInBatch(textArray);

// Automatically uses AI-optimized threads with larger memory allocation`}</code></pre>
      </div>

      <div className="demo-controls">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text for sentiment analysis, entity recognition, and classification..."
          rows={4}
          className="text-input"
        />
        <div className="button-group">
          <button 
            onClick={runFullAnalysis}
            disabled={isProcessing || !inputText.trim()}
            className="primary-button"
          >
            {isProcessing ? '🤖 Analyzing...' : '🧠 Analyze Text'}
          </button>
          <button 
            onClick={runBatchAnalysis}
            disabled={isProcessing}
            className="secondary-button"
          >
            {isProcessing ? '📊 Processing...' : '⚡ Batch Analysis Demo'}
          </button>
        </div>
      </div>

      {results && (
        <div className="ml-results">
          <h4>🔍 Analysis Results</h4>
          {results.batchAnalysis ? (
            <div className="batch-results">
              {results.batchAnalysis.map((result: any, index: number) => (
                <div key={index} className="batch-item">
                  <div className="text-preview">{result.text?.substring(0, 50)}...</div>
                  <div className="sentiment">
                    Sentiment: <span className={`sentiment-${result.sentiment}`}>
                      {result.sentiment}
                    </span> ({(result.confidence * 100).toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="single-result">
              <div className="result-item">
                <label>Sentiment:</label>
                <span className={`sentiment-${results.sentiment}`}>
                  {results.sentiment} ({(results.confidence * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="result-item">
                <label>Entities:</label>
                <span>{results.entities?.join(', ') || 'None detected'}</span>
              </div>
              <div className="result-item">
                <label>Category:</label>
                <span>{results.category || 'General'}</span>
              </div>
              <div className="result-item">
                <label>Keywords:</label>
                <span>{results.keywords?.join(', ') || 'None extracted'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="use-case-benefits">
        <h4>🎯 ML Capabilities:</h4>
        <ul>
          <li>Sentiment analysis and emotion detection</li>
          <li>Named entity recognition</li>
          <li>Text classification and categorization</li>
          <li>Batch processing for large datasets</li>
        </ul>
      </div>
    </div>
  );
}

// Helper functions and additional use cases...

// 5. Cryptographic Operations
function CryptographicOperations() {
  const [isHashing, setIsHashing] = useState(false);
  const [hashResults, setHashResults] = useState<any[]>([]);

  const computeHashes = useParallelMap<string, any>('crypto-operations', 'cpu-bound');

  const runCryptoOperations = useCallback(async () => {
    setIsHashing(true);
    
    const data = Array.from({ length: 1000 }, (_, i) => 
      `sensitive-data-${i}-${Math.random().toString(36)}`
    );
    
    try {
      const results = await computeHashes(data);
      setHashResults(results.slice(0, 10)); // Show first 10
    } catch (error) {
      console.error('Crypto operations failed:', error);
    } finally {
      setIsHashing(false);
    }
  }, [computeHashes]);

  return (
    <div className="use-case-card">
      <h3>🔐 Cryptographic Operations</h3>
      <p>Parallel encryption, hashing, and digital signature operations</p>
      
      <div className="demo-controls">
        <button 
          onClick={runCryptoOperations}
          disabled={isHashing}
          className="primary-button"
        >
          {isHashing ? '🔐 Computing Hashes...' : '⚡ Hash 1000 Items in Parallel'}
        </button>
      </div>

      {hashResults.length > 0 && (
        <div className="crypto-results">
          <h4>Hash Results (showing first 10):</h4>
          {hashResults.map((result, index) => (
            <div key={index} className="hash-result">
              <span className="hash-input">{result.input.substring(0, 20)}...</span>
              <span className="hash-output">{result.hash}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// More use cases (abbreviated for space)...
function GamePhysicsSimulation() {
  return (
    <div className="use-case-card">
      <h3>🎮 Game Physics Simulation</h3>
      <p>Real-time physics calculations for games and simulations</p>
      <div className="use-case-benefits">
        <ul>
          <li>Collision detection algorithms</li>
          <li>Particle system simulations</li>
          <li>Fluid dynamics calculations</li>
          <li>Multi-body physics interactions</li>
        </ul>
      </div>
    </div>
  );
}

function VideoTranscoding() {
  return (
    <div className="use-case-card">
      <h3>🎥 Video Transcoding</h3>
      <p>Parallel video processing and format conversion</p>
      <div className="use-case-benefits">
        <ul>
          <li>Multi-format video conversion</li>
          <li>Frame-by-frame processing</li>
          <li>Real-time video effects</li>
          <li>Batch video optimization</li>
        </ul>
      </div>
    </div>
  );
}

function BlockchainMining() {
  return (
    <div className="use-case-card">
      <h3>⛏️ Blockchain Mining</h3>
      <p>Distributed proof-of-work calculations</p>
      <div className="use-case-benefits">
        <ul>
          <li>Hash rate optimization</li>
          <li>Nonce calculation</li>
          <li>Block validation</li>
          <li>Mining pool coordination</li>
        </ul>
      </div>
    </div>
  );
}

// Helper functions
function generateRealTimeData() {
  let counter = 0;
  
  return {
    async *[Symbol.asyncIterator]() {
      while (counter < 50) { // Generate 50 batches
        const batch = Array.from({ length: 100 }, (_, i) => ({
          id: counter * 100 + i,
          value: Math.random() * 1000,
          timestamp: Date.now(),
          sensor: `sensor-${Math.floor(Math.random() * 10)}`
        }));
        
        yield batch;
        counter++;
        
        // Small delay to simulate real-time data
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  };
}

function generateSVGPath(points: number[]): string {
  if (points.length === 0) return '';
  
  const maxValue = Math.max(...points, 1);
  const width = 300;
  const height = 100;
  
  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - (point / maxValue) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

export default AdvancedUseCases;