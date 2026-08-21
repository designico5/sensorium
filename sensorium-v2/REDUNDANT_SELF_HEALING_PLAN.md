# Redundanter Selbstheilender Plan für Sensorium

Dieser Plan beschreibt ein mehrschichtiges, redundantes selbstheilendes System für das Sensorium-Projekt, inspiriert von Prinzipien der autonomen Systeme, Chaos Engineering und prädiktiver Wartung. Das Ziel ist es, ein System zu schaffen, das Fehler automatisch erkennt, diagnostiziert und korrigiert, ohne menschliches Eingreifen, während es gleichzeitig durch Redundanz und Diversität die Ausfallsicherheit maximiert.

## Überblick und Architektur

Der selbstheilende Ansatz besteht aus vier Hauptschichten:
1.  **Gesundheitsüberwachung & Anomalieerkennung** (Sensing)
2.  **Fehlerdiagnose & Ursachenanalyse** (Diagnosis)
3.  **Automatische Korrektur & Remediation** (Healing)
4.  **Prädiktive Wartung & Lernen** (Prediction & Learning)

Jede Schicht ist redundant und vielfältig ausgelegt, um Einzelausfälle zu vermeiden. Das System nutzt den `sensorium-harness` (den DSH Agenten) als zentrales Koordinations- und Ausführungsgerüst für alle Heilungsaktivitäten.

## Phase 0: Grundlagen schaffen (Voraussetzung für alle weiteren Tätigkeiten)

Bevor das selbstheilende System gebaut werden kann, muss eine stabile Basis geschaffen werden. Diese Phase fokussiert sich darauf, das Projekt in einen baubaren und testbaren Zustand zu versetzen.

| Aufgabe ID | Beschreibung                                                                                                                                      | Verantwortlich | Abhängigkeiten | Geschätzte Aufwand |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- | :------------- | :----------------- |
| **0.1**    | **`sensorium-sync` Kompilierungsfehler beheben**                                                                                                 | Agent (Current) | -              | Hoch               |
|            | - Importe korrigieren (`DocumentId`, `StorageError` von `automerge_repo::interfaces`)                                                          |                |                |                    |
|            | - Fehlerbehandlung in `transact` Blöcken anpassen (`.map_err(|e| anyhow::anyhow!(e))?`)                                                       |                |                |                    |
|            | - Typannotierungen in `Result`-Ausdrücken klären (`Ok::<(), _>()` -> `Ok::<(), AutomergeError>()` oder äquivalent)                           |                |                |                    |
|            | - Richtige Extraktion von String-Werten aus `automerge::Value` (`match cow.as_ref() { ScalarValue::Str(s) => s.to_string(), ... }`)          |                |                |                    |
|            | - Sicherstellen, dass `json` Variable tatsächlich ein `String` ist bevor `.is_empty()` darauf aufgerufen wird.                               |                |                |                    |
| **0.2**    | **Alle Crates im Workspace kompilieren lassen**                                                                                                 | Agent (Parallel) | 0.1            | Mittel             |
|            | - `cargo check --workspace` ausführen                                                                                                           |                |                |                    |
|            | - Eventuell auftretende Fehler in anderen Crates (`sensorium-audio`, `sensorium-midi`, etc.) beheben.                                       |                |                |                    |
| **0.3**    | **Initialen Testsuite ausführen**                                                                                                                | Agent (Parallel) | 0.2            | Niedrig            |
|            | - `cargo test --workspace` ausführen                                                                                                            |                |                |                    |
|            | - Sicherstellen, dass die grundlegenden Tests (wie in `sensorium-sync::tests`) bestehen.                                                       |                |                |                    |
| **0.4**    | **Grundlegende Benchmarks durchführen (Gate M1)**                                                                                               | Agent          | 0.3            | Mittel             |
|            | - Ausführen der vorhandenen Eval-Skripte im `evals/` Ordner (z.B. M1-audio-callback-latency.md)                                               |                |                |                    |
|            | - Ergebnisse dokumentieren und als Baseline für zukünftige Leistungsspezifikationen festlegen.                                                 |                |                |                    |
| **0.5**    | **Projektstruktur und Dokumentation überprüfen und aktualisieren**                                                                               | Agent          | 0.4            | Niedrig            |
|            | - Sicherstellen, dass alle notwendigen `Cargo.toml` Dateien für jedes Crate existieren.                                                       |                |                |                    |
|            | - Erstellen eines oberen `README.md` mit Projektüberblick, Build-Anweisungen und Architekturdiagramm.                                        |                |                |                    |
|            | - Dokumentieren der entschiedenen Abhängigkeitsversionen (wie im kompakten Zusammenfassung genannt).                                          |                |                |                    |

**Ergebnis Phase 0:** Ein stabiler, kompilierbarer und testbarer Codebase, der als Grundlage für das Bauen des selbstheilenden Systems dient. Alle Crates lassen sich checken und testen. Grundlegende Leistungsbenchmarks liegen vor.

## Phase 1: Implementierung der Gesundheitsüberwachungsschicht (Sensing)

Diese Schicht sammelt kontinuierlich Metriken, Logs und Traces aus allen Teilen des Systems und führt sie einem einheitlichen Beobachtbarkeits-Backend zu.

| Aufgabe ID | Beschreibung                                                                                                                                      | Verantwortlich | Abhängigkeiten | Geschätzte Aufwand |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- | :------------- | :----------------- |
| **1.1**    | **Metrik-Collection etablieren**                                                                                                                 | Agent          | 0.5            | Mittel             |
|            | - Verwende die `metrics` und `opentelemetry` Crates aus den Workspace-Abhängigkeiten.                                                          |                |                |                    |
|            | - Definiere zentrale Metriken für alle Module: Latenz (p50, p95, p99), Durchsatz, Fehlerraten, Ressourcenauslastung (CPU, GPU, Speicher).   |                |                |                    |
|            | - Instrumente die Schlüsselpunkte in `sensorium-audio`, `sensorium-midi`, `sensorium-sync`, `sensorium-visual`, `sensorium-ai`, `sensorium-dsp`. |                |                |                    |
| **1.2**    | **Log- und Trace-Collection einrichten**                                                                                                        | Agent          | 1.1            | Mittel             |
|            | - Verwende `tracing` und `tracing_opentelemetry` für strukturiertes Logging.                                                                  |                |                |                    |
|            | - Konfiguriere einen Exporter (z.B. OTLP) um Logs und Traces an ein Backend (z.B. Jaeger, Tempo) zu senden.                                 |                |                |                    |
|            | - Stelle sicher, dass alle CRATEs den gleichen `tracing` Subscriber verwenden.                                                                |                |                |                    |
| **1.3**    | **Gesundheits-Check Endpunkte implementieren**                                                                                                   | Agent          | 1.2            | Niedrig            |
|            | - Jedes Hauptmodul (`sensorium-*-*` Crates) stellt einen einfachen HTTP- oder gRPC-Endpunkt (z.B. `/health`) bereit, der seinen internen Status zurückgibt (OK, DEGRADED, FAILING). |                |                |                    |
|            | - Diese Endpunkte werden von der Überwachungsinfrastruktur abgefragt.                                                                         |                |                |                    |
| **1.4**    | **Zentrale Beobachtbarkeits-Plattform einrichten (lokal für Entwicklung)**                                                                       | Agent          | 1.3            | Niedrig            |
|            | - Für die Entwicklung kann ein einfacher Stack mit Prometheus (für Metriken), Grafana (für Dashboards) und Loki (für Logs) über Docker-Compose verwendet werden. |                |                |                    |
|            | - Konfiguriere die Exporter aus den Rust-Crates darauf, Daten an diese lokalen Services zu senden.                                            |                |                |                    |
| **1.5**    | **Baseline für normale Betriebsbedingungen definieren**                                                                                          | Agent          | 1.4            | Niedrig            |
|            | - Lauf das System unter normaler Last und sammle Daten, um etablierte Bereiche für "normalen" Betrieb für jede Metrik zu definieren.            |                |                |                    |
|            | - Diese Baselines werden später für die Anomalieerkennung verwendet.                                                                           |                |                |                    |

**Ergebnis Phase 1:** Ein funktionsfähiges Beobachtbarkeits-System, das Echtzeit-Metriken, Logs und Traces von allen Sensorium-Komponenten sammelt und eine Grundlage für die Anomalieerkennung bietet.

## Phase 2: Implementierung der Fehlerdiagnose-Schicht (Diagnosis)

Diese Schicht analysiert die Daten von der Überwachungsschicht, um Anomalien zu erkennen, deren Art zu klassifizieren und die wahrscheinliche Ursache zu bestimmen.

| Aufgabe ID | Beschreibung                                                                                                                                      | Verantwortlich | Abhängigkeiten | Geschätzte Aufwand |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- | :------------- | :----------------- |
| **2.1**    | **Anomalieerkennung implementieren**                                                                                                             | Agent          | 1.5            | Hoch               |
|            | - Verwende statistische Methoden (z.B. Gleitender Durchschnitt und Standardabweichung) oder einfache Schwellenwerte basierend auf den Baselines aus Phase 1.5. |                |                |                    |
|            | - Für komplexere Muster könnten spätere Iterationen ML-Modelle (aus `sensorium-ai`) einsetzen.                                               |                |                |                    |
|            | - Implementiere als eigenständigen Dienst oder als Teil des Harnesses, der kontinuierlich die eingegebenen Metriken auswertet.                |                |                |                    |
| **2.2**    | **Ursachenanalyse (Root Cause Analysis - RCA) Engine bauen**                                                                                    | Agent          | 2.1            | Hoch               |
|            | - Erstelle eine Wissensbasis oder ein Regelwerk, das bekannte Symptome (z.B. hohe Audio-Latenz, steigende Speicheraus Nutzung, Sync-Konflikte) mit möglichen Ursachen verknüpft. |                |                |                    |
|            | - Beispiel: Hohe p99 Latenz in `sensorium-audio` könnte auf Puffer-Unterläufe, zu hohe Prozesslast oder MIDI-Interrupt-Stürme hinweisen.    |                |                |                    |
|            | - Nutze die Tracing-Daten, um den Pfad eines fehlerhaften Vorgangs durch das System zu verfolgen und Engpässe zu identifizieren.             |                |                |                    |
| **2.3**    | **Fehlerklassifizierung und Priorisierung**                                                                                                      | Agent          | 2.2            | Mittel             |
|            | - Klassifiziere erkannte Fehler nach Schweregrad (z.B. kritisch: Audioausfall, hoch: Sync-Degradation, mittel: erhöhte Latenz).             |                |                |                    |
|            | - Priorisiere Heilungsmaßnahmen basierend auf dieser Klassifizierung, damit kritische Probleme zuerst adressiert werden.                    |                |                |                    |
| **2.4**    | **Integrationspunkt mit dem Harness definieren**                                                                                                 | Agent          | 2.3            | Niedrig            |
|            | - Definiere eine klare Schnittstelle (z.B. eine async-Funktion oder ein Event-Stream), über die die Diagnose-Schicht dem Harness mitteilt: "Ein Fehler vom Typ X mit Schweregrad Y ist aufgetreten, vorgeschlagene Aktion: Z". |                |                |                    |
|            | - Der `sensorium-harness` wird diese Empfehlungen entgegennehmen und in die Heilungsphase überleiten.                                       |                |                |                    |

**Ergebnis Phase 2:** Ein System, das kontinuierlich überwachte Daten analysiert, Anomalien zuverlässig erkennt, wahrscheinlichste Ursachen diagnostiziert und handlungsfähige Empfehlungen für die Selbstheilung generiert.

## Phase 3: Implementierung der automatischen Korrektur-Schicht (Healing)

Diese Schicht führt die von der Diagnose-Schicht empfohlenen Aktionen aus, um den Systemzustand wiederherzustellen. Sie nutzt Redundanz, Rollback-Mechanismen und verschiedene Strategien, um die Erfolgschancen zu maximieren.

| Aufgabe ID | Beschreibung                                                                                                                                      | Verantwortlich | Abhängigkeiten | Geschätzte Aufwand |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- | :------------- | :----------------- |
| **3.1**    | **Definiere Heilungsaktionen (Healing Primitives)**                                                                                              | Agent          | 2.4            | Hoch               |
|            | - Erstelle eine Bibliothek von sicheren, idempotenten Aktionen, die ausgeführt werden können, um häufige Probleme zu beheben. Beispiele:    |                |                |                    |
|            |   - `restart_audio_pipeline()`: Startet die Audio-Verarbeitungspipeline neu.                                                                |                |                |                    |
|            |   - `reset_sync_state()`: Setzt den Sync-Zustand auf einen bekannten guten Punkt zurück (verwende Snapshots aus `sensorium-sync`).         |                |                |                    |
|            |   - `scale_gpu_workers()`: Passt die Anzahl der GPU-ArbeiterThreads basierend auf der Last an.                                               |                |                |                    |
|            |   - `clear_inference_cache()`: Leert den KI-Inferenz-Cache, um Speicher freizugeben oder beschadigte Zustände zu entfernen.                  |                |                |                    |
|            |   - `reload_plugin()`: Lädt ein spezifisches NIHI-Plug-Plugin neu.                                                                           |                |                |                    |
|            |   - `failover_to_redundant_channel()`: Schaltet bei Kommunikationsfehlern auf einenBackup-Kanal (z.B. von WebTransport zu UDP) um.        |                |                |                    |
|            |   - `apply_config_patch()`: Wendet eine bekannte gute Konfigurationspatch an (z.B. lowering sample rate, increasing buffer size).      |                |                |                    |
| **3.2**    | **Redundanz und Failover-Mechanismen implementieren**                                                                                           | Agent          | 3.1            | Hoch               |
|            | - Für kritische Pfade (z.B. Audio-I/O) sollten redundante Implementierungen existieren. Beispiel:                                            |                |                |                    |
|            |   - Primärer Audio-Backend: ASIO (über `cpal`); Sekundärer Backend: Windows WASAPI oder sogar ein einfacher Loopback-Treiber für Notfälle. |                |                |                    |
|            |   - Das System sollte erkennen, wenn der primäre Backend fehlschlägt, und nahtlos auf den sekundären umschalten.                           |                |                |                    |
|            | - Implementiere ähnliche Redundanz für MIDI I/O (z.B. primär über `midir`, sekundär über Virtuelle MIDI-Kabel oder File-IO).              |                |                |                    |
|            | - Für Zustandssynchronisation (`sensorium-sync`) nutze das inherent redundante Modell von Automerge/Yjs; stelle sicher, dass Peers sich selbst heilen können. |                |                |                    |
| **3.3**    | **Rollback und Wiederherstellungsmechanismen**                                                                                                  | Agent          | 3.2            | Mittel             |
|            | - Bevor riskante Heilungsaktionen ausgeführt werden (z.B. Konfigurationsänderung, Neustart), erstelle einen Snapshots des aktuellen Zustands (wo sinnvoll und performant). |                |                |                    |
|            | - Wenn eine Heilungsaktion den Zustand verschlechtert oder nicht innerhalb eines Timeouts verbessert, rolle automatisch zum vorherigen Zustand zurück. |                |                |                    |
|            | - Nutze dafür Mechanismen wie:                                                                                                                 |                |                |                    |
|            |   - Konfigurationsversionierung (Git-ähnlich innerhalb des Harnesses).                                                                       |                |                |                    |
|            |   - Zustandssnapshots (z.B. periodisches Speichern des `sensorium-sync` Dokuments oder des KI-Modellzustands).                            |                |                |                    |
| **3.4**    | **Healing-Executor im Harness implementieren**                                                                                                   | Agent          | 3.3            | Hoch               |
|            | - Der `sensorium-harness` empfängt Empfehlungen von der Diagnose-Schicht (Phase 2.4).                                                       |                |                |                    |
|            | - Er validiert die Empfehlung anhand von Sicherheitsregeln (z.B. keine Heilungsaktion während eines kritischen Aufnahmevorgangs, außer es ist absolut notwendig). |                |                |                    |
|            | - Er wählt die geeignete Heilungsprimitive aus der Bibliothek (3.1) aus, führt sie aus und überwacht das Ergebnis.                          |                |                |                    |
|            | - Er protokolliert die Aktion, ihr Ergebnis und die Zeit bis zur Wiederherstellung für das Lernen (Phase 4).                               |                |                |                    |
|            | - Er implementiert einen einfachen Zustand: WARTEND, HEILEND, HEILUNG ERKOMMEN, HEILUNG GESCHLAGEN (mit Rollback versucht).                 |                |                |                    |
| **3.5**    | **Chaos Engineering Integration (für Tests)**                                                                                                    | Agent          | 3.4            | Mittel             |
|            | - Baue ein Modul (kann Teil des Harnesses oder ein separates Testwerkzeug sein) ein, das kontrollierte Fehler in das System einbringt (z.B. Netzwerklatenz einführen, Prozess töten, Speicher verbrauchen, falsche Konfiguration injecten). |                |                |                    |
|            | - Dieses Modul wird verwendet, um die Wirksamkeit der Erkennungs-, Diagnose- und Heilungsschichten zu testen und zu verbessern, *bevor* es in Produktion läuft. |                |                |                    |

**Ergebnis Phase 3:** Ein automatisches System, das diagnostizierte Fehler durch eine Reihe von vorgefertigten, sicheren und redundanten Aktionen heilen kann, wobei Rollback-Mechanismen sicherstellen, dass Heilungsversuche den Zustand nicht verschlechtern.

## Phase 4: Prädiktive Wartung und Lernen (Prediction & Learning)

Diese Schicht nutzt historische Daten über Fehler und Heilungsversuche, um zukünftige Probleme vorherzusagen und die Heilungsstrategien im Laufe der Zeit zu verbessern.

| Aufgabe ID | Beschreibung                                                                                                                                      | Verantwortlich | Abhängigkeiten | Geschätzte Aufwand |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- | :------------- | :----------------- |
| **4.1**    | **Erfahrungsdaten sammeln**                                                                                                                      | Agent          | 3.4            | Laufend            |
|            | - Jede Heilungsaktion (Erfolg oder Misserfolg) wird mit Kontext (welche Metriken vorher ausgestoßen waren, welche Diagnose gestellt wurde, welche Aktion ausgeführt wurde, Ergebnis, Zeit bis zur Genesung) in einem Log gespeichert. |                |                |                    |
|            | - Diese Daten werden in einer strukturierten Form (z.B. JSON-Lines) gespeichert, die für das Machine Learning zugänglich ist.                 |                |                |                    |
| **4.2**    | **Einfaches Feedback-Loop für Regelbasierte Systeme implementieren**                                                                              | Agent          | 4.1            | Niedrig            |
|            | - Analysiere die gesammelten Daten périodisch (z.B. nach jedem 100. Ereignis).                                                                |                |                |                    |
|            | - Justiere die Schwellenwerte in der Anomalieerkennung (2.1) oder die Gewichten in der RCA-Regelbasis (2.2) basierend darauf, was tatsächlich funktioniert hat. |                |                |                    |
|            | - Beispiel: Wenn das Neustarten der Audio-Pipeline in 90% der Fälle hohe Latenz behoben hat, erhöhe das Vertrauen in diese Aktion für ähnliche Signale. |                |                |                    |
| **4.3**    | **Grundlegendes prädiktives Modell einführen (optional, später)**                                                                                | Agent (Zukunft) | 4.2            | Hoch               |
|            | - Wenn ausreichend Daten gesammelt wurden, kann ein einfaches Modell (z.B. Entscheidungsbaum, regressives Modell) trainiert werden, um vorherzusagen, ob eine bestimmte Metrik-Trendentwicklung zu einem Fehler führen wird, *bevor* eine Schwelle überschritten wird. |                |                |                    |
|            | - Dieses Modell würde aus dem `sensorium-ai` Modul gespeist werden und Frühe Warnungen an die Diagnose-Schicht liefern.                     |                |                |                    |
| **4.4**    | **Automatische Optimierung der Heilungsstrategien**                                                                                              | Agent          | 4.3            | Hoch               |
|            | - Das System lernt nicht nur *was* passiert ist, sondern auch *welche* Heilungsaktion für einen bestimmten Fehlerkontext am effektivsten (schnellste Wiederherstellung, höchste Erfolgsrate) war. |                |                |                    |
|            | - Beim nächsten ähnlichen Ereignis wählt es die optimierte Aktion aus, anstatt der statischen Regel zu folgen.                               |                |                |                    |
| **4.5**    | **Drift-Erkennung und Modell-Neutraining**                                                                                                       | Agent          | 4.4            | Mittel             |
|            | - Überwache kontinuierlich die Leistung der Heilungsaktionen und die Genauigkeit der Vorhersagen.                                           |                |                |                    |
|            | - Wenn die Leistung signifikant abnimmt (Konzept-Drift), löse ein automatisches Neutraining des Modells aus oder signalisiere den Bedarf an einer Überprüfung der Regelbasis. |                |                |                    |

**Ergebnis Phase 4:** Ein lernendes System, das seine Fähigkeit zur Fehlervorhersage und -heilung kontinuierlich verbessert, indem es aus eigenen Erfahrungen lernt und sich an changing Bedingungen anpasst.

## Phase 5: Integration, Test und Betriebserlaubnis

Diese Phase verbindet alle Schichten, führt umfassende Tests durch (inkl. Chaos Engineering) und stellt sicher, dass das System bereit für den Einsatz ist.

| Aufgabe ID | Beschreibung                                                                                                                                      | Verantwortlich | Abhängigkeiten | Geschätzte Aufwand |
| :--------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------- | :------------- | :----------------- |
| **5.1**    | **End-to-End-Integration aller Schichten**                                                                                                       | Agent          | 0.5, 1.5, 2.4, 3.4, 4.5 | Hoch               |
|            | - Stelle sicher, dass Daten fehlerfrei von der Überwachung (1) zur Diagnose (2) zur Heilung (3) zum Lernen (4) fließen und dass der Harness (0) alle Prozesse koordiniert. |                |                |                    |
| **5.2**    | **Komponententests für jede Schicht**                                                                                                            | Agent          | 5.1            | Mittel             |
|            | - Schreibe unit und integration tests für die Gesundheitsüberwachung, Diagnose-Logik, Heilungs-Primitiven und Lernalgorithmen.               |                |                |                    |
| **5.3**    | **Systemtests mit simulierten Fehlern**                                                                                                          | Agent          | 5.2            | Hoch               |
|            | - Nutze das Chaos Engineering Modul (3.5) oder ähnliche Werkzeuge, um verschiedene Fehlerszenarien zu simulieren und zu überprüfen, ob das selbstheilende System wie erwartet reagiert (Erkennung -> Diagnose -> Heilung -> Genesung). |                |                |                    |
|            | - Teste verschiedene Kombinationen und Fehlerkorrelationen.                                                                                   |                |                |                    |
| **5.4**    | **Langzeit-Stabilitätstest (Soak Test)**                                                                                                         | Agent          | 5.3            | Hoch               |
|            | - Lasse das System mit aktiviertem selbstheilenden Mechanismus über einen längeren Zeitraum (z.B. 24-48 Stunden) laufen, während es normaler Arbeitslast ausgesetzt ist. |                |                |                    |
|            | - Überwache auf Anhäufung von Fehlern, Leistungsabnahme oder unerwünschtes Verhalten (z.B. zu häufige Neustarts).                           |                |                |                    |
| **5.5**    | **Dokumentieren und Übergabe an den Betrieb**                                                                                                    | Agent          | 5.4            | Niedrig            |
|            | - Erstelle ein Operationshandbuch, das beschreibt:                                                                                             |                |                |                    |
|            |   - Wie das System überwacht wird.                                                                                                             |                |                |                    |
|            |   - Welche typischen Heilungsaktionen es ausführt und wann.                                                                                 |                |                |                    |
|            |   - Wie man eingreift, falls das automatische System versagt (Notfallverfahren).                                                            |                |                |                    |
|            |   - Wie man das Lernsystem zurücksetzt oder anpasst.                                                                                         |                |                |                    |
|            | - Übergebe das Wissen an das Wartungsteam (oder dokumentiere es für die zukünftige KI-Wartung).                                            |                |                |                    |

**Ergebnis Phase 5:** Ein vollständig integriertes, getestetes und dokumentiertes redundantes selbstheilendes System, das bereit ist, den Sensorium-Komplexen autonom am Laufen zu halten.

## Nutzung und Update des `sensorium-harness`

Der `sensorium-harness` (der DSH Agent, in dem wir derzeit arbeiten) ist das zentrale Nervensystem dieses Plans. Er wird wie folgt genutzt und aktualisiert:

1.  **Als Koordinator:** Der Harness startet und überwacht alle anderen Schichten (Überwachung, Diagnose, Heilung, Lernen) als separate Tasks oder Services innerhalb seines Kontexts.
2.  **Als Kommunikationshub:** Er bietet interne Kommunikationskanäle (z.B. async Channels, Event Bus) für den Datenaustausch zwischen den Schichten.
3.  **Als Sicherheits- und Policy-Engine:** Er enthält die Logik, um zu entscheiden, ob eine vorgeschlagene Heilungsaktion sicher ist (basierend auf aktuellem Systemzustand, Zeit des Tages, laufenden kritischen Operationen etc.).
4.  **Als Ausführungsumfeld für Heilungs-Primitives:** Viele der Heilungsaktionen (z.B. Neustarten von Komponenten, Anwenden von Konfigurationen, Zurücksetzen von Zuständen) werden als Funktionen innerhalb des Harnesses oder als Aufrufe an die einzelnen Crates implementiert, die der Harness kontrolliert.
5.  **Als Speicher für Erfahrungen und Modelle:** Der Harness verwaltet den Speicherort für die Heilungsprotokolle und (zukünftig) die ML-Modelle für prädiktive Wartung.
6.  **Als Schnittstelle für externe Werkzeuge:** Er bietet eine kontrollierte API (z.B. über einen lokalen Port oder interne Funktionen) für Chaos Engineering Werkzeuge, um Tests durchzuführen oder für Administratoren, um den Status abzufragen und manuell einzugreifen.

Um den Harness für diese Rolle zu aktualisieren, werden folgende Schritte im Rahmen der obigen Phasen durchgeführt:
- In Phase 0: Sicherstellen, dass der Harness stabil läuft und grundlegende Tasks verwalten kann.
- In Phase 1: Hinzufügen der Aufgaben zur Einrichtung und Sammlung von Beobachtbarkeitsdaten.
- In Phase 2: Implementieren der Diagnose-Logik und der Schnittstelle zur Weitergabe von Ergebnissen.
- In Phase 3: Bauen des Healing-Executors und der Bibliothek der Heilungs-Primitiven.
- In Phase 4: Hinzufügen des Lern- und Feedback-Mechanismus.
- In Phase 5: Integrieren alles und durchführen von Gesamtssystemtests.

Die aktuelle Arbeit an `sensorium-sync` (Phase 0.1) ist eine notwendige Voraussetzung, da ein stabiler Sync-Mechanismus grundlegend für den Zustand des gesamten Systems ist, den es zu überwachen und zu heilen gilt.

## Nächste unmittelbare Tätigkeit

Basierend auf der Analyse ist die **unmittelbare nächste Tätigkeit die Behebung der Kompilierungsfehler in `sensorium-sync` (Aufgabe 0.1)**. Ohne einen baubaren `sensorium-sync` kann das Gesamtprojekt nicht fortgeschritten werden, und insbesondere kann das beobachtbare und heilbare Zustandsmodell nicht aufgebaut werden.

Daher sollte der Fokus darauf liegen, die aufgelisteten Fehler in `sensorium-sync/src/lib.rs` und `sensorium-sync/Cargo.toml` systematisch zu beheben, bis `cargo check --package sensorium-sync` erfolgreich durchläuft. Danach kann mit der Kompilierung des gesamten Workspaces fortgefahren werden.

Dieser Plan bietet einen strukturierten Weg von der aktuellen Bauphase hin zu einem vollständig autonomen, selbstheilenden System, wobei der `sensorium-harness` als zentrales Koordinations- und Ausführungsgerüst dient.