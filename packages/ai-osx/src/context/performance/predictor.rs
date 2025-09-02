use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::VecDeque;
use chrono::{DateTime, Utc, Duration};
use tracing::{info, warn, debug, instrument};

/// Machine learning-based performance prediction system
pub struct PerformancePredictor {
    time_series_analyzer: Arc<RwLock<TimeSeriesAnalyzer>>,
    anomaly_detector: Arc<RwLock<AnomalyDetector>>,
    trend_analyzer: Arc<RwLock<TrendAnalyzer>>,
    predictions: Arc<RwLock<Vec<super::PerformancePrediction>>>,
}

impl PerformancePredictor {
    pub fn new() -> Self {
        Self {
            time_series_analyzer: Arc::new(RwLock::new(TimeSeriesAnalyzer::new())),
            anomaly_detector: Arc::new(RwLock::new(AnomalyDetector::new())),
            trend_analyzer: Arc::new(RwLock::new(TrendAnalyzer::new())),
            predictions: Arc::new(RwLock::new(Vec::new())),
        }
    }

    #[instrument(skip(self, historical_metrics))]
    pub async fn predict(&self, historical_metrics: Vec<super::SystemMetrics>) -> Result<(), Box<dyn std::error::Error>> {
        if historical_metrics.len() < 10 {
            debug!("Insufficient historical data for prediction");
            return Ok(());
        }

        debug!("Generating performance predictions");
        
        // Analyze time series data
        let time_series_predictions = self.time_series_analyzer
            .write()
            .await
            .analyze(&historical_metrics)
            .await?;
        
        // Detect anomalies
        let anomalies = self.anomaly_detector
            .write()
            .await
            .detect(&historical_metrics)
            .await?;
        
        // Analyze trends
        let trends = self.trend_analyzer
            .write()
            .await
            .analyze_trends(&historical_metrics)
            .await?;
        
        // Generate predictions
        let mut new_predictions = Vec::new();
        
        // CPU usage prediction
        if let Some(cpu_prediction) = self.predict_metric("cpu_usage", &historical_metrics, &time_series_predictions).await {
            new_predictions.push(cpu_prediction);
        }
        
        // Memory usage prediction
        if let Some(memory_prediction) = self.predict_metric("memory_usage", &historical_metrics, &time_series_predictions).await {
            new_predictions.push(memory_prediction);
        }
        
        // Latency prediction
        if let Some(latency_prediction) = self.predict_metric("latency_p95", &historical_metrics, &time_series_predictions).await {
            new_predictions.push(latency_prediction);
        }
        
        // Add anomaly-based predictions
        for anomaly in anomalies {
            new_predictions.push(super::PerformancePrediction {
                metric: format!("anomaly_{}", anomaly.metric),
                predicted_value: anomaly.severity,
                confidence: anomaly.confidence,
                predicted_at: Utc::now(),
                time_horizon: Duration::hours(1),
            });
        }
        
        // Add trend-based predictions
        for trend in trends {
            new_predictions.push(super::PerformancePrediction {
                metric: format!("trend_{}", trend.metric),
                predicted_value: trend.projected_value,
                confidence: trend.confidence,
                predicted_at: Utc::now(),
                time_horizon: Duration::hours(6),
            });
        }
        
        // Store predictions
        let mut predictions = self.predictions.write().await;
        *predictions = new_predictions;
        
        Ok(())
    }

    async fn predict_metric(
        &self,
        metric_name: &str,
        historical: &[super::SystemMetrics],
        _time_series_predictions: &TimeSeriesPredictions,
    ) -> Option<super::PerformancePrediction> {
        let values: Vec<f64> = historical.iter().map(|m| match metric_name {
            "cpu_usage" => m.cpu_usage,
            "memory_usage" => m.memory_usage,
            "latency_p95" => m.latency_percentiles.p95,
            _ => 0.0,
        }).collect();
        
        if values.is_empty() {
            return None;
        }
        
        // Simple moving average prediction (in production, use ML models)
        let window_size = 5.min(values.len());
        let recent_values: Vec<f64> = values.iter().rev().take(window_size).cloned().collect();
        let avg = recent_values.iter().sum::<f64>() / recent_values.len() as f64;
        
        // Calculate trend
        let trend = if recent_values.len() >= 2 {
            (recent_values[0] - recent_values[recent_values.len() - 1]) / recent_values.len() as f64
        } else {
            0.0
        };
        
        // Predict future value
        let predicted_value = avg + trend * 3.0; // Project 3 periods ahead
        
        // Calculate confidence based on variance
        let variance = recent_values.iter()
            .map(|v| (v - avg).powi(2))
            .sum::<f64>() / recent_values.len() as f64;
        let std_dev = variance.sqrt();
        let confidence = 1.0 / (1.0 + std_dev / avg.max(0.001));
        
        Some(super::PerformancePrediction {
            metric: metric_name.to_string(),
            predicted_value,
            confidence,
            predicted_at: Utc::now(),
            time_horizon: Duration::hours(1),
        })
    }

    pub async fn get_predictions(&self) -> Vec<super::PerformancePrediction> {
        self.predictions.read().await.clone()
    }
}

struct TimeSeriesAnalyzer {
    models: HashMap<String, TimeSeriesModel>,
}

impl TimeSeriesAnalyzer {
    fn new() -> Self {
        use std::collections::HashMap;
        Self {
            models: HashMap::new(),
        }
    }

    async fn analyze(&mut self, metrics: &[super::SystemMetrics]) -> Result<TimeSeriesPredictions, Box<dyn std::error::Error>> {
        let mut predictions = TimeSeriesPredictions {
            forecasts: Vec::new(),
            seasonality: Vec::new(),
            autocorrelation: Vec::new(),
        };
        
        // Analyze CPU usage time series
        let cpu_values: Vec<f64> = metrics.iter().map(|m| m.cpu_usage).collect();
        if let Some(forecast) = self.forecast_arima(&cpu_values).await {
            predictions.forecasts.push(Forecast {
                metric: "cpu_usage".to_string(),
                values: forecast,
                confidence_intervals: vec![],
            });
        }
        
        // Detect seasonality
        if let Some(seasonality) = self.detect_seasonality(&cpu_values).await {
            predictions.seasonality.push(seasonality);
        }
        
        Ok(predictions)
    }

    async fn forecast_arima(&self, values: &[f64]) -> Option<Vec<f64>> {
        if values.len() < 10 {
            return None;
        }
        
        // Simplified ARIMA(1,1,1) forecast
        let mut forecast = Vec::new();
        let last_value = values.last().unwrap();
        let trend = if values.len() >= 2 {
            values[values.len() - 1] - values[values.len() - 2]
        } else {
            0.0
        };
        
        for i in 1..=5 {
            forecast.push(last_value + trend * i as f64);
        }
        
        Some(forecast)
    }

    async fn detect_seasonality(&self, values: &[f64]) -> Option<Seasonality> {
        if values.len() < 24 {
            return None;
        }
        
        // Simple seasonality detection using autocorrelation
        let period = 24; // Assume daily seasonality
        let mut correlation = 0.0;
        let mut count = 0;
        
        for i in period..values.len() {
            correlation += values[i] * values[i - period];
            count += 1;
        }
        
        if count > 0 {
            correlation /= count as f64;
            
            Some(Seasonality {
                metric: "cpu_usage".to_string(),
                period,
                strength: correlation.abs() / 100.0,
            })
        } else {
            None
        }
    }
}

struct TimeSeriesModel {
    coefficients: Vec<f64>,
    residuals: VecDeque<f64>,
}

struct TimeSeriesPredictions {
    forecasts: Vec<Forecast>,
    seasonality: Vec<Seasonality>,
    autocorrelation: Vec<f64>,
}

struct Forecast {
    metric: String,
    values: Vec<f64>,
    confidence_intervals: Vec<(f64, f64)>,
}

struct Seasonality {
    metric: String,
    period: usize,
    strength: f64,
}

struct AnomalyDetector {
    baseline_stats: HashMap<String, BaselineStats>,
    anomaly_threshold: f64,
}

impl AnomalyDetector {
    fn new() -> Self {
        use std::collections::HashMap;
        Self {
            baseline_stats: HashMap::new(),
            anomaly_threshold: 3.0, // 3 standard deviations
        }
    }

    async fn detect(&mut self, metrics: &[super::SystemMetrics]) -> Result<Vec<Anomaly>, Box<dyn std::error::Error>> {
        let mut anomalies = Vec::new();
        
        // Update baseline statistics
        self.update_baselines(metrics).await;
        
        // Check for CPU anomalies
        if let Some(anomaly) = self.check_metric_anomaly("cpu_usage", metrics.last().unwrap().cpu_usage).await {
            anomalies.push(anomaly);
        }
        
        // Check for memory anomalies
        if let Some(anomaly) = self.check_metric_anomaly("memory_usage", metrics.last().unwrap().memory_usage).await {
            anomalies.push(anomaly);
        }
        
        // Check for latency anomalies
        if let Some(anomaly) = self.check_metric_anomaly("latency_p95", metrics.last().unwrap().latency_percentiles.p95).await {
            anomalies.push(anomaly);
        }
        
        Ok(anomalies)
    }

    async fn update_baselines(&mut self, metrics: &[super::SystemMetrics]) {
        use std::collections::HashMap;
        
        // Update CPU baseline
        let cpu_values: Vec<f64> = metrics.iter().map(|m| m.cpu_usage).collect();
        self.baseline_stats.insert("cpu_usage".to_string(), BaselineStats::calculate(&cpu_values));
        
        // Update memory baseline
        let memory_values: Vec<f64> = metrics.iter().map(|m| m.memory_usage).collect();
        self.baseline_stats.insert("memory_usage".to_string(), BaselineStats::calculate(&memory_values));
        
        // Update latency baseline
        let latency_values: Vec<f64> = metrics.iter().map(|m| m.latency_percentiles.p95).collect();
        self.baseline_stats.insert("latency_p95".to_string(), BaselineStats::calculate(&latency_values));
    }

    async fn check_metric_anomaly(&self, metric: &str, value: f64) -> Option<Anomaly> {
        if let Some(baseline) = self.baseline_stats.get(metric) {
            let z_score = (value - baseline.mean).abs() / baseline.std_dev.max(0.001);
            
            if z_score > self.anomaly_threshold {
                return Some(Anomaly {
                    metric: metric.to_string(),
                    value,
                    expected_value: baseline.mean,
                    severity: z_score,
                    confidence: (z_score / 5.0).min(1.0),
                    detected_at: Utc::now(),
                });
            }
        }
        None
    }
}

use std::collections::HashMap;

struct BaselineStats {
    mean: f64,
    std_dev: f64,
    min: f64,
    max: f64,
}

impl BaselineStats {
    fn calculate(values: &[f64]) -> Self {
        if values.is_empty() {
            return Self {
                mean: 0.0,
                std_dev: 0.0,
                min: 0.0,
                max: 0.0,
            };
        }
        
        let mean = values.iter().sum::<f64>() / values.len() as f64;
        let variance = values.iter()
            .map(|v| (v - mean).powi(2))
            .sum::<f64>() / values.len() as f64;
        let std_dev = variance.sqrt();
        let min = values.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        
        Self { mean, std_dev, min, max }
    }
}

struct Anomaly {
    metric: String,
    value: f64,
    expected_value: f64,
    severity: f64,
    confidence: f64,
    detected_at: DateTime<Utc>,
}

struct TrendAnalyzer {
    trend_window: usize,
}

impl TrendAnalyzer {
    fn new() -> Self {
        Self {
            trend_window: 20,
        }
    }

    async fn analyze_trends(&self, metrics: &[super::SystemMetrics]) -> Result<Vec<Trend>, Box<dyn std::error::Error>> {
        let mut trends = Vec::new();
        
        // Analyze CPU trend
        let cpu_values: Vec<f64> = metrics.iter().map(|m| m.cpu_usage).collect();
        if let Some(trend) = self.calculate_trend("cpu_usage", &cpu_values).await {
            trends.push(trend);
        }
        
        // Analyze memory trend
        let memory_values: Vec<f64> = metrics.iter().map(|m| m.memory_usage).collect();
        if let Some(trend) = self.calculate_trend("memory_usage", &memory_values).await {
            trends.push(trend);
        }
        
        Ok(trends)
    }

    async fn calculate_trend(&self, metric: &str, values: &[f64]) -> Option<Trend> {
        if values.len() < self.trend_window {
            return None;
        }
        
        // Calculate linear regression
        let n = values.len() as f64;
        let x: Vec<f64> = (0..values.len()).map(|i| i as f64).collect();
        
        let sum_x: f64 = x.iter().sum();
        let sum_y: f64 = values.iter().sum();
        let sum_xx: f64 = x.iter().map(|xi| xi * xi).sum();
        let sum_xy: f64 = x.iter().zip(values.iter()).map(|(xi, yi)| xi * yi).sum();
        
        let slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
        let intercept = (sum_y - slope * sum_x) / n;
        
        // Project future value
        let projected_value = slope * (n + 5.0) + intercept;
        
        // Calculate R-squared for confidence
        let y_mean = sum_y / n;
        let ss_tot: f64 = values.iter().map(|y| (y - y_mean).powi(2)).sum();
        let ss_res: f64 = x.iter().zip(values.iter())
            .map(|(xi, yi)| (yi - (slope * xi + intercept)).powi(2))
            .sum();
        let r_squared = 1.0 - (ss_res / ss_tot);
        
        Some(Trend {
            metric: metric.to_string(),
            slope,
            direction: if slope > 0.1 { TrendDirection::Increasing } 
                      else if slope < -0.1 { TrendDirection::Decreasing } 
                      else { TrendDirection::Stable },
            projected_value,
            confidence: r_squared.abs(),
        })
    }
}

struct Trend {
    metric: String,
    slope: f64,
    direction: TrendDirection,
    projected_value: f64,
    confidence: f64,
}

enum TrendDirection {
    Increasing,
    Decreasing,
    Stable,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_performance_predictor() {
        let predictor = PerformancePredictor::new();
        
        // Create sample historical metrics
        let mut metrics = Vec::new();
        for i in 0..20 {
            metrics.push(super::super::SystemMetrics {
                cpu_usage: 50.0 + (i as f64 * 2.0),
                memory_usage: 60.0 + (i as f64 * 1.5),
                disk_io: super::super::DiskIO {
                    read_bytes_per_sec: 1000,
                    write_bytes_per_sec: 1000,
                    iops: 100,
                },
                network_io: super::super::NetworkIO {
                    bytes_received_per_sec: 1000,
                    bytes_sent_per_sec: 1000,
                    packets_received_per_sec: 100,
                    packets_sent_per_sec: 100,
                },
                latency_percentiles: super::super::LatencyPercentiles {
                    p50: 100.0,
                    p75: 200.0,
                    p90: 400.0,
                    p95: 600.0 + (i as f64 * 10.0),
                    p99: 1000.0,
                },
                throughput: 1000.0,
                error_rate: 0.01,
            });
        }
        
        assert!(predictor.predict(metrics).await.is_ok());
        
        let predictions = predictor.get_predictions().await;
        assert!(predictions.len() > 0);
        assert!(predictions[0].confidence > 0.0);
    }
}