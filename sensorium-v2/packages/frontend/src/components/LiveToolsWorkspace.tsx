import { useEffect, useRef } from 'react';
import {
  Broadcast,
  CheckCircle,
  ClockCountdown,
  Gauge,
  MicrophoneStage,
  Pause,
  Play,
  SlidersHorizontal,
  Waveform,
} from '@phosphor-icons/react';
import { motion } from 'motion/react';
import {
  CountdownDisplay,
  LatencyDisplay,
  LufsMeterDisplay,
  MixHealthBadge,
  useCountdown,
  useLufsMeter,
  useRoundTripLatency,
  useTalkback,
  useVisualMixHealth,
} from '../lib/joyFeatures';
import { useAudioStore } from '../store';

const COUNTDOWN_PRESETS = [30, 60, 120, 300];

export default function LiveToolsWorkspace() {
  const transport = useAudioStore((state) => state.transport);
  const lufs = useLufsMeter();
  const latency = useRoundTripLatency();
  const talkback = useTalkback();
  const mix = useVisualMixHealth();
  const countdown = useCountdown();
  const tickRef = useRef(0);

  useEffect(() => {
    if (transport !== 'playing' && transport !== 'recording') return;

    const timer = window.setInterval(() => {
      tickRef.current += 1;
      const phase = tickRef.current * 0.19;
      const amplitude = 0.19 + Math.sin(phase * 0.33) * 0.035;
      const samples = Array.from({ length: 256 }, (_, index) => (
        Math.sin(index * 0.17 + phase) * amplitude
        + Math.sin(index * 0.041 - phase * 0.7) * amplitude * 0.27
      ));

      lufs.update(samples);
      latency.update(3.2 + Math.sin(phase * 0.21) * 0.55 + Math.sin(phase) * 0.12);
      mix.update({
        peakLevel: 0.52 + Math.sin(phase * 0.43) * 0.08,
        rmsLevel: 0.16 + Math.sin(phase * 0.31) * 0.025,
        leftRightBalance: Math.sin(phase * 0.17) * 0.08,
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [latency.update, lufs.update, mix.update, transport]);

  return (
    <section className="live-tools" aria-labelledby="live-tools-title">
      <header className="live-tools__hero">
        <div>
          <span>DEMO UTILITY LAYER</span>
          <h2 id="live-tools-title">Live tools, one reach away.</h2>
          <p>Fast production helpers on synthetic data. No microphone, audio device, MIDI port or network output is opened.</p>
        </div>
        <div className="live-tools__truth" role="status">
          <CheckCircle weight="fill" />
          <span><strong>ISOLATED DEMO</strong><small>NO PHYSICAL I/O</small></span>
        </div>
      </header>

      <div className="live-tools__grid">
        <article className="live-tool-card live-tool-card--meter">
          <div className="live-tool-card__heading">
            <span><Waveform weight="duotone" /> LOUDNESS</span>
            <em>SYNTHETIC SIGNAL</em>
          </div>
          <div className="live-tool-card__body live-tool-card__body--meter">
            <LufsMeterDisplay
              momentary={lufs.momentary}
              shortTerm={lufs.shortTerm}
              integrated={lufs.integrated}
              compliance={lufs.compliance}
            />
            <div className="live-tool-card__reading">
              <strong>{Number.isFinite(lufs.truePeak) ? lufs.truePeak.toFixed(1) : '−∞'}</strong>
              <span>dBTP model</span>
            </div>
          </div>
          <button type="button" className="live-tools__secondary" onClick={lufs.reset}>RESET MODEL</button>
        </article>

        <article className="live-tool-card">
          <div className="live-tool-card__heading">
            <span><Gauge weight="duotone" /> ROUND TRIP</span>
            <em>SIMULATED</em>
          </div>
          <div className="live-tool-card__center">
            <LatencyDisplay latencyMs={latency.latencyMs} jitterMs={latency.jitterMs} status={latency.status} />
            <strong>{latency.avgLatency.toFixed(2)} ms</strong>
            <small>model average · no driver readback</small>
          </div>
        </article>

        <article className="live-tool-card live-tool-card--talkback">
          <div className="live-tool-card__heading">
            <span><MicrophoneStage weight="duotone" /> TALKBACK</span>
            <em>ROUTING MODEL</em>
          </div>
          <motion.button
            type="button"
            className={`talkback-sim ${talkback.isActive ? 'is-active' : ''}`}
            whileTap={{ scale: 0.97 }}
            onClick={talkback.toggle}
            aria-pressed={talkback.isActive}
          >
            <MicrophoneStage weight={talkback.isActive ? 'fill' : 'bold'} />
            <span><strong>{talkback.isActive ? 'TALKBACK MODEL ON' : 'HOLD SPACE FOR TALKBACK'}</strong><small>No microphone permission requested</small></span>
          </motion.button>
          <div className="talkback-settings">
            <label>
              <span>Target bus</span>
              <select value={talkback.targetBus} onChange={(event) => talkback.setTargetBus(event.target.value)}>
                <option value="main">Main</option>
                <option value="monitors">Monitors</option>
                <option value="artist">Artist IEM</option>
                <option value="crew">Crew</option>
              </select>
            </label>
            <label>
              <span>Dim model {Math.round(talkback.dimLevel * 100)}%</span>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.05"
                value={talkback.dimLevel}
                onChange={(event) => talkback.setDimLevel(Number(event.target.value))}
              />
            </label>
          </div>
        </article>

        <article className="live-tool-card">
          <div className="live-tool-card__heading">
            <span><SlidersHorizontal weight="duotone" /> MIX HEALTH</span>
            <em>MODEL ONLY</em>
          </div>
          <div className="live-tool-card__center">
            <MixHealthBadge health={mix.health} />
            <strong>{mix.health.headroom.toFixed(1)} dB</strong>
            <small>headroom model · {mix.health.dynamicRange.toFixed(1)} dB dynamic range</small>
          </div>
        </article>

        <article className="live-tool-card live-tool-card--countdown">
          <div className="live-tool-card__heading">
            <span><ClockCountdown weight="duotone" /> CHANGEOVER</span>
            <em>LOCAL TIMER</em>
          </div>
          <div className="countdown-layout">
            <CountdownDisplay remaining={countdown.remaining} progress={countdown.progress} isUrgent={countdown.isUrgent} />
            <div className="countdown-presets" aria-label="Countdown presets">
              {COUNTDOWN_PRESETS.map((seconds) => (
                <button type="button" key={seconds} onClick={() => countdown.start(seconds)}>
                  {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                </button>
              ))}
            </div>
          </div>
          <div className="countdown-actions">
            <button type="button" onClick={countdown.isRunning ? countdown.pause : countdown.resume} disabled={!countdown.totalSeconds}>
              {countdown.isRunning ? <Pause weight="fill" /> : <Play weight="fill" />}
              {countdown.isRunning ? 'PAUSE' : 'RESUME'}
            </button>
            <button type="button" onClick={countdown.reset} disabled={!countdown.totalSeconds}>RESET</button>
          </div>
        </article>

        <article className="live-tool-card live-tool-card--shortcuts">
          <div className="live-tool-card__heading">
            <span><Broadcast weight="duotone" /> FAST ACCESS</span>
            <em>KEYBOARD + TOUCH</em>
          </div>
          <dl className="shortcut-list">
            <div><dt>Quick actions</dt><dd>Ctrl K</dd></div>
            <div><dt>Navigate tools</dt><dd>Touch</dd></div>
            <div><dt>Emergency stop</dt><dd>2-step</dd></div>
            <div><dt>Structural edits</dt><dd>Show lock</dd></div>
          </dl>
        </article>
      </div>
    </section>
  );
}
