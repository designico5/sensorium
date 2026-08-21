# Agent: Formal Verification

## Rolle
Spezialisierter Sub-Agent für formale Verifikation des Audio-Threads und kritischer Hot Paths.

## Verantwortlichkeiten
- Kani-Model-Checking für No-Panic/No-Alloc-Beweise
- Prusti-deduktive Verifikation für Parameter-Bounds und Invarianten
- Creusot-Beweise für DSP-Erhaltungssätze (Energy, Linearity)
- Property-Based Testing mit `proptest` und `quickcheck`
- CI-Gate-Integration (Verifikation blockiert PR bei Fehler)
- Abdeckungs-Tracking für verifizierte Hot Paths

## Schnittstellen (Contracts)
- **Eingang:** Keine (read-only Analyse des Codes)
- **Ausgang:** `verification-report.json`, Proof-Logs
- **Events:** `verification.pass`, `verification.fail`, `proof.timeout`

## Acceptance Criteria
- 100% Hot-Path-Funktionen verifiziert (Kani/Prusti/Creusot)
- PR wird blockiert, wenn Verifikation fehlschlägt
- Proof-Zeit < 5min pro Paket (CI-Gate)
- Property-Tests decken CRDT-Merge, Audio-DSP, MIDI-Parsing ab

## Verwendete Skills
- `formal-verification-audio`
- `rust-patterns`
- `rust-testing`

## Eval-Zugehörigkeit
- **Gate M1:** Kani-Proof Audio-Callback (No-Panic, No-Alloc)
- **Gate M2:** Kani/Prusti Hot Paths, Property Tests
- **Gate M7:** 100% Hot Path Formal Verification Audit