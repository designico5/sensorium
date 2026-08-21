import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '@sensorium/shared-protocol';

function App() {
  const [config] = useState(DEFAULT_CONFIG);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    // Simulate connection to Sensorium backend
    const timer = setTimeout(() => {
      setStatus('connected');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ padding: '2rem', minHeight: '100vh' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, background: 'linear-gradient(90deg, #61dafb, #ff6b6b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Sensorium v2
        </h1>
        <p style={{ color: '#888', marginTop: '0.5rem' }}>
          Zero-Latency Audio Engine • MIDI 2.0 • Neural Synthesis • Self-Healing
        </p>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <ConfigCard title="Audio Engine" icon="🎵">
          <ConfigRow label="Sample Rate" value={`${config.audio.sampleRate} Hz`} />
          <ConfigRow label="Block Size" value={`${config.audio.blockSize} samples`} />
          <ConfigRow label="I/O Channels" value={`${config.audio.inputChannels} in / ${config.audio.outputChannels} out`} />
        </ConfigCard>

        <ConfigCard title="MIDI 2.0" icon="🎹">
          <ConfigRow label="Groups" value={`${config.midi.maxGroups} (${config.midi.maxGroups * config.midi.maxChannelsPerGroup} channels)`} />
          <ConfigRow label="Per-Note Expression" value={config.midi.supportsPerNoteExpression ? '✅ Enabled' : '❌ Disabled'} />
          <ConfigRow label="MPE Support" value={config.midi.supportsMPE ? '✅ Enabled' : '❌ Disabled'} />
        </ConfigCard>

        <ConfigCard title="State Sync" icon="🔄">
          <ConfigRow label="Automerge" value={config.state.automergeEnabled ? '✅ Enabled' : '❌ Disabled'} />
          <ConfigRow label="Yjs (Web)" value={config.state.yjsEnabled ? '✅ Enabled' : '❌ Disabled'} />
          <ConfigRow label="WebTransport" value={config.state.webTransportUrl} />
        </ConfigCard>

        <ConfigCard title="Visual Engine" icon="🎨">
          <ConfigRow label="Canvas" value={`${config.visual.canvasWidth}×${config.visual.canvasHeight}`} />
          <ConfigRow label="Max Instances" value={`${config.visual.maxInstances.toLocaleString()}`} />
          <ConfigRow label="WebGPU" value={config.visual.useWebGPU ? '✅ Enabled' : '❌ Disabled'} />
        </ConfigCard>

        <ConfigCard title="Local AI" icon="🤖">
          <ConfigRow label="Context Length" value={`${config.ai.contextLength.toLocaleString()} tokens`} />
          <ConfigRow label="Metal" value={config.ai.useMetal ? '✅' : '❌'} />
          <ConfigRow label="WebGPU" value={config.ai.useWebGPU ? '✅' : '❌'} />
        </ConfigCard>

        <StatusCard status={status} />
      </main>
    </div>
  );
}

function ConfigCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '1.5rem',
      backdropFilter: 'blur(10px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.5rem 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    }}>
      <span style={{ color: '#aaa' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function StatusCard({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  const statusConfig = {
    connecting: { label: 'Connecting…', color: '#ffa500', bg: 'rgba(255, 165, 0, 0.1)' },
    connected: { label: 'Connected', color: '#00ff88', bg: 'rgba(0, 255, 136, 0.1)' },
    disconnected: { label: 'Disconnected', color: '#ff4444', bg: 'rgba(255, 68, 68, 0.1)' },
  }[status];

  return (
    <div style={{
      background: statusConfig.bg,
      border: `1px solid ${statusConfig.color}`,
      borderRadius: '12px',
      padding: '1.5rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
        {status === 'connected' ? '✅' : status === 'connecting' ? '⏳' : '❌'}
      </div>
      <div style={{ color: statusConfig.color, fontWeight: 600, fontSize: '1.25rem' }}>
        {statusConfig.label}
      </div>
    </div>
  );
}

export default App;