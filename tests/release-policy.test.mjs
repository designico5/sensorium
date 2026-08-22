import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('portable package ships only the renderer and hardened main process', async () => {
  const pkg = JSON.parse(await read('package.json'));

  assert.equal(pkg.main, 'electron-main.cjs');
  assert.equal(pkg.build.asar, true);
  assert.deepEqual(pkg.build.files, [
    'dist/index.html',
    'dist/assets/**',
    'electron-main.cjs',
    'package.json',
    '!dist/server.cjs',
    '!dist/**/*.map',
    '!node_modules/**',
  ]);
});

test('electron defaults to denied permissions and normal MIDI only', async () => {
  const source = await read('electron-main.cjs');

  assert.match(source, /permission === 'midi'/);
  assert.doesNotMatch(source, /midiSysex|sysex/i);
  assert.match(source, /setPermissionRequestHandler/);
  assert.match(source, /setPermissionCheckHandler/);
  assert.match(source, /contextIsolation:\s*true/);
  assert.match(source, /nodeIntegration:\s*false/);
  assert.match(source, /sandbox:\s*true/);
});

test('external navigation is restricted to the Sensorium repository', async () => {
  const source = await read('electron-main.cjs');

  assert.match(source, /TRUSTED_REPOSITORY_HOST = 'github\.com'/);
  assert.match(source, /TRUSTED_REPOSITORY_PATH = '\/designico5\/sensorium'/);
  assert.match(source, /setWindowOpenHandler/);
  assert.match(source, /will-navigate/);
  assert.match(source, /url !== rendererUrl/);
});

test('portable mode never pretends the connected AURA backend exists', async () => {
  const source = await read('src/components/AuraStudioCoach.tsx');
  const demoGuard = source.indexOf("if (!demoMode)");
  const guard = source.indexOf("if (!backendAvailable)");
  const request = source.indexOf("fetch('/api/aura-chat'");

  assert.ok(demoGuard >= 0 && request > demoGuard, 'demo guard must execute before the API request');
  assert.ok(guard >= 0 && request > guard, 'portable guard must execute before the API request');
  assert.match(source, /disabled=\{!demoMode \|\| !backendAvailable \|\| isAnalyzing\}/);
  assert.match(source, /AURA NUR IN WEB-APP/);
});

test('renderer does not manufacture fake native installer downloads', async () => {
  const source = await read('src/App.tsx');

  assert.doesNotMatch(source, /a\.download\s*=\s*['"][^'"]+\.(?:dmg|ipa|ipk|apk|exe|vst3|zip)['"]/i);
  assert.doesNotMatch(source, /requestMIDIAccess\(\{\s*sysex:\s*true/);
  assert.doesNotMatch(source, /output\.send\s*\(/);
});

test('stage mode starts fail-closed and all synthetic device behavior is behind the demo mode', async () => {
  const source = await read('src/App.tsx');
  const stageView = await read('src/components/StageReadinessView.tsx');
  const coach = await read('src/components/AuraStudioCoach.tsx');
  const calibration = source.slice(
    source.indexOf('const runFullSystemCalibration'),
    source.indexOf('// Custom interactive states'),
  );
  const midiScan = source.slice(
    source.indexOf('const scanWebMidiHardware'),
    source.indexOf('const loadDemoDevices'),
  );
  const demoWizard = source.slice(
    source.indexOf('const playSimSound'),
    source.indexOf('const handleDownloadAndroidSetup'),
  );

  assert.match(source, /useState<'STAGE' \| 'DEMO'>\('STAGE'\)/);
  assert.match(source, /demoMode \? 'Demo beenden' : 'Demo starten'/);
  assert.match(source, /Demo-Modus — kein MIDI-, Geräte- oder Firmware-I\/O/);
  assert.match(source, /setupCompleted && demoMode/);
  assert.match(source, /!demoMode \? \(\s*<StageReadinessView/);
  assert.match(source, /demoMode && showMindmapOverlay/);
  assert.match(source, /demoMode && \(\s*<LazyVolumetricFrequencyCloudBg/);
  assert.match(source, /demoMode && setupCompleted && showAuraCoach/);
  assert.match(source, /demoMode && \(\s*<LazyVintageDeviceLibraryModal/);
  assert.match(source, /demoMode && \(\s*<>\s*<button\s*onClick=\{\(\) => \{\s*setIsPlaying/);
  assert.match(source, /OSC: <strong[^>]*>\{demoMode \? 'DEMO' : 'AUS'\}/);
  assert.match(source, /'NICHT BESTÄTIGT'/);
  assert.match(source, /stageSessionRef\.current = \{ bpm, logs \}/);
assert.match(source, /runtimeEpochRef\.current \+= 1/);
assert.match(source, /const midiScanSequenceRef = useRef\(0\)/);
assert.match(source, /const midiScanInFlightRef = useRef\(false\)/);
assert.match(source, /const midiScanQueuedEpochRef = useRef<number \| null>\(null\)/);
assert.match(source, /const midiScanQueuedResolversRef = useRef<Array<\(\) => void>>\(\[\]\)/);
assert.match(source, /closeMidiAccess\(\)/);
  assert.match(source, /audioCtxRef\.current\?\.state === 'running'/);
  assert.match(midiScan, /if \(demoModeRef\.current\)/);
assert.match(midiScan, /demoModeRef\.current \|\| scanEpoch !== runtimeEpochRef\.current/);
assert.match(midiScan, /scanSequence !== midiScanSequenceRef\.current/);
assert.match(midiScan, /if \(midiScanInFlightRef\.current\)/);
assert.match(midiScan, /queuedEpoch === runtimeEpochRef\.current/);
assert.match(midiScan, /scanWebMidiHardware\(\)\.finally\(\(\) => queuedResolvers\.forEach/);
assert.match(
  midiScan,
  /catch \(err: any\) \{[\s\S]*?scanSequence !== midiScanSequenceRef\.current[\s\S]*?setWebMidiStatus/,
);
  assert.match(midiScan, /connectionType: 'OS_MIDI_ENDPOINT'/);
  assert.doesNotMatch(midiScan, /playMidiAudioNote/);
  assert.doesNotMatch(calibration, /playMidiAudioNote/);
  assert.match(source, /calibrationRunRef\.current \+= 1/);
  assert.match(source, /onKeyDown=\{handleCalibrationDialogKeyDown\}/);
  assert.match(source, /Prüfung abbrechen/);
  assert.match(demoWizard, /if \(!demoModeRef\.current/);
  assert.match(demoWizard, /wizardEpoch === runtimeEpochRef\.current/);
  assert.match(demoWizard, /wizardIntervalRef\.current/);
  assert.match(demoWizard, /audioCtxRef\.current = new AudioContextClass/);
  assert.doesNotMatch(demoWizard, /const ctx = new AudioContextClass/);
  assert.doesNotMatch(demoWizard, /navigator\.clipboard\.writeText/);
  assert.match(source, /if \(!demoMode \|\| !isPlaying \|\| devices\.length === 0\) return/);
  assert.match(source, /demoMode && visiblePanels\.simulator/);
  assert.match(source, /demoMode && inspectorTab === 'firmware'/);
  assert.match(stageView, /OS-Endpunkte\. Beobachtete Ereignisse\. Keine Simulation\./);
  assert.match(stageView, /Keine synthetischen Messwerte/);
  assert.match(stageView, /aria-live="polite"/);
  assert.doesNotMatch(stageView, /Math\.random|setInterval|VIRTUAL_SIMULATION.*map/);
  assert.match(coach, /if \(!demoMode\)/);
  assert.doesNotMatch(source, /new EventSource\s*\(/);
});

test('AURA is guarded, advisory-only, concurrency-limited, and loopback-bound', async () => {
  const server = await read('server.ts');

  assert.match(server, /inspectUntrustedPrompt\(req\.body\.message\)/);
  assert.match(server, /boundary: 'ADVISORY_ONLY'/);
  assert.match(server, /MAX_CONCURRENT_AURA_REQUESTS = 2/);
  assert.match(server, /AURA_TIMEOUT_MS = 12_000/);
  assert.match(server, /ENABLE_SOURCE_EXPORT/);
  assert.match(server, /app\.listen\(PORT, "127\.0\.0\.1"/);
});

test('legacy Windows helpers never weaken Defender, open the firewall, auto-install, or kill port owners', async () => {
  const scripts = await Promise.all([
    read('START_STANDALONE.bat'),
    read('Sensorium_SelfHealing_Windows_Builder.bat'),
    read('Sensorium_ZeroImpact_Setup.bat'),
    read('Sensorium_Win11_Doctor.ps1'),
    read('build-windows-exe.bat'),
  ]);
  const source = scripts.join('\n');

  assert.doesNotMatch(source, /Add-MpPreference|Set-MpPreference|netsh\s+advfirewall|taskkill\s+\/f|winget\s+install|npm\s+install\s+--no-audit/i);
});

test('active Android CTA points to the real allowlisted preview asset', async () => {
  const source = await read('src/App.tsx');

  assert.match(source, /https:\/\/github\.com\/designico5\/sensorium\/releases\/download\/v2\.5\.0-preview\.1\/MA-II-MI-0\.1\.0-Android-debug\.apk/);
  assert.doesNotMatch(source, /setShowApkWarningModal\(true\)/);
});

test('unsafe setup and non-portable launcher generators are unreachable in production', async () => {
  const source = await read('src/App.tsx');
  assert.doesNotMatch(source, /onClick=\{handleDownloadZeroImpactSetup\}/);
  assert.doesNotMatch(source, /onClick=\{handleDownloadMacOSHTMLWebLauncher\}/);

  const assetNames = await readdir(new URL('../dist/assets/', import.meta.url));
  const scripts = await Promise.all(
    assetNames.filter((name) => name.endsWith('.js')).map((name) => read(`dist/assets/${name}`)),
  );
  const productionSource = scripts.join('\n');
  assert.doesNotMatch(productionSource, /Sensorium_ZeroImpact_Setup\.bat|taskkill \/f \/pid|Access-Control-Allow-Origin|Sensorium_macOS_BrowserApp\.html/i);
});

test('renderer has a restrictive content security policy', async () => {
  const html = await read('index.html');

  assert.match(html, /Content-Security-Policy/i);
  assert.match(html, /default-src 'self'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /frame-ancestors 'none'/);
});
