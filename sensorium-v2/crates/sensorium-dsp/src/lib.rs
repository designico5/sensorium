//! sensorium-dsp — Digital Signal Processing Engine
//!
//! Core DSP graph engine built on fundsp for sample-accurate audio processing.
//! Provides a topologically-sorted DAG of DSP nodes with support for
//! real-time parameter modulation and zero-allocation audio callbacks.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use tracing::info;
use std::collections::{HashMap, VecDeque};

/// DSP node identifier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DspNodeId(pub u32);

/// DSP node type enumeration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DspNodeType {
    /// Audio input source.
    Input,
    /// Audio output sink.
    Output,
    /// Gain node.
    Gain,
    /// Filter node (lowpass, highpass, bandpass).
    Filter,
    /// Delay line.
    Delay,
    /// Reverb effect.
    Reverb,
    /// Compressor dynamics processor.
    Compressor,
    /// FFT analyzer.
    Analyzer,
    /// Custom user-defined node.
    Custom,
}

/// DSP node configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DspNodeConfig {
    pub id: DspNodeId,
    pub node_type: DspNodeType,
    pub params: Vec<(String, f64)>,
}

/// Connection between two DSP nodes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct DspConnection {
    pub from: DspNodeId,
    pub to: DspNodeId,
    pub from_port: usize,
    pub to_port: usize,
}

/// The DSP processing graph.
pub struct DspGraph {
    nodes: Vec<DspNodeConfig>,
    connections: Vec<DspConnection>,
    sample_rate: f64,
    buffer_size: usize,
    /// Cached topological order (invalidated on graph mutation).
    sorted_nodes: Vec<usize>,
    /// Whether the topological sort needs recomputation.
    sort_dirty: bool,
}

impl DspGraph {
    /// Returns the configured buffer size.
    pub fn buffer_size(&self) -> usize {
        self.buffer_size
    }

    /// Create a new empty DSP graph.
    pub fn new(sample_rate: f64, buffer_size: usize) -> Self {
        info!(sample_rate, buffer_size, "DSP graph created");
        Self {
            nodes: Vec::new(),
            connections: Vec::new(),
            sample_rate,
            buffer_size,
            sorted_nodes: Vec::new(),
            sort_dirty: true,
        }
    }

    /// Add a node to the graph.
    pub fn add_node(&mut self, config: DspNodeConfig) -> DspNodeId {
        let id = config.id;
        self.nodes.push(config);
        self.mark_dirty();
        id
    }

    /// Connect two nodes.
    pub fn connect(&mut self, from: DspNodeId, to: DspNodeId, from_port: usize, to_port: usize) {
        self.connections.push(DspConnection {
            from,
            to,
            from_port,
            to_port,
        });
        self.mark_dirty();
    }

    /// Process a buffer of audio samples through the graph.
    ///
    /// Uses Kahn's algorithm for topological sorting to determine
    /// processing order. Zero-allocation: reuses the internal
    /// sorted_nodes cache, invalidated only when the graph changes.
    pub fn process(&mut self, buffer: &mut [f32]) -> Result<()> {
        // Lazily compute or reuse topological order
        if self.sort_dirty {
            self.recompute_topological_order();
            self.sort_dirty = false;
        }

        // Process each node in topological order
        for &node_idx in &self.sorted_nodes {
            let _config = &self.nodes[node_idx];
            // Apply per-node gain (unity for now; in production: fundsp DSP)
            match _config.node_type {
                DspNodeType::Gain => {
                    let gain = _config.params.iter()
                        .find(|(k, _)| k == "gain_db")
                        .map(|(_, v)| 10.0f32.powf(*v as f32 / 20.0))
                        .unwrap_or(1.0);
                    for s in buffer.iter_mut() {
                        *s *= gain;
                    }
                }
                DspNodeType::Input | DspNodeType::Output => {
                    // Pass-through — no processing
                }
                _ => {
                    // Filter, Delay, Reverb, Compressor, Analyzer, Custom:
                    // In production: delegate to fundsp node
                }
            }
        }
        Ok(())
    }

    /// Mark the topological sort as dirty (called on graph mutation).
    fn mark_dirty(&mut self) {
        self.sort_dirty = true;
    }

    /// Kahn's algorithm for topological sort.
    fn recompute_topological_order(&mut self) {
        let n = self.nodes.len();
        let mut in_degree = vec![0usize; n];
        let mut adj: Vec<Vec<usize>> = vec![Vec::new(); n];

        // Build adjacency from node indices
        let id_to_idx: HashMap<u32, usize> = self.nodes.iter().enumerate()
            .map(|(i, c)| (c.id.0, i))
            .collect();

        for conn in &self.connections {
            if let (Some(&from_idx), Some(&to_idx)) = (id_to_idx.get(&conn.from.0), id_to_idx.get(&conn.to.0)) {
                adj[from_idx].push(to_idx);
                in_degree[to_idx] += 1;
            }
        }

        let mut queue: VecDeque<usize> = VecDeque::new();
        for i in 0..n {
            if in_degree[i] == 0 {
                queue.push_back(i);
            }
        }

        self.sorted_nodes.clear();
        while let Some(node) = queue.pop_front() {
            self.sorted_nodes.push(node);
            for &next in &adj[node] {
                in_degree[next] -= 1;
                if in_degree[next] == 0 {
                    queue.push_back(next);
                }
            }
        }
    }

    /// Returns the number of nodes in the graph.
    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    /// Returns the number of connections in the graph.
    pub fn connection_count(&self) -> usize {
        self.connections.len()
    }

    /// Returns the sample rate.
    pub fn sample_rate(&self) -> f64 {
        self.sample_rate
    }
}

// ── Memory Pool Arena (M6) ─────────────────────────────────────────

/// Zero-allocation memory arena for real-time DSP processing.
///
/// Uses bumpalo's arena allocator to provide scratch memory for
/// audio processing without heap allocation during the real-time
/// callback. The arena is reset once per audio block.
///
/// # Safety
///
/// The arena must be reset (`begin_frame`) before each audio block
/// to prevent unbounded growth. All allocations within a frame are
/// freed together when the arena is reset.
pub struct DspArena {
    arena: bumpalo::Bump,
    peak_usage: usize,
    frame_count: u64,
}

impl DspArena {
    /// Create a new arena with the given initial capacity in bytes.
    ///
    /// Typical usage: 4096–65536 bytes depending on graph complexity.
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            arena: bumpalo::Bump::with_capacity(capacity),
            peak_usage: 0,
            frame_count: 0,
        }
    }

    /// Begin a new processing frame. Resets the arena to zero usage.
    ///
    /// MUST be called at the start of each audio block before any
    /// allocations. This is the "zero-alloc" pattern: allocate from
    /// the arena during processing, then reset for the next frame.
    pub fn begin_frame(&mut self) {
        // Safety: reset() is safe because we only allocate Pod types
        // and don't hold references across frames.
        self.arena.reset();
        self.frame_count += 1;
    }

    /// Allocate a slice of f32 from the arena (zero-initialized).
    ///
    /// Returns a mutable slice that lives until the next `begin_frame()`.
    pub fn alloc_f32_slice(&mut self, len: usize) -> &mut [f32] {
        let slice = self.arena.alloc_slice_fill_copy(len, 0.0f32);
        let current = self.arena.allocated_bytes();
        if current > self.peak_usage {
            self.peak_usage = current;
        }
        slice
    }

    /// Allocate a value in the arena.
    pub fn alloc<T>(&mut self, val: T) -> &mut T {
        let r = self.arena.alloc(val);
        let current = self.arena.allocated_bytes();
        if current > self.peak_usage {
            self.peak_usage = current;
        }
        r
    }

    /// Returns the peak memory usage in bytes.
    pub fn peak_usage(&self) -> usize {
        self.peak_usage
    }

    /// Returns the number of frames processed.
    pub fn frame_count(&self) -> u64 {
        self.frame_count
    }

    /// Returns the current arena allocation in bytes.
    pub fn current_bytes(&self) -> usize {
        self.arena.allocated_bytes()
    }
}

// ── Musical Time Engine (M1) ─────────────────────────────────────────

/// Transport state machine.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TransportState {
    Stopped,
    Playing,
    Recording,
    Paused,
}

impl Default for TransportState {
    fn default() -> Self {
        TransportState::Stopped
    }
}

/// Musical time signature.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct TimeSignature {
    pub numerator: u32,
    pub denominator: u32,
}

impl Default for TimeSignature {
    fn default() -> Self {
        Self { numerator: 4, denominator: 4 }
    }
}

impl TimeSignature {
    pub fn new(numerator: u32, denominator: u32) -> Self {
        assert!(numerator > 0 && denominator > 0, "Time signature values must be positive");
        Self { numerator, denominator }
    }

    /// Ticks per beat (PPQN — pulses per quarter note).
    pub fn ticks_per_beat(&self) -> u32 {
        480 // Industry standard PPQN
    }

    /// Ticks per bar.
    pub fn ticks_per_bar(&self) -> u32 {
        self.ticks_per_beat() * self.numerator
    }
}

/// Tempo in BPM with optional smooth ramping.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Tempo {
    bpm: f64,
    target_bpm: f64,
    ramp_samples: u64,
    ramp_counter: u64,
}

impl Tempo {
    pub fn new(bpm: f64) -> Self {
        Self { bpm, target_bpm: bpm, ramp_samples: 0, ramp_counter: 0 }
    }

    pub fn bpm(&self) -> f64 { self.bpm }

    /// Set tempo with immediate effect.
    pub fn set_bpm(&mut self, bpm: f64) {
        self.bpm = bpm.clamp(20.0, 999.0);
        self.target_bpm = self.bpm;
        self.ramp_samples = 0;
        self.ramp_counter = 0;
    }

    /// Set tempo with smooth ramp over the given number of samples.
    pub fn ramp_to(&mut self, target: f64, ramp_samples: u64) {
        self.target_bpm = target.clamp(20.0, 999.0);
        self.ramp_samples = ramp_samples;
        self.ramp_counter = 0;
    }

    /// Advance tempo ramp by one sample. Returns current BPM.
    pub fn tick(&mut self) -> f64 {
        if self.ramp_counter < self.ramp_samples && self.ramp_samples > 0 {
            let t = self.ramp_counter as f64 / self.ramp_samples as f64;
            self.bpm += (self.target_bpm - self.bpm) * t.min(1.0);
            self.ramp_counter += 1;
            if self.ramp_counter >= self.ramp_samples {
                self.bpm = self.target_bpm;
            }
        }
        self.bpm
    }

    /// Samples per beat at the given sample rate.
    pub fn samples_per_beat(&self, sample_rate: f64) -> f64 {
        60.0 * sample_rate / self.bpm
    }

    /// Samples per bar at the given sample rate and time signature.
    pub fn samples_per_bar(&self, sample_rate: f64, ts: TimeSignature) -> f64 {
        self.samples_per_beat(sample_rate) * ts.numerator as f64
    }
}

/// Sample-accurate musical position.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct MusicalPosition {
    /// Absolute sample position.
    pub sample_pos: u64,
    /// Current bar (0-indexed).
    pub bar: u32,
    /// Current beat within bar (0-indexed).
    pub beat: u32,
    /// Current tick within beat (0..PPQN).
    pub tick: u32,
}

impl MusicalPosition {
    /// Compute musical position from sample count, tempo, time signature, and sample rate.
    pub fn from_samples(sample_pos: u64, tempo: &Tempo, ts: &TimeSignature, sample_rate: f64) -> Self {
        let samples_per_beat = tempo.samples_per_beat(sample_rate);
        let total_beats = sample_pos as f64 / samples_per_beat;
        let beats_per_bar = ts.numerator as f64;
        let bar = (total_beats / beats_per_bar) as u32;
        let beat_in_bar = ((total_beats % beats_per_bar) as u32).min(ts.numerator - 1);
        let fractional_beat = total_beats - total_beats.floor();
        let tick = (fractional_beat * ts.ticks_per_beat() as f64) as u32;
        Self { sample_pos, bar, beat: beat_in_bar, tick }
    }
}

/// Loop range in musical time.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct LoopRange {
    pub start_sample: u64,
    pub end_sample: u64,
    pub enabled: bool,
}

impl Default for LoopRange {
    fn default() -> Self {
        Self { start_sample: 0, end_sample: 0, enabled: false }
    }
}

/// The Musical Time Engine — sample-accurate transport with tempo, time signature,
/// position tracking, and loop control.
pub struct Transport {
    state: TransportState,
    tempo: Tempo,
    time_signature: TimeSignature,
    sample_pos: u64,
    sample_rate: f64,
    loop_range: LoopRange,
}

impl Transport {
    pub fn new(sample_rate: f64) -> Self {
        Self {
            state: TransportState::Stopped,
            tempo: Tempo::new(120.0),
            time_signature: TimeSignature::default(),
            sample_pos: 0,
            sample_rate,
            loop_range: LoopRange::default(),
        }
    }

    pub fn state(&self) -> TransportState { self.state }
    pub fn tempo(&self) -> &Tempo { &self.tempo }
    pub fn time_signature(&self) -> &TimeSignature { &self.time_signature }
    pub fn sample_rate(&self) -> f64 { self.sample_rate }
    pub fn sample_pos(&self) -> u64 { self.sample_pos }

    pub fn set_tempo(&mut self, bpm: f64) { self.tempo.set_bpm(bpm); }
    pub fn ramp_tempo(&mut self, target: f64, ramp_samples: u64) { self.tempo.ramp_to(target, ramp_samples); }

    pub fn set_time_signature(&mut self, ts: TimeSignature) { self.time_signature = ts; }

    pub fn set_loop(&mut self, start: u64, end: u64) {
        self.loop_range = LoopRange { start_sample: start, end_sample: end, enabled: true };
    }

    pub fn disable_loop(&mut self) { self.loop_range.enabled = false; }

    pub fn play(&mut self) { self.state = TransportState::Playing; }
    pub fn stop(&mut self) {
        self.state = TransportState::Stopped;
        self.sample_pos = 0;
    }
    pub fn pause(&mut self) { self.state = TransportState::Paused; }
    pub fn record(&mut self) { self.state = TransportState::Recording; }

    /// Seek to an absolute sample position.
    pub fn seek(&mut self, sample: u64) { self.sample_pos = sample; }

    /// Seek to a musical position (bar, beat, tick).
    pub fn seek_musical(&mut self, bar: u32, beat: u32, tick: u32) {
        let beats_per_bar = self.time_signature.numerator as f64;
        let total_beats = bar as f64 * beats_per_bar + beat as f64
            + tick as f64 / self.time_signature.ticks_per_beat() as f64;
        let samples_per_beat = self.tempo.samples_per_beat(self.sample_rate);
        self.sample_pos = (total_beats * samples_per_beat) as u64;
    }

    /// Current musical position.
    pub fn position(&self) -> MusicalPosition {
        MusicalPosition::from_samples(self.sample_pos, &self.tempo, &self.time_signature, self.sample_rate)
    }

    /// Advance transport by `buffer_size` samples. Handles loop wrapping.
    /// Returns the updated position.
    pub fn advance(&mut self, buffer_size: u32) -> MusicalPosition {
        if self.state == TransportState::Playing || self.state == TransportState::Recording {
            // Advance tempo ramp
            for _ in 0..buffer_size {
                self.tempo.tick();
            }
            self.sample_pos += buffer_size as u64;

            // Loop wrapping
            if self.loop_range.enabled && self.sample_pos >= self.loop_range.end_sample {
                self.sample_pos = self.loop_range.start_sample
                    + (self.sample_pos - self.loop_range.end_sample);
            }
        }
        self.position()
    }

    /// Returns true if the transport is actively advancing audio.
    pub fn is_running(&self) -> bool {
        matches!(self.state, TransportState::Playing | TransportState::Recording)
    }

    /// Returns the current position as beats (f64).
    pub fn position_in_beats(&self) -> f64 {
        self.sample_pos as f64 / self.tempo.samples_per_beat(self.sample_rate)
    }

    /// Returns the current position as bars (f64).
    pub fn position_in_bars(&self) -> f64 {
        self.position_in_beats() / self.time_signature.numerator as f64
    }
}

impl Default for Transport {
    fn default() -> Self {
        Self::new(44100.0)
    }
}

// ── Modulation Matrix (M4) ─────────────────────────────────────────

/// Modulation source types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ModSource {
    Lfo(u8),
    Envelope(u8),
    Velocity,
    Aftertouch,
    PitchBend,
    ModWheel,
    Custom(u8),
}

/// Modulation destination types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ModDestination {
    Gain,
    FilterCutoff,
    FilterResonance,
    Pan,
    Send(u8),
    LfoRate(u8),
    Pitch,
    Custom(u8),
}

/// A single modulation routing.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ModRouting {
    pub source: ModSource,
    pub destination: ModDestination,
    pub amount: f32,
    pub enabled: bool,
}

/// LFO waveform types.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LfoWaveform {
    Sine,
    Triangle,
    Square,
    Saw,
    Random,
}

/// LFO configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LfoConfig {
    pub waveform: LfoWaveform,
    pub rate_hz: f32,
    pub depth: f32,
    pub phase: f32,
    phase_acc: f32,
    sample_rate: f32,
    last_value: f32,
}

impl LfoConfig {
    pub fn new(rate_hz: f32, waveform: LfoWaveform) -> Self {
        Self {
            waveform,
            rate_hz,
            depth: 1.0,
            phase: 0.0,
            phase_acc: 0.0,
            sample_rate: 44100.0,
            last_value: 0.0,
        }
    }

    pub fn set_sample_rate(&mut self, sr: f32) { self.sample_rate = sr; }

    /// Generate the next LFO sample.
    pub fn tick(&mut self) -> f32 {
        let phase_inc = self.rate_hz / self.sample_rate;
        self.phase_acc += phase_inc;
        if self.phase_acc >= 1.0 {
            self.phase_acc -= 1.0;
        }
        let phase = self.phase_acc + self.phase;
        let phase = if phase >= 1.0 { phase - 1.0 } else { phase };

        let raw = match self.waveform {
            LfoWaveform::Sine => (phase * std::f32::consts::TAU).sin(),
            LfoWaveform::Triangle => {
                if phase < 0.5 { 4.0 * phase - 1.0 } else { 3.0 - 4.0 * phase }
            }
            LfoWaveform::Square => if phase < 0.5 { 1.0 } else { -1.0 },
            LfoWaveform::Saw => 2.0 * phase - 1.0,
            LfoWaveform::Random => {
                // Simple pseudo-random: hash the phase
                let h = (phase * 1000.0) as i32;
                ((h.wrapping_mul(1103515245).wrapping_add(12345) >> 16) & 0x7fff) as f32 / 16383.5 - 1.0
            }
        };
        self.last_value = raw * self.depth;
        self.last_value
    }

    pub fn last_value(&self) -> f32 { self.last_value }
}

impl Default for LfoConfig {
    fn default() -> Self {
        Self::new(1.0, LfoWaveform::Sine)
    }
}

/// The Modulation Matrix — routes modulation sources to destinations.
pub struct ModMatrix {
    routings: Vec<ModRouting>,
    lfos: Vec<LfoConfig>,
    source_values: HashMap<ModSource, f32>,
}

impl ModMatrix {
    pub fn new(num_lfos: usize) -> Self {
        let lfos = (0..num_lfos).map(|i| LfoConfig::new(1.0 + i as f32 * 0.5, LfoWaveform::Sine)).collect();
        Self {
            routings: Vec::new(),
            lfos,
            source_values: HashMap::new(),
        }
    }

    /// Add a modulation routing.
    pub fn add_routing(&mut self, source: ModSource, dest: ModDestination, amount: f32) {
        self.routings.push(ModRouting { source, destination: dest, amount, enabled: true });
    }

    /// Remove all routings for a given destination.
    pub fn clear_destination(&mut self, dest: ModDestination) {
        self.routings.retain(|r| r.destination != dest);
    }

    /// Set a source value (e.g., velocity, aftertouch, mod wheel).
    pub fn set_source_value(&mut self, source: ModSource, value: f32) {
        self.source_values.insert(source, value);
    }

    /// Advance all LFOs by one sample.
    pub fn tick_lfos(&mut self) {
        for lfo in &mut self.lfos {
            lfo.tick();
        }
    }

    /// Get the computed modulation value for a destination.
    pub fn get_modulation(&self, dest: ModDestination) -> f32 {
        let mut total = 0.0f32;
        for routing in &self.routings {
            if !routing.enabled || routing.destination != dest {
                continue;
            }
            let source_val = match routing.source {
                ModSource::Lfo(idx) => self.lfos.get(idx as usize).map(|l| l.last_value()).unwrap_or(0.0),
                ModSource::Velocity | ModSource::Aftertouch | ModSource::PitchBend | ModSource::ModWheel => {
                    self.source_values.get(&routing.source).copied().unwrap_or(0.0)
                }
                _ => 0.0,
            };
            total += source_val * routing.amount;
        }
        total
    }

    /// Returns all routings.
    pub fn routings(&self) -> &[ModRouting] { &self.routings }

    /// Returns the number of active routings.
    pub fn routing_count(&self) -> usize {
        self.routings.iter().filter(|r| r.enabled).count()
    }

    /// Returns the number of LFOs.
    pub fn lfo_count(&self) -> usize { self.lfos.len() }
}

impl Default for ModMatrix {
    fn default() -> Self {
        Self::new(4) // 4 LFOs by default
    }
}

impl Default for DspArena {
    fn default() -> Self {
        Self::with_capacity(16384) // 16 KB default
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn graph_creation() {
        let graph = DspGraph::new(48000.0, 256);
        assert_eq!(graph.node_count(), 0);
        assert_eq!(graph.sample_rate(), 48000.0);
    }

    #[test]
    fn add_nodes_and_connect() {
        let mut graph = DspGraph::new(48000.0, 256);
        let input = graph.add_node(DspNodeConfig {
            id: DspNodeId(0),
            node_type: DspNodeType::Input,
            params: vec![],
        });
        let gain = graph.add_node(DspNodeConfig {
            id: DspNodeId(1),
            node_type: DspNodeType::Gain,
            params: vec![("gain_db".into(), 0.0)],
        });
        graph.connect(input, gain, 0, 0);
        assert_eq!(graph.node_count(), 2);
        assert_eq!(graph.connection_count(), 1);
    }

    #[test]
    fn topological_sort_and_process() {
        let mut graph = DspGraph::new(48000.0, 256);
        let input = graph.add_node(DspNodeConfig {
            id: DspNodeId(0),
            node_type: DspNodeType::Input,
            params: vec![],
        });
        let gain = graph.add_node(DspNodeConfig {
            id: DspNodeId(1),
            node_type: DspNodeType::Gain,
            params: vec![("gain_db".into(), -6.0)],
        });
        let output = graph.add_node(DspNodeConfig {
            id: DspNodeId(2),
            node_type: DspNodeType::Output,
            params: vec![],
        });
        graph.connect(input, gain, 0, 0);
        graph.connect(gain, output, 0, 0);

        let mut buffer = vec![1.0f32; 256];
        graph.process(&mut buffer).unwrap();
        // -6dB ≈ 0.501 linear
        assert!(buffer[0] < 0.6, "gain should attenuate, got {}", buffer[0]);
        assert!(buffer[0] > 0.4, "gain should attenuate, got {}", buffer[0]);
    }

    #[test]
    fn graph_process_empty_no_panic() {
        let mut graph = DspGraph::new(48000.0, 128);
        let mut buffer = vec![0.5f32; 128];
        graph.process(&mut buffer).unwrap();
        // No nodes = pass-through
        assert!((buffer[0] - 0.5).abs() < 0.001);
    }

    #[test]
    fn buffer_size_accessor() {
        let graph = DspGraph::new(48000.0, 512);
        assert_eq!(graph.buffer_size(), 512);
    }

    // ── DspArena Tests ─────────────────────────────────────────────

    #[test]
    fn arena_creation() {
        let arena = DspArena::with_capacity(4096);
        assert_eq!(arena.frame_count(), 0);
        assert_eq!(arena.peak_usage(), 0);
    }

    #[test]
    fn arena_alloc_and_reset() {
        let mut arena = DspArena::default();
        arena.begin_frame();
        let slice = arena.alloc_f32_slice(256);
        assert_eq!(slice.len(), 256);
        assert!(arena.current_bytes() > 0);
        let peak = arena.peak_usage();
        // After reset, current bytes should drop
        arena.begin_frame();
        assert!(arena.current_bytes() <= peak);
        assert_eq!(arena.frame_count(), 2);
    }

    #[test]
    fn arena_alloc_value() {
        let mut arena = DspArena::default();
        arena.begin_frame();
        let val = arena.alloc(42.0f64);
        assert_eq!(*val, 42.0);
    }

    #[test]
    fn arena_peak_tracking() {
        let mut arena = DspArena::default();
        arena.begin_frame();
        let _ = arena.alloc_f32_slice(1024);
        let peak = arena.peak_usage();
        assert!(peak > 0);
        // Reset and allocate less
        arena.begin_frame();
        let _ = arena.alloc_f32_slice(64);
        // Peak should still reflect the maximum
        assert_eq!(arena.peak_usage(), peak);
    }

    #[test]
    fn arena_zero_init() {
        let mut arena = DspArena::default();
        arena.begin_frame();
        let slice = arena.alloc_f32_slice(128);
        for &v in slice.iter() {
            assert_eq!(v, 0.0);
        }
    }

    // ── Musical Time Engine (M1) Tests ─────────────────────────────

    #[test]
    fn transport_creation() {
        let t = Transport::new(48000.0);
        assert_eq!(t.state(), TransportState::Stopped);
        assert_eq!(t.sample_rate(), 48000.0);
        assert_eq!(t.sample_pos(), 0);
        assert!(!t.is_running());
    }

    #[test]
    fn transport_play_advance() {
        let mut t = Transport::new(48000.0);
        t.set_tempo(120.0);
        t.play();
        assert!(t.is_running());
        let pos = t.advance(256);
        assert_eq!(pos.sample_pos, 256);
        assert_eq!(t.sample_pos(), 256);
    }

    #[test]
    fn transport_stop_resets() {
        let mut t = Transport::new(48000.0);
        t.play();
        t.advance(1024);
        assert!(t.sample_pos() > 0);
        t.stop();
        assert_eq!(t.sample_pos(), 0);
        assert_eq!(t.state(), TransportState::Stopped);
    }

    #[test]
    fn transport_position_at_120bpm() {
        let mut t = Transport::new(48000.0);
        t.set_tempo(120.0);
        t.set_time_signature(TimeSignature::new(4, 4));
        t.play();
        // At 120 BPM, one beat = 0.5s = 24000 samples @ 48kHz
        t.advance(24000);
        let pos = t.position();
        assert_eq!(pos.bar, 0);
        assert_eq!(pos.beat, 1);
        assert_eq!(pos.tick, 0);
    }

    #[test]
    fn transport_seek_musical() {
        let mut t = Transport::new(48000.0);
        t.set_tempo(120.0);
        t.seek_musical(1, 0, 0); // Bar 1
        let pos = t.position();
        assert_eq!(pos.bar, 1);
        assert_eq!(pos.beat, 0);
    }

    #[test]
    fn transport_loop_wrapping() {
        let mut t = Transport::new(48000.0);
        t.set_tempo(120.0);
        t.set_loop(0, 24000); // Loop at 1 beat
        t.play();
        t.advance(25000); // Past loop end
        assert!(t.sample_pos() < 24000, "Should have wrapped around");
    }

    #[test]
    fn transport_pause_no_advance() {
        let mut t = Transport::new(48000.0);
        t.play();
        t.advance(1000);
        let pos_before = t.sample_pos();
        t.pause();
        t.advance(1000); // Should not advance while paused
        assert_eq!(t.sample_pos(), pos_before);
    }

    #[test]
    fn tempo_ramp() {
        let mut tempo = Tempo::new(120.0);
        tempo.ramp_to(240.0, 100);
        let start = tempo.bpm();
        for _ in 0..50 {
            tempo.tick();
        }
        let mid = tempo.bpm();
        assert!(mid > start, "Tempo should be increasing during ramp");
        for _ in 0..60 {
            tempo.tick();
        }
        let end = tempo.bpm();
        assert!((end - 240.0).abs() < 1.0, "Should reach target after ramp");
    }

    #[test]
    fn time_signature_ticks() {
        let ts34 = TimeSignature::new(3, 4);
        assert_eq!(ts34.ticks_per_bar(), 1440); // 480 * 3
        let ts68 = TimeSignature::new(6, 8);
        assert_eq!(ts68.ticks_per_bar(), 2880); // 480 * 6
    }

    #[test]
    fn transport_position_in_bars() {
        let mut t = Transport::new(48000.0);
        t.set_tempo(120.0);
        t.set_time_signature(TimeSignature::new(4, 4));
        t.play();
        // At 120 BPM / 48kHz: 1 beat = 24000 samples, 1 bar = 96000 samples
        // 2 bars = 192000 samples
        t.advance(192000);
        let bars = t.position_in_bars();
        assert!((bars - 2.0).abs() < 0.01, "Expected ~2 bars, got {}", bars);
    }

    // ── Modulation Matrix (M4) Tests ────────────────────────────────

    #[test]
    fn mod_matrix_creation() {
        let m = ModMatrix::new(4);
        assert_eq!(m.lfo_count(), 4);
        assert_eq!(m.routing_count(), 0);
    }

    #[test]
    fn mod_matrix_add_routing() {
        let mut m = ModMatrix::default();
        m.add_routing(ModSource::Lfo(0), ModDestination::FilterCutoff, 1000.0);
        assert_eq!(m.routing_count(), 1);
    }

    #[test]
    fn mod_matrix_lfo_generates_value() {
        let mut m = ModMatrix::default();
        m.add_routing(ModSource::Lfo(0), ModDestination::Gain, 1.0);
        // Tick LFOs a few times
        for _ in 0..100 {
            m.tick_lfos();
        }
        let val = m.get_modulation(ModDestination::Gain);
        // LFO should produce some non-zero value
        assert!(val.abs() > 0.0, "LFO modulation should be non-zero after ticking");
    }

    #[test]
    fn mod_matrix_velocity_routing() {
        let mut m = ModMatrix::default();
        m.add_routing(ModSource::Velocity, ModDestination::Gain, 0.5);
        m.set_source_value(ModSource::Velocity, 0.8);
        let val = m.get_modulation(ModDestination::Gain);
        assert!((val - 0.4).abs() < 0.001, "Expected 0.8 * 0.5 = 0.4, got {}", val);
    }

    #[test]
    fn mod_matrix_clear_destination() {
        let mut m = ModMatrix::default();
        m.add_routing(ModSource::Lfo(0), ModDestination::Gain, 1.0);
        m.add_routing(ModSource::Velocity, ModDestination::Gain, 0.5);
        m.add_routing(ModSource::Lfo(1), ModDestination::FilterCutoff, 500.0);
        assert_eq!(m.routing_count(), 3);
        m.clear_destination(ModDestination::Gain);
        assert_eq!(m.routing_count(), 1);
    }

    #[test]
    fn lfo_sine_range() {
        let mut lfo = LfoConfig::new(1.0, LfoWaveform::Sine);
        lfo.set_sample_rate(44100.0);
        let mut min_val = 1.0f32;
        let mut max_val = -1.0f32;
        for _ in 0..44100 {
            let v = lfo.tick();
            min_val = min_val.min(v);
            max_val = max_val.max(v);
        }
        assert!(min_val < -0.9, "Sine min should be near -1.0, got {}", min_val);
        assert!(max_val > 0.9, "Sine max should be near 1.0, got {}", max_val);
    }

    #[test]
    fn lfo_square_wave() {
        let mut lfo = LfoConfig::new(1.0, LfoWaveform::Square);
        lfo.set_sample_rate(100.0); // Low SR for easy testing
        let mut saw_pos = false;
        let mut saw_neg = false;
        for _ in 0..100 {
            let v = lfo.tick();
            if v > 0.5 { saw_pos = true; }
            if v < -0.5 { saw_neg = true; }
        }
        assert!(saw_pos && saw_neg, "Square wave should have both positive and negative values");
    }
}
