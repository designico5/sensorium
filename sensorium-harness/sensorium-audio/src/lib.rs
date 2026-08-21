//! Sensorium Audio Engine - NIH-Plug VST3/CLAP/Standalone Plugin
//!
//! Zero-latency audio processing with fundsp DSP graph, rubato resampling,
//! and formal verification (Kani/Prusti/Creusot) for the audio thread.

#![cfg_attr(not(test), warn(unused_crate_dependencies))]

pub mod dsp;
pub mod params;
pub mod editor;
// Verification module - compiled only when kani/prusti installed
#[cfg(any(kani, prusti))]
pub mod verified;

use nih_plug_core::prelude::*;
use nih_plug_derive::*;
use vizia::prelude::*;
use std::sync::Arc;
use ringbuf::{Producer, Consumer, HeapRb};

use crate::dsp::{DspGraph, DspConfig};
use crate::params::SensoriumParams;
use crate::editor::SensoriumEditor;

// Lock-free ring buffer size for audio->GUI communication
const GUI_BUFFER_SIZE: usize = 8192;

/// Messages sent from audio thread to GUI thread
#[derive(Debug, Clone, Copy)]
pub enum GuiMessage {
    ParameterUpdate { param_id: u32, value: f32 },
    PeakLevel { channel: usize, level: f32 },
    CpuUsage(f32),
}

/// Sensorium Audio Plugin - Main plugin struct
pub struct SensoriumPlugin {
    params: Arc<SensoriumParams>,
    dsp_graph: DspGraph,
    // RT-safe communication: audio thread -> GUI thread
    gui_tx: Producer<GuiMessage>,
    gui_rx: Consumer<GuiMessage>,
    // Sample rate handling
    sample_rate: f32,
    block_size: usize,
}

impl Plugin for SensoriumPlugin {
    const NAME: &str = "Sensorium";
    const VENDOR: &str = "Sensorium Dev Team";
    const URL: &str = "https://sensorium.dev";
    const EMAIL: &str = "dev@sensorium.dev";
    const VERSION: &str = env!("CARGO_PKG_VERSION");

    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayouts] = &[AudioIOLayouts {
        main_input_channels: NonZeroU32::new(2),
        main_output_channels: NonZeroU32::new(2),
        ..AudioIOLayouts::const_default()
    }];

    type SysExMessage = ();
    type BackgroundTask = ();

    fn new(host: HostHandle) -> Self {
        let params = Arc::new(SensoriumParams::new(host));
        
        // Initialize lock-free ring buffer for audio->GUI communication
        let rb = HeapRb::<GuiMessage>::new(GUI_BUFFER_SIZE);
        let (gui_tx, gui_rx) = rb.split();

        // DSP Graph initialization
        let dsp_config = DspConfig {
            sample_rate: 48000.0,
            block_size: 256,
        };
        let dsp_graph = DspGraph::new(dsp_config);

        Self {
            params,
            dsp_graph,
            gui_tx,
            gui_rx,
            sample_rate: 48000.0,
            block_size: 256,
        }
    }

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        context: &mut ProcessContext,
    ) {
        // Update sample rate if changed
        if context.transport().sample_rate != self.sample_rate {
            self.sample_rate = context.transport().sample_rate as f32;
            self.dsp_graph.set_sample_rate(self.sample_rate);
        }

        let input_channels = buffer.iter_samples().collect::<Vec<_>>();
        let num_channels = input_channels.len();
        let num_samples = buffer.samples();

        // Process through fundsp DSP graph (RT-safe: no allocations)
        self.dsp_graph.process(
            &input_channels,
            buffer.as_slice_mut(),
            &self.params,
            num_samples,
        );

        // Send peak levels to GUI (non-blocking)
        for ch in 0..num_channels.min(2) {
            let peak = buffer.channel(ch)
                .iter()
                .map(|s| s.abs())
                .fold(0.0f32, f32::max);
            let _ = self.gui_tx.try_push(GuiMessage::PeakLevel { channel: ch, level: peak });
        }

        // Send parameter updates to GUI
        for (idx, param) in self.params.all_params().iter().enumerate() {
            if param.has_changed() {
                let _ = self.gui_tx.try_push(GuiMessage::ParameterUpdate {
                    param_id: idx as u32,
                    value: param.smoothed_value(),
                });
            }
        }
    }

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }

    fn editor(&mut self, _async_executor: AsyncExecutor<Self>) -> Option<Box<dyn Editor>> {
        #[cfg(feature = "vizia")]
        {
            let params = self.params.clone();
            let gui_rx = self.gui_rx.clone();
            Some(nih_plug_vizia::create_vizia_editor(
                SensoriumEditor::new(params, gui_rx),
                |cx| SensoriumEditor::build(cx),
            ))
        }
        #[cfg(not(feature = "vizia"))]
        {
            None
        }
    }

    fn initialize(
        &mut self,
        _audio_io_layout: &AudioIOLayouts,
        buffer_config: &BufferConfig,
        context: &mut InitContext,
    ) -> bool {
        self.sample_rate = buffer_config.sample_rate as f32;
        self.block_size = buffer_config.max_buffer_size as usize;
        self.dsp_graph.set_sample_rate(self.sample_rate);
        self.dsp_graph.set_block_size(self.block_size);
        true
    }

    fn reset(&mut self) {
        self.dsp_graph.reset();
    }
}

impl ClapPlugin for SensoriumPlugin {
    const CLAP_ID: &str = "dev.sensorium.sensorium";
    const CLAP_DESCRIPTION: Option<&str> = Some("Sensorium Zero-Latency Audio Engine");
    const CLAP_MANUAL_URL: Option<&str> = Some("https://sensorium.dev/manual");
    const CLAP_SUPPORT_URL: Option<&str> = Some("https://sensorium.dev/support");
    const CLAP_FEATURES: &'static [ClapFeature] = &[
        ClapFeature::AudioEffect,
        ClapFeature::Stereo,
        ClapFeature::Utility,
    ];
}

impl Vst3Plugin for SensoriumPlugin {
    const VST3_CLASS_ID: [u8; 16] = *b"SensoriumPlug__";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] = &[
        Vst3SubCategory::Fx,
        Vst3SubCategory::Dynamics,
    ];
}

nih_plug::plugin_entry!(SensoriumPlugin);