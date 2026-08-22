//! sensorium-release — Release Automation & Packaging
//!
//! Handles automated release workflows including version bumping,
//! changelog generation, binary packaging (VST3/CLAP/Standalone),
//! and distribution via cargo-dist.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tracing::info;

/// Release configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseConfig {
    pub version: String,
    pub targets: Vec<ReleaseTarget>,
    pub include_vst3: bool,
    pub include_clap: bool,
    pub include_standalone: bool,
    pub include_installer: bool,
}

impl Default for ReleaseConfig {
    fn default() -> Self {
        Self {
            version: "0.1.0".into(),
            targets: vec![ReleaseTarget::WindowsX86_64],
            include_vst3: true,
            include_clap: true,
            include_standalone: true,
            include_installer: true,
        }
    }
}

/// Target platform for release builds.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ReleaseTarget {
    WindowsX86_64,
    LinuxX86_64,
    MacOsAarch64,
    MacOsX86_64,
}

/// Release artifact metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseArtifact {
    pub name: String,
    pub path: String,
    pub target: ReleaseTarget,
    pub size_bytes: u64,
    pub sha256: String,
    /// Signature/provenance reference. A missing signature is never publishable.
    pub signature: Option<String>,
}

/// Release manifest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseManifest {
    pub version: String,
    pub artifacts: Vec<ReleaseArtifact>,
    pub changelog: String,
}

/// Minimal persistent state needed to make an upgrade reversible.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ReleaseHistory {
    pub active_version: String,
    pub previous_version: Option<String>,
}

impl ReleaseHistory {
    pub fn new(active_version: impl Into<String>) -> Result<Self> {
        let active_version = active_version.into();
        if active_version.trim().is_empty() {
            anyhow::bail!("active release version must not be empty");
        }
        Ok(Self { active_version, previous_version: None })
    }

    pub fn record_upgrade(&mut self, next_version: impl Into<String>) -> Result<()> {
        let next_version = next_version.into();
        if next_version.trim().is_empty() || next_version == self.active_version {
            anyhow::bail!("upgrade must target a different non-empty version");
        }
        self.previous_version = Some(self.active_version.clone());
        self.active_version = next_version;
        Ok(())
    }

    pub fn rollback_target(&self) -> Result<&str> {
        self.previous_version
            .as_deref()
            .filter(|version| !version.trim().is_empty() && *version != self.active_version)
            .ok_or_else(|| anyhow::anyhow!("no distinct previous release is available"))
    }

    pub fn rollback(&mut self) -> Result<String> {
        let target = self.rollback_target()?.to_owned();
        let current = std::mem::replace(&mut self.active_version, target.clone());
        self.previous_version = Some(current);
        Ok(target)
    }
}

impl ReleaseManifest {
    /// Enforce the minimum publish contract before any download link is enabled.
    pub fn validate_for_publish(&self) -> Result<()> {
        if self.version.split('.').count() != 3 || self.version.split('.').any(|part| part.is_empty()) {
            anyhow::bail!("release version must contain three non-empty components");
        }
        if self.artifacts.is_empty() {
            anyhow::bail!("release must contain at least one artifact");
        }
        if self.changelog.trim().is_empty() {
            anyhow::bail!("release changelog must not be empty");
        }
        let mut names = HashSet::with_capacity(self.artifacts.len());
        for artifact in &self.artifacts {
            if artifact.name.trim().is_empty() || artifact.path.trim().is_empty() {
                anyhow::bail!("release artifact name and path are required");
            }
            if !names.insert(artifact.name.trim().to_owned()) {
                anyhow::bail!("release artifact names must be unique");
            }
            let path_segments = artifact.path.split(['/', '\\']);
            if artifact.path.starts_with('/') || artifact.path.starts_with('\\')
                || path_segments.clone().any(|segment| segment == ".." || segment.is_empty())
            {
                anyhow::bail!("release artifact {} has an unsafe relative path", artifact.name);
            }
            if artifact.size_bytes == 0 {
                anyhow::bail!("release artifact {} must not be empty", artifact.name);
            }
            if artifact.sha256.len() != 64 || !artifact.sha256.bytes().all(|byte| byte.is_ascii_hexdigit()) {
                anyhow::bail!("release artifact {} has an invalid SHA-256", artifact.name);
            }
            if artifact
                .signature
                .as_deref()
                .map_or(true, |signature| signature.trim().is_empty())
            {
                anyhow::bail!("release artifact {} is unsigned", artifact.name);
            }
        }
        Ok(())
    }
}

/// Release automation engine.
pub struct ReleaseEngine {
    config: ReleaseConfig,
}

impl ReleaseEngine {
    /// Create a new release engine.
    pub fn new(config: ReleaseConfig) -> Self {
        info!(version = %config.version, "Release engine created");
        Self { config }
    }

    /// Generate a release manifest (dry run).
    pub fn plan(&self) -> Result<ReleaseManifest> {
        info!(version = %self.config.version, "Planning release");
        Ok(ReleaseManifest {
            version: self.config.version.clone(),
            artifacts: Vec::new(),
            changelog: String::new(),
        })
    }

    /// Execute the release build.
    pub async fn build(&self) -> Result<ReleaseManifest> {
        info!("Building release...");
        // TODO: cargo build --release for each target
        // TODO: Package VST3/CLAP/Standalone binaries
        // TODO: Generate installer
        // TODO: Compute SHA256 checksums
        self.plan()
    }

    /// Returns the current configuration.
    pub fn config(&self) -> &ReleaseConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config() {
        let config = ReleaseConfig::default();
        assert_eq!(config.version, "0.1.0");
        assert!(config.include_vst3);
    }

    #[test]
    fn plan_release() {
        let engine = ReleaseEngine::new(ReleaseConfig::default());
        let manifest = engine.plan().unwrap();
        assert_eq!(manifest.version, "0.1.0");
        assert!(manifest.validate_for_publish().is_err());
    }

    #[test]
    fn publish_contract_accepts_signed_complete_manifest() {
        let manifest = ReleaseManifest {
            version: "2.0.0".into(),
            changelog: "Stage gate release".into(),
            artifacts: vec![ReleaseArtifact {
                name: "sensorium-windows.exe".into(),
                path: "releases/sensorium-windows.exe".into(),
                target: ReleaseTarget::WindowsX86_64,
                size_bytes: 42,
                sha256: "a".repeat(64),
                signature: Some("sigstore://example".into()),
            }],
        };
        manifest.validate_for_publish().unwrap();
    }

    #[test]
    fn publish_contract_rejects_unsafe_paths_empty_artifacts_and_duplicates() {
        let artifact = |name: &str, path: &str, size_bytes| ReleaseArtifact {
            name: name.into(),
            path: path.into(),
            target: ReleaseTarget::WindowsX86_64,
            size_bytes,
            sha256: "a".repeat(64),
            signature: Some("sigstore://example".into()),
        };

        let mut manifest = ReleaseManifest {
            version: "2.0.0".into(),
            changelog: "Stage gate release".into(),
            artifacts: vec![artifact("sensorium.exe", "../sensorium.exe", 42)],
        };
        assert!(manifest.validate_for_publish().is_err());

        manifest.artifacts = vec![artifact("sensorium.exe", "releases/sensorium.exe", 0)];
        assert!(manifest.validate_for_publish().is_err());

        manifest.artifacts = vec![
            artifact("sensorium.exe", "releases/sensorium.exe", 42),
            artifact("sensorium.exe", "releases/sensorium-copy.exe", 42),
        ];
        assert!(manifest.validate_for_publish().is_err());
    }

    #[test]
    fn release_history_requires_distinct_rollback_target() {
        let mut history = ReleaseHistory::new("2.0.0").unwrap();
        assert!(history.rollback_target().is_err());
        history.record_upgrade("2.1.0").unwrap();
        assert_eq!(history.rollback().unwrap(), "2.0.0");
        assert_eq!(history.active_version, "2.0.0");
        assert_eq!(history.previous_version.as_deref(), Some("2.1.0"));
        assert!(history.record_upgrade("2.0.0").is_err());
    }
}
