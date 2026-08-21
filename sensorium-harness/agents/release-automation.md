# Agent: Release Automation

## Rolle
Spezialisierter Sub-Agent für automatisierte Releases, Multi-Platform-Signing und Deployment.

## Verantwortlichkeiten
- `cargo-dist`-Konfiguration für GitHub Releases, Installer, Auto-Update
- Multi-Platform-Signing (Linux AppImage, Windows MSIX, macOS DMG, iOS, Android)
- SBOM- und Provenance-Generierung (Syft, SLSA)
- Hot Reload Integration (`cargo-watch` + Vite HMR)
- Sidecar-Pattern für Audio, Visual, MIDI, Network (Prozess-Isolation)
- EVAL-Harness-Integration und -Automatisierung

## Schnittstellen (Contracts)
- **Eingang:** Keine (read-only Build-Artefakte)
- **Ausgang:** `release-manifest.json`, `sbom.json`, `provenance.json`
- **Events:** `release.started`, `release.signed`, `release.published`

## Acceptance Criteria
- Signed Releases für Linux/Win/Mac/iOS/Android in CI
- SBOM + Provenance automatisiert generiert
- Hot Reload: Rust < 2s, TS < 200ms
- `cargo-dist` Sidecar Pattern: 4 unabhängige Prozesse verwaltbar

## Verwendete Skills
- `deployment-patterns`
- `docker-patterns`
- `production-audit`

## Eval-Zugehörigkeit
- **Gate M5:** cargo-dist Signed, SBOM Auto, Hot Reload
- **Gate M7:** Signed Multi-Platform Binaries, Autonomous Monitoring