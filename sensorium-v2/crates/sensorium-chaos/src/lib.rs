//! sensorium-chaos — Chaos Engineering, Health Assessment & Resilience Testing
//!
//! Provides fault injection, chaos experiments, health assessment,
//! and failure prediction for the Sensorium audio engine.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tracing::info;

/// Chaos experiment configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChaosExperiment {
    pub name: String,
    pub experiment_type: ExperimentType,
    pub duration_ms: u64,
    pub severity: Severity,
}

/// Types of chaos experiments.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ExperimentType {
    /// Kill a sidecar process and measure recovery time.
    SidecarKill,
    /// Simulate network partition.
    NetworkPartition,
    /// Apply memory pressure.
    MemoryPressure,
    /// CPU throttle.
    CpuThrottle,
    /// Disk I/O stall.
    DiskIoStall,
}

/// Severity level for experiments.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

/// Result of a chaos experiment run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentResult {
    pub experiment_name: String,
    pub passed: bool,
    pub recovery_time_ms: f64,
    pub details: String,
}

/// Chaos engineering test runner.
pub struct ChaosRunner {
    experiments: Vec<ChaosExperiment>,
    results: Vec<ExperimentResult>,
}

impl ChaosRunner {
    /// Create a new chaos runner.
    pub fn new() -> Self {
        Self {
            experiments: Vec::new(),
            results: Vec::new(),
        }
    }

    /// Register an experiment.
    pub fn register(&mut self, experiment: ChaosExperiment) {
        info!(name = %experiment.name, "Chaos experiment registered");
        self.experiments.push(experiment);
    }

    /// Run all registered experiments.
    pub async fn run_all(&mut self) -> Result<Vec<ExperimentResult>> {
        let mut results = Vec::new();
        for experiment in &self.experiments {
            let result = self.run_single(experiment).await?;
            results.push(result);
        }
        self.results = results.clone();
        Ok(results)
    }

    /// Run a single experiment.
    async fn run_single(&self, experiment: &ChaosExperiment) -> Result<ExperimentResult> {
        info!(name = %experiment.name, "Running chaos experiment");
        // A registered experiment is not evidence of a successful fault-injection
        // run. Keep the result explicitly failing until an adapter performs and
        // observes the requested fault and recovery.
        Ok(ExperimentResult {
            experiment_name: experiment.name.clone(),
            passed: false,
            recovery_time_ms: 0.0,
            details: "NOT_IMPLEMENTED: fault injection and recovery observation are pending".into(),
        })
    }

    /// Returns all results from the last run.
    pub fn results(&self) -> &[ExperimentResult] {
        &self.results
    }
}

impl Default for ChaosRunner {
    fn default() -> Self {
        Self::new()
    }
}

// ── Health Assessor ─────────────────────────────────────────────────

/// Overall system health status.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum HealthStatus {
    /// No registered checks or no trustworthy observation yet.
    Unknown,
    /// All systems nominal.
    Healthy,
    /// Degraded but operational.
    Degraded,
    /// Significant issues detected.
    Unhealthy,
    /// Critical failure — immediate action required.
    Critical,
}

/// Health check result for a single component.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentHealth {
    pub name: String,
    pub status: HealthStatus,
    pub latency_ms: f64,
    pub message: String,
    pub checked_at: u64,
}

/// Aggregate system health report.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthReport {
    pub overall: HealthStatus,
    pub components: Vec<ComponentHealth>,
    pub timestamp: u64,
    pub uptime_secs: f64,
}

/// Health assessor that monitors system components.
pub struct HealthAssessor {
    start_time: Instant,
    checks: Vec<Box<dyn HealthCheck>>,
}

/// Trait for individual health checks.
pub trait HealthCheck: Send + Sync {
    fn name(&self) -> &str;
    fn check(&self) -> ComponentHealth;
}

/// CPU usage health check.
pub struct CpuHealthCheck {
    pub threshold_percent: f64,
}

impl HealthCheck for CpuHealthCheck {
    fn name(&self) -> &str {
        "cpu"
    }

    fn check(&self) -> ComponentHealth {
        // In production, read from /proc/stat or sysinfo.
        // For now, report healthy (stub).
        let status = if self.threshold_percent > 90.0 {
            HealthStatus::Critical
        } else if self.threshold_percent > 70.0 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Healthy
        };
        ComponentHealth {
            name: self.name().to_string(),
            status,
            latency_ms: 0.1,
            message: format!("CPU threshold: {:.1}%", self.threshold_percent),
            checked_at: 0,
        }
    }
}

/// Memory usage health check.
pub struct MemoryHealthCheck {
    pub used_mb: u64,
    pub total_mb: u64,
}

impl HealthCheck for MemoryHealthCheck {
    fn name(&self) -> &str {
        "memory"
    }

    fn check(&self) -> ComponentHealth {
        let usage_pct = if self.total_mb > 0 {
            (self.used_mb as f64 / self.total_mb as f64) * 100.0
        } else {
            0.0
        };
        let status = if usage_pct > 95.0 {
            HealthStatus::Critical
        } else if usage_pct > 85.0 {
            HealthStatus::Unhealthy
        } else if usage_pct > 70.0 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Healthy
        };
        ComponentHealth {
            name: self.name().to_string(),
            status,
            latency_ms: 0.05,
            message: format!("Memory: {}MB / {}MB ({:.1}%)", self.used_mb, self.total_mb, usage_pct),
            checked_at: 0,
        }
    }
}

/// Audio engine latency health check.
pub struct AudioLatencyHealthCheck {
    pub measured_latency_ms: f64,
    pub budget_ms: f64,
}

impl HealthCheck for AudioLatencyHealthCheck {
    fn name(&self) -> &str {
        "audio_latency"
    }

    fn check(&self) -> ComponentHealth {
        let status = if self.measured_latency_ms > self.budget_ms * 2.0 {
            HealthStatus::Critical
        } else if self.measured_latency_ms > self.budget_ms {
            HealthStatus::Unhealthy
        } else if self.measured_latency_ms > self.budget_ms * 0.8 {
            HealthStatus::Degraded
        } else {
            HealthStatus::Healthy
        };
        ComponentHealth {
            name: self.name().to_string(),
            status,
            latency_ms: self.measured_latency_ms,
            message: format!(
                "Audio latency: {:.2}ms / {:.2}ms budget",
                self.measured_latency_ms, self.budget_ms
            ),
            checked_at: 0,
        }
    }
}

impl HealthAssessor {
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            checks: Vec::new(),
        }
    }

    /// Register a health check.
    pub fn register_check(&mut self, check: Box<dyn HealthCheck>) {
        info!(name = check.name(), "Health check registered");
        self.checks.push(check);
    }

    /// Run all health checks and produce a report.
    pub fn assess(&self) -> HealthReport {
        let mut components = Vec::new();
        let mut overall = if self.checks.is_empty() {
            HealthStatus::Unknown
        } else {
            HealthStatus::Healthy
        };

        for check in &self.checks {
            let mut health = check.check();
            health.checked_at = self.start_time.elapsed().as_secs();
            // Escalate overall status
            match health.status {
                HealthStatus::Critical => overall = HealthStatus::Critical,
                HealthStatus::Unhealthy if overall != HealthStatus::Critical => {
                    overall = HealthStatus::Unhealthy
                }
                HealthStatus::Degraded
                    if overall != HealthStatus::Critical
                        && overall != HealthStatus::Unhealthy =>
                {
                    overall = HealthStatus::Degraded
                }
                HealthStatus::Unknown if overall == HealthStatus::Healthy => {
                    overall = HealthStatus::Unknown
                }
                _ => {}
            }
            components.push(health);
        }

        HealthReport {
            overall,
            components,
            timestamp: self.start_time.elapsed().as_secs(),
            uptime_secs: self.start_time.elapsed().as_secs_f64(),
        }
    }
}

impl Default for HealthAssessor {
    fn default() -> Self {
        Self::new()
    }
}

// ── Failure Predictor ───────────────────────────────────────────────

/// Failure prediction based on health trends.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FailurePrediction {
    pub component: String,
    pub risk_level: RiskLevel,
    pub predicted_failure_in_secs: Option<f64>,
    pub recommendation: String,
}

/// Risk level for failure prediction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Imminent,
}

/// Failure predictor that analyzes health trends.
pub struct FailurePredictor {
    history: Vec<HealthReport>,
    max_history: usize,
}

impl FailurePredictor {
    pub fn new(max_history: usize) -> Self {
        Self {
            history: Vec::new(),
            max_history,
        }
    }

    /// Record a health report for trend analysis.
    pub fn record(&mut self, report: HealthReport) {
        if self.history.len() >= self.max_history {
            self.history.remove(0);
        }
        self.history.push(report);
    }

    /// Analyze trends and predict potential failures.
    pub fn predict(&self) -> Vec<FailurePrediction> {
        let mut predictions = Vec::new();

        if self.history.len() < 2 {
            return predictions;
        }

        let latest = self.history.last().unwrap();
        for component in &latest.components {
            // Count how many times this component was degraded or worse
            let degradation_count = self
                .history
                .iter()
                .filter(|r| {
                    r.components
                        .iter()
                        .any(|c| c.name == component.name && c.status >= HealthStatus::Degraded)
                })
                .count();

            let degradation_ratio = degradation_count as f64 / self.history.len() as f64;

            if component.status == HealthStatus::Critical {
                predictions.push(FailurePrediction {
                    component: component.name.clone(),
                    risk_level: RiskLevel::Imminent,
                    predicted_failure_in_secs: Some(0.0),
                    recommendation: "Immediate intervention required. Component is in critical state.".into(),
                });
            } else if degradation_ratio > 0.7 {
                predictions.push(FailurePrediction {
                    component: component.name.clone(),
                    risk_level: RiskLevel::High,
                    predicted_failure_in_secs: Some(300.0),
                    recommendation: format!(
                        "Component '{}' degraded in {}/{} checks. Investigate root cause.",
                        component.name,
                        degradation_count,
                        self.history.len()
                    ),
                });
            } else if degradation_ratio > 0.3 {
                predictions.push(FailurePrediction {
                    component: component.name.clone(),
                    risk_level: RiskLevel::Medium,
                    predicted_failure_in_secs: Some(3600.0),
                    recommendation: format!(
                        "Component '{}' showing intermittent issues. Monitor closely.",
                        component.name
                    ),
                });
            }
        }

        predictions
    }

    /// Returns the number of recorded health reports.
    pub fn history_len(&self) -> usize {
        self.history.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_is_unknown_without_observations() {
        let report = HealthAssessor::new().assess();
        assert_eq!(report.overall, HealthStatus::Unknown);
        assert!(report.components.is_empty());
    }

    #[test]
    fn unimplemented_chaos_experiment_never_reports_pass() {
        let mut runner = ChaosRunner::new();
        runner.register(ChaosExperiment {
            name: "network-rejoin".into(),
            experiment_type: ExperimentType::NetworkPartition,
            duration_ms: 1,
            severity: Severity::High,
        });

        let results = std::future::Future::poll(
            std::pin::pin!(runner.run_all()),
            &mut std::task::Context::from_waker(std::task::Waker::noop()),
        );
        let results = match results {
            std::task::Poll::Ready(result) => result.unwrap(),
            std::task::Poll::Pending => panic!("stub experiment must complete without awaiting I/O"),
        };
        assert_eq!(results.len(), 1);
        assert!(!results[0].passed);
        assert!(results[0].details.starts_with("NOT_IMPLEMENTED:"));
    }

    #[test]
    fn runner_creation() {
        let runner = ChaosRunner::new();
        assert!(runner.results().is_empty());
    }

    #[test]
    fn register_experiment() {
        let mut runner = ChaosRunner::new();
        runner.register(ChaosExperiment {
            name: "test_kill".into(),
            experiment_type: ExperimentType::SidecarKill,
            duration_ms: 5000,
            severity: Severity::Medium,
        });
        assert_eq!(runner.experiments.len(), 1);
    }

    #[test]
    fn health_assessor_healthy() {
        let mut assessor = HealthAssessor::new();
        assessor.register_check(Box::new(CpuHealthCheck {
            threshold_percent: 30.0,
        }));
        assessor.register_check(Box::new(MemoryHealthCheck {
            used_mb: 512,
            total_mb: 8192,
        }));
        let report = assessor.assess();
        assert_eq!(report.overall, HealthStatus::Healthy);
        assert_eq!(report.components.len(), 2);
    }

    #[test]
    fn health_assessor_degraded() {
        let mut assessor = HealthAssessor::new();
        assessor.register_check(Box::new(CpuHealthCheck {
            threshold_percent: 80.0,
        }));
        let report = assessor.assess();
        assert_eq!(report.overall, HealthStatus::Degraded);
    }

    #[test]
    fn health_assessor_critical() {
        let mut assessor = HealthAssessor::new();
        assessor.register_check(Box::new(MemoryHealthCheck {
            used_mb: 7900,
            total_mb: 8192,
        }));
        let report = assessor.assess();
        assert_eq!(report.overall, HealthStatus::Critical);
    }

    #[test]
    fn audio_latency_check() {
        let check = AudioLatencyHealthCheck {
            measured_latency_ms: 0.5,
            budget_ms: 5.0,
        };
        let health = check.check();
        assert_eq!(health.status, HealthStatus::Healthy);
    }

    #[test]
    fn failure_predictor_no_history() {
        let predictor = FailurePredictor::new(10);
        let predictions = predictor.predict();
        assert!(predictions.is_empty());
    }

    #[test]
    fn failure_predictor_with_degradation() {
        let mut predictor = FailurePredictor::new(10);
        // Record 5 reports, 4 with degraded CPU
        for i in 0..5 {
            let mut assessor = HealthAssessor::new();
            let cpu_threshold = if i < 4 { 80.0 } else { 30.0 };
            assessor.register_check(Box::new(CpuHealthCheck {
                threshold_percent: cpu_threshold,
            }));
            let report = assessor.assess();
            predictor.record(report);
        }
        let predictions = predictor.predict();
        assert!(!predictions.is_empty());
        assert_eq!(predictions[0].component, "cpu");
    }

    #[test]
    fn failure_predictor_imminent() {
        let mut predictor = FailurePredictor::new(10);
        let mut assessor = HealthAssessor::new();
        assessor.register_check(Box::new(MemoryHealthCheck {
            used_mb: 7900,
            total_mb: 8192,
        }));
        predictor.record(assessor.assess());
        predictor.record(assessor.assess());
        let predictions = predictor.predict();
        assert!(!predictions.is_empty());
        assert_eq!(predictions[0].risk_level, RiskLevel::Imminent);
    }
}
