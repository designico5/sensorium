import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
const workspaceSource = readFileSync(new URL('./components/PerformanceWorkspace.tsx', import.meta.url), 'utf8');
const liveToolsSource = readFileSync(new URL('./components/LiveToolsWorkspace.tsx', import.meta.url), 'utf8');
const interactionsSource = readFileSync(new URL('./lib/interactions.tsx', import.meta.url), 'utf8');

describe('stage and demo truth boundary', () => {
  it('opens the complete simulation workspace while retaining an explicit stage boundary', () => {
    expect(appSource).toContain('const [demoMode, setDemoMode] = useState(true)');
    expect(appSource).toContain('!demoMode ? (');
    expect(appSource).toContain('<StageReadiness onStartDemo={() => setDemoMode(true)} />');
    expect(appSource).toContain('<div className="performance-app">');
  });

  it('keeps physical readiness unverified and exposes an explicit demo exit', () => {
    expect(appSource).toContain('Keine Simulation im Stage-Modus.');
    expect(appSource).toContain("state: 'UNVERIFIZIERT'");
    expect(appSource).toContain("state: 'FAIL-CLOSED'");
    expect(appSource).toContain('onExitDemo={exitDemo}');
    expect(appSource).toContain('DEMO VERLASSEN');
  });

  it('never labels model data as verified show truth', () => {
    expect(workspaceSource).toContain('Demo model active. No physical show system has been verified.');
    expect(workspaceSource).toContain('simulated stem model · no hardware readback');
    expect(workspaceSource).not.toContain('All show systems are verified.');
    expect(workspaceSource).not.toContain('all stems verified');
  });

  it('exposes every implemented V2 workspace from the current performance shell', () => {
    for (const workspace of [
      'perform', 'sections', 'mix', 'macros', 'visual', 'mindmap',
      'acoustic', 'stadium', 'instinct', 'production', 'tools', 'ai', 'system',
    ]) {
      expect(appSource).toContain(`id: '${workspace}'`);
    }
    for (const component of [
      'SpatialMindmap', 'AudiophileAcousticLab', 'Spatial5DStadium',
      'QuantumInstinctMatrix', 'IndustrialProductionSuite', 'LiveToolsWorkspace', 'AiPanel',
    ]) {
      expect(appSource).toContain(`<${component}`);
    }
  });

  it('keeps live utilities synthetic and free of physical browser I/O', () => {
    expect(liveToolsSource).toContain('NO PHYSICAL I/O');
    expect(liveToolsSource).toContain('SYNTHETIC SIGNAL');
    expect(liveToolsSource).toContain('No microphone permission requested');
    for (const physicalApi of [
      'requestMIDIAccess', 'AudioContext', 'getUserMedia', 'WebSocket',
      'WebTransport', 'navigator.usb', 'navigator.hid', 'navigator.serial',
    ]) {
      expect(liveToolsSource).not.toContain(physicalApi);
    }
  });

  it('keeps the quick-action modal keyboard-contained and restores focus', () => {
    expect(appSource).toContain("if (event.key === 'Escape')");
    expect(appSource).toContain("if (event.key !== 'Tab') return;");
    expect(appSource).toContain('last.focus()');
    expect(appSource).toContain('first.focus()');
    expect(appSource).toContain('returnFocusRef.current?.focus()');
  });

  it('ends rotary drags on pointer cancel and lost capture', () => {
    expect(interactionsSource).toContain('onPointerCancel: endDrag');
    expect(interactionsSource).toContain('onLostPointerCapture: endDrag');
    expect(interactionsSource).toContain('releasePointerCapture');
  });
});
