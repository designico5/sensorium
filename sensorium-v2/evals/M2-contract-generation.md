# M2-contract-generation

**Gate:** M2  
**Phase:** Type-Safe Contracts  
**Skill:** `contract-first` + `contract-first-api`

## Capability Evals (pass@3)

### EVAL-001: Protobuf generates Rust + TS types
- **Scenario:** contract source changed
- **Action:** run `cargo build` + `npm run generate:types`
- **Expected:** generated code compiles and type-checks
- **Verification:** build green + tsc --noEmit

## Regression Evals (pass^3)

### EVAL-R1: Contract drift test
- **Scenario:** provider struct changed
- **Action:** run contract validation tests
- **Expected:** test fails if contract != provider
- **Verification:** CI green

## Blockers
- protobuf schemas must be finalized