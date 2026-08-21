//! Integration tests for the Sensorium audio engine.
//!
//! These tests verify the plugin can be instantiated and the DSP
//! pipeline processes audio correctly without requiring a full
//! VST3/CLAP host.

use sensorium_audio::dsp::{AudioGraph, BiquadCoeffs, BiquadState, FilterType, meter_interleaved};
use sensorium_audio::SensoriumPlugin;
use nih_plug::prelude::*;
use std::sync::Arc;

/// Test: Plugin can be instantiated with default params
#[test]
fn plugin_instantiation() {
    let plugin = SensoriumPlugin::default();
    let params = plugin.params();
    assert!(Arc::strong_count(&params) >= 1);
}

/// Test: Plugin reports correct name and vendor
#[test]
fn plugin_metadata() {
    assert_eq!(SensoriumPlugin::NAME, "Sensorium");
    assert_eq!(SensoriumPlugin::VENDOR, "Sensorium Dev Team");
}

/// Test: Plugin has correct audio I/O layout (stereo in/out)
#[test]
fn plugin_audio_layout() {
    let layouts = SensoriumPlugin::AUDIO_IO_LAYOUTS;
    assert_eq!(layouts.len(), 1);
    let layout = &layouts[0];
    assert_eq!(layout.main_input_channels.map(|c| c.get()), Some(2));
    assert_eq!(layout.main_output_channels.map(|c| c.get()), Some(2));
}

/// Test: DSP AudioGraph can be created and processes silence
#[test]
fn dsp_graph_processes_silence() {
    let mut graph = AudioGraph::new(48000.0);
    let mut buffer = vec![0.0f32; 512 * 2]; // 512 frames, interleaved stereo
    
    graph.process_interleaved(&mut buffer);
    
    // Silence in → silence out (with unity gain)
    assert!(buffer.iter().all(|&s| s == 0.0));
}

/// Test: DSP Graph applies gain correctly
#[test]
fn dsp_graph_gain_staging() {
    let mut graph = AudioGraph::new(48000.0);
    graph.set_gain_db(-6.0); // -6 dB ≈ 0.5 linear
    
    // Create a buffer with known values (stereo interleaved)
    let mut buffer = vec![1.0f32; 256 * 2];
    
    graph.process_interleaved(&mut buffer);
    
    // After -6dB gain, samples should be ~0.5
    let expected = 10.0f32.powf(-6.0 / 20.0); // ≈ 0.501
    for &sample in buffer.iter() {
        assert!((sample - expected).abs() < 0.001, 
            "Expected ~{}, got {}", expected, sample);
    }
}

/// Test: DSP Graph bypass skips processing
#[test]
fn dsp_graph_bypass() {
    let mut graph = AudioGraph::new(48000.0);
    graph.set_bypass(true);
    graph.set_gain_db(-20.0); // Would attenuate if processing
    
    let mut buffer: Vec<f32> = (0..256).map(|i| (i as f32) / 256.0).collect();
    let expected: Vec<f32> = buffer.clone();
    
    graph.process_interleaved(&mut buffer);
    
    // Bypass should leave buffer unchanged
    assert_eq!(buffer, expected);
}

/// Test: DSP Graph with filter processes samples
#[test]
fn dsp_graph_with_filter() {
    let mut graph = AudioGraph::new(48000.0);
    graph.set_filter(FilterType::Lowpass, 1000.0, 0.707);
    
    // Create a buffer with an impulse
    let mut buffer = vec![0.0f32; 128 * 2];
    buffer[0] = 1.0; // Left impulse
    buffer[1] = 1.0; // Right impulse
    
    graph.process_interleaved(&mut buffer);
    
    // After filtering, the impulse should be smoothed
    // Check that at least some samples are non-zero
    assert!(buffer.iter().any(|&s| s != 0.0), "Filter should produce output");
}

/// Test: Biquad filter processes samples
#[test]
fn dsp_biquad_filter() {
    let coeffs = BiquadCoeffs::new(FilterType::Lowpass, 1000.0, 0.707, 48000.0);
    let mut state = BiquadState::default();
    
    // Process an impulse
    let impulse = 1.0f64;
    let output = state.process(&coeffs, impulse);
    
    // Output should be non-zero (filter is working)
    assert!(output.abs() > 0.0, "Filter should produce output");
    
    // Process silence and verify decay
    for _ in 0..100 {
        let _ = state.process(&coeffs, 0.0);
    }
    // After 100 samples of silence, state should be near zero
    let final_output = state.process(&coeffs, 0.0);
    assert!(final_output.abs() < 0.01, "Filter should decay to zero");
}

/// Test: Metering computes peak values for stereo interleaved buffer
#[test]
fn dsp_metering_stereo() {
    // Interleaved stereo: [L0, R0, L1, R1, L2, R2]
    let buffer = vec![0.5f32, -0.8, 0.3, -0.9, 0.7, -0.6];
    let meter = meter_interleaved(&buffer);
    
    // Left channel: [0.5, 0.3, 0.7] → peak = 0.7
    // Right channel: [-0.8, -0.9, -0.6] → peak = 0.9
    assert!((meter.peak_l - 0.7).abs() < 0.001);
    assert!((meter.peak_r - 0.9).abs() < 0.001);
}

/// Test: Metering handles empty buffer
#[test]
fn dsp_metering_empty() {
    let buffer: Vec<f32> = vec![];
    let meter = meter_interleaved(&buffer);
    assert_eq!(meter.peak_l, 0.0);
    assert_eq!(meter.peak_r, 0.0);
}

/// Test: Metering computes RMS values
#[test]
fn dsp_metering_rms() {
    // Constant signal: RMS should equal the absolute value
    let buffer = vec![0.5f32, 0.5, 0.5, 0.5, 0.5, 0.5];
    let meter = meter_interleaved(&buffer);
    
    // RMS of constant 0.5 = 0.5
    assert!((meter.rms_l - 0.5).abs() < 0.001);
    assert!((meter.rms_r - 0.5).abs() < 0.001);
}

/// Test: AudioGraph state queries
#[test]
fn dsp_graph_state_queries() {
    let mut graph = AudioGraph::new(44100.0);
    
    assert_eq!(graph.sample_rate(), 44100.0);
    assert!(!graph.is_bypassed());
    
    graph.set_bypass(true);
    assert!(graph.is_bypassed());
    
    graph.set_gain_db(-12.0);
    let expected_linear = 10.0f64.powf(-12.0 / 20.0);
    assert!((graph.current_gain() - expected_linear).abs() < 0.0001);
}
