//! sensorium-release — Release Automation & Packaging
//!
//! Handles automated release workflows including version bumping,
//! changelog generation, binary packaging (VST3/CLAP/Standalone),
//! and distribution via cargo-dist.

use anyhow::Result;
use serde::{Deserialize, Serialize};
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
        for artifact in &self.artifacts {
            if artifact.name.trim().is_empty() || artifact.path.trim().is_empty() {
                anyhow::bail!("release artifact name and path are required");
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
}
