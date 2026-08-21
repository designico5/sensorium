# M7-production-readiness

**Gate:** M7  
**Phase:** Production Hardening  
**Skill:** `security-review` + `living-docs-governance` + `chaos-engineering`

## Capability Evals (pass@3)

### EVAL-001: 24h soak zero crashes/leaks/underruns
- **Scenario:** standalone runs 24h under load
- **Action:** run soak test with cargo-instana
- **Expected:** zero crashes, zero leaks, zero audio underruns
- **Verification:** log parser + dhat snapshot diff

## Regression Evals (pass^3)

### EVAL-R1: Security audit 0 critical/high
- **Scenario:** cargo-audit + trivy scan on release artifacts
- **Action:** run security.yml workflow
- **Expected:** 0 critical, 0 high
- **Verification:** SARIF report

## Blockers
- cargo-dist release pipeline must be ready
- 24h soak environment must be provisioned