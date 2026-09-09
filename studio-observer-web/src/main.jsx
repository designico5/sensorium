import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import snapshot from './observer-snapshot.json';
import { analyzeJournal } from './journal-analyzer.mjs';
import './styles.css';

const MAX_JOURNAL_BYTES = 10 * 1024 * 1024;

function StatusPill({ value = 'UNBEKANNT' }) {
  const key = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return <span className={`status status--${key}`}>{String(value)}</span>;
}

function formatTime(value) {
  if (!value) return 'nicht angegeben';
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? String(value) : parsed.toLocaleString('de-DE');
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function issueCode(issue) {
  if (typeof issue === 'string') return issue;
  return issue?.code ?? 'UNBEKANNTER_BEFUND';
}

function deltaCount(delta) {
  const before = asList(delta?.only_in_previous_metadata)
    .reduce((sum, item) => sum + (Number(item?.count) || 0), 0);
  const after = asList(delta?.only_in_current_metadata)
    .reduce((sum, item) => sum + (Number(item?.count) || 0), 0);
  return before + after;
}

function ambiguityCount(item) {
  const ambiguity = item?.ambiguity ?? {};
  return ['duplicate_indexes', 'duplicate_names', 'duplicate_metadata_rows']
    .reduce((sum, key) => sum + asList(ambiguity[key]).length, 0);
}

function SourceSnapshot() {
  const tests = asList(snapshot.tests);
  return (
    <section className="panel panel--source" aria-labelledby="source-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Source snapshot</p>
          <h2 id="source-title">Bekannter Softwarestand</h2>
        </div>
        <StatusPill value={snapshot.mode} />
      </div>
      <p className="boundary-copy">
        Statisch eingebaut, nicht live. Keine Sitzung, keine physische Erkennung.
        Push-Variante: <strong>UNKNOWN</strong>. Live/HIL: <strong>NOT_GRANTED</strong>.
        Physische Akzeptanz: <strong>NOT_EVALUATED</strong>.
      </p>
      <div className="source-grid">
        <article className="source-card">
          <span>Erfasst</span>
          <strong>{formatTime(snapshot.observedAtUtc)}</strong>
        </article>
        <article className="source-card">
          <span>Quellrevision</span>
          <strong className="mono wrap">{snapshot.sourceRevision ?? 'nicht gebunden'}</strong>
          <small>{snapshot.sourceState ?? 'Zustand unbekannt'}</small>
        </article>
        <article className="source-card source-card--wide">
          <span>Manifest SHA-256</span>
          <strong className="mono wrap">{snapshot.sourceManifestSha256 ?? 'nicht gebunden'}</strong>
        </article>
      </div>
      {tests.length > 0 && (
        <div className="test-strip" aria-label="Softwareprüfungen">
          {tests.map((item, index) => (
            <article key={`${item.label}-${index}`}>
              <div><strong>{item.label}</strong><StatusPill value={item.status} /></div>
              <p>{item.limit}</p>
            </article>
          ))}
        </div>
      )}
      {asList(snapshot.warnings).length > 0 && (
        <ul className="warning-list">
          {snapshot.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
        </ul>
      )}
    </section>
  );
}

function GateTable() {
  const gates = asList(snapshot.gates);
  return (
    <section className="panel" aria-labelledby="gates-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Owner &amp; Gates</p>
          <h2 id="gates-title">Freigaben bleiben getrennt</h2>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Gate</th><th>Owner</th><th>Status</th><th>Grund</th></tr></thead>
          <tbody>
            {gates.length ? gates.map((gate) => (
              <tr key={gate.id}>
                <td className="mono">{gate.id}</td>
                <td>{gate.owner}</td>
                <td><StatusPill value={gate.status} /></td>
                <td>{gate.reason}</td>
              </tr>
            )) : (
              <tr><td colSpan="4">Keine Gates im Quellsnapshot.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReviewResults({ report, fileName }) {
  const snapshots = asList(report?.snapshots);
  const deltas = asList(report?.deltas);
  const issues = asList(report?.issues);
  const duplicateCount = snapshots.reduce((sum, item) => sum + ambiguityCount(item), 0);
  const changes = deltas.reduce((sum, item) => sum + deltaCount(item), 0);

  return (
    <div className="results" aria-live="polite">
      <div className="result-lead">
        <div>
          <span>Lokale Auswertung · {fileName}</span>
          <h3>{report?.status ?? 'UNBEKANNT'}</h3>
        </div>
        <StatusPill value={report?.status} />
      </div>
      <p className="result-warning">
        Kein Gesundheitsurteil: Unterschiede sind Metadatenänderungen, keine physische Geräteerkennung.
      </p>
      <div className="metric-grid">
        <article><span>Snapshots</span><strong>{snapshots.length}</strong></article>
        <article><span>Delta-Einträge</span><strong>{changes}</strong></article>
        <article><span>Fehler/Befunde</span><strong>{issues.length}</strong></article>
        <article><span>Mehrdeutigkeiten</span><strong>{duplicateCount}</strong></article>
      </div>
      {issues.length > 0 && (
        <div className="issue-box">
          <h4>Befunde</h4>
          <ul>{issues.map((issue, index) => <li key={index}>{issueCode(issue)}</li>)}</ul>
        </div>
      )}
      {deltas.length > 0 && (
        <div className="delta-list">
          <h4>Konkrete Metadatenänderungen</h4>
          {deltas.map((delta, index) => (
            <article key={`${delta.from_sequence}-${delta.to_sequence}-${index}`}>
              <strong>Snapshot {delta.from_sequence} → {delta.to_sequence}</strong>
              <span>{deltaCount(delta)} Unterschied(e)</span>
              <small>Physische Zuordnung: {delta.physical_identity_matching ?? 'NOT_PERFORMED'}</small>
            </article>
          ))}
        </div>
      )}
      <details>
        <summary>Sicherheitsgrenzen anzeigen</summary>
        <ul>{asList(report?.limits ?? report?.safetylimits).map((limit, index) => <li key={index}>{limit}</li>)}</ul>
      </details>
    </div>
  );
}

function JournalImport() {
  const [state, setState] = useState({ phase: 'idle', report: null, error: '', fileName: '' });

  async function handleFile(event) {
    const files = event.target.files;
    const file = files?.[0];
    setState({ phase: 'idle', report: null, error: '', fileName: '' });
    if (!file || files.length !== 1) return;
    if (!file.name.toLowerCase().endsWith('.jsonl')) {
      setState({ phase: 'error', report: null, error: 'Nur eine .jsonl-Datei auswählen.', fileName: file.name });
      return;
    }
    if (file.size > MAX_JOURNAL_BYTES) {
      setState({ phase: 'error', report: null, error: 'Datei überschreitet 10 MiB.', fileName: file.name });
      return;
    }
    setState({ phase: 'reading', report: null, error: '', fileName: file.name });
    try {
      const raw = await file.text();
      const report = await Promise.resolve(analyzeJournal(raw));
      if (!report || typeof report !== 'object') throw new Error('Kein gültiger Analysebericht.');
      setState({ phase: 'done', report, error: '', fileName: file.name });
    } catch (error) {
      setState({ phase: 'error', report: null, error: error instanceof Error ? error.message : 'Analyse fehlgeschlagen.', fileName: file.name });
    }
  }

  return (
    <section className="panel import-panel" aria-labelledby="import-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lokaler Journalimport</p>
          <h2 id="import-title">Eine Aufnahme offline prüfen</h2>
        </div>
        <span className="privacy-mark">Bleibt im Browser</span>
      </div>
      <label className="file-drop">
        <span className="file-icon" aria-hidden="true">↓</span>
        <strong>JSONL auswählen</strong>
        <small>Genau eine Datei · maximal 10 MiB</small>
        <input type="file" accept=".jsonl,application/x-ndjson" onChange={handleFile} />
      </label>
      {state.phase === 'reading' && <p className="notice" role="status">Lokale Analyse läuft …</p>}
      {state.phase === 'error' && <p className="notice notice--error" role="alert">{state.error}</p>}
      {state.report && <ReviewResults report={state.report} fileName={state.fileName} />}
    </section>
  );
}

function OperatorNotes() {
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);
  const remaining = 512 - note.length;
  const downloadable = notes.length > 0;

  function addNote() {
    const value = note.trim();
    if (!value) return;
    setNotes((current) => [...current, {
      recorded_at_utc: new Date().toISOString(),
      evidence_class: 'USER_SIGNAL',
      note: value,
      device_claim: null,
    }]);
    setNote('');
  }

  function downloadNotes() {
    if (!downloadable) return;
    const documentValue = {
      schema: 'sensorium.operator-notes.v1',
      evidence_class: 'USER_SIGNAL',
      device_claims: 'NOT_PERFORMED',
      created_at_utc: new Date().toISOString(),
      notes,
    };
    const blob = new Blob([`${JSON.stringify(documentValue, null, 2)}\n`], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `sensorium-operator-notes-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <section className="panel notes-panel" aria-labelledby="notes-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Manuelle Notizen</p>
          <h2 id="notes-title">Beobachtung festhalten</h2>
        </div>
        <StatusPill value="USER_SIGNAL" />
      </div>
      <p>Separates Dokument mit Zeitstempeln. Kein WinMM-Journal und keine Gerätebehauptung.</p>
      <label htmlFor="operator-note">Notiz</label>
      <textarea
        id="operator-note"
        value={note}
        maxLength="512"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Zum Beispiel: Gerät beschriftet und manuell angeschlossen …"
      />
      <div className="note-actions">
        <span>{remaining} Zeichen</span>
        <button type="button" className="button button--secondary" onClick={addNote} disabled={!note.trim()}>Notiz übernehmen</button>
        <button type="button" className="button" onClick={downloadNotes} disabled={!downloadable}>Notizen herunterladen</button>
      </div>
      {notes.length > 0 && (
        <ol className="notes-list">
          {notes.map((item, index) => (
            <li key={`${item.recorded_at_utc}-${index}`}><time>{formatTime(item.recorded_at_utc)}</time><span>{item.note}</span></li>
          ))}
        </ol>
      )}
    </section>
  );
}

function App() {
  const gateSummary = useMemo(() => {
    const gates = asList(snapshot.gates);
    return `${gates.filter((gate) => gate.status === 'BLOCKED').length}/${gates.length || 0} Gates blockiert`;
  }, []);

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#main" aria-label="Sensorium Studio Observer – zum Inhalt">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span><strong>Sensorium</strong><small>Studio Observer</small></span>
        </a>
        <div className="top-status"><span className="pulse" aria-hidden="true" />Keine Live-Sitzung · {gateSummary}</div>
      </header>
      <main id="main">
        <section className="hero">
          <div>
            <p className="eyebrow">Offline · INVENTORY_ONLY</p>
            <h1>Was hat sich im Studio-Inventar <em>wirklich</em> geändert?</h1>
            <p>Quellstand ansehen, ein lokales Journal prüfen und Befunde für den nächsten kontrollierten Schritt sichern.</p>
          </div>
          <div className="hero-boundary">
            <span>Operational approval</span>
            <strong>NOT_GRANTED</strong>
            <small>Keine physische Erkennung · kein aktiver Zugriff</small>
          </div>
        </section>

        <nav className="steps" aria-label="Drei Schritte">
          <a href="#source-title"><b>1</b><span><strong>Lokal erfassen</strong><small>Windows-Paket verwenden</small></span></a>
          <a href="#import-title"><b>2</b><span><strong>Journal importieren</strong><small>Eine JSONL-Datei</small></span></a>
          <a href="#gates-title"><b>3</b><span><strong>Befund prüfen</strong><small>Grenzen und Owner sehen</small></span></a>
        </nav>

        <SourceSnapshot />
        <div className="work-grid">
          <JournalImport />
          <OperatorNotes />
        </div>
        <GateTable />
      </main>
      <footer>
        <span>Source snapshot only</span>
        <span>Push-Variante UNKNOWN</span>
        <span>Hardware/HIL NOT_GRANTED</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>,
);
