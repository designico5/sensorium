use nih_plug::prelude::*;
use std::sync::Arc;
use ringbuf::{HeapRb, HeapProd};
use ringbuf::traits::{Producer, Split};
use std::num::NonZeroU32;

pub mod dsp;

#[derive(Params)]
pub struct SensoriumParams {
    #[id = "gain"]
    pub gain: FloatParam,
}

impl Default for SensoriumParams {
    fn default() -> Self {
        Self {
            gain: FloatParam::new("Gain", 0.0, FloatRange::Linear { min: -60.0, max: 6.0 }),
        }
    }
}

pub struct SensoriumPlugin {
    params: Arc<SensoriumParams>,
    gui_tx: HeapProd<GuiMessage>,
}

#[derive(Debug, Clone, Copy)]
pub enum GuiMessage {
    PeakLevel { channel: usize, level: f32 },
}

impl Default for SensoriumPlugin {
    fn default() -> Self {
        let rb = HeapRb::<GuiMessage>::new(8192);
        let (gui_tx, _) = rb.split();
        Self {
            params: Arc::new(SensoriumParams::default()),
            gui_tx,
        }
    }
}

impl Plugin for SensoriumPlugin {
    const NAME: &'static str = "Sensorium";
    const VENDOR: &'static str = "Sensorium Dev Team";
    const URL: &'static str = "https://sensorium.dev";
    const EMAIL: &'static str = "dev@sensorium.dev";
    const VERSION: &'static str = env!("CARGO_PKG_VERSION");

    const AUDIO_IO_LAYOUTS: &'static [AudioIOLayout] = &[AudioIOLayout {
        main_input_channels: NonZeroU32::new(2),
        main_output_channels: NonZeroU32::new(2),
        ..AudioIOLayout::const_default()
    }];

    type SysExMessage = ();
    type BackgroundTask = ();

    fn params(&self) -> Arc<dyn Params> {
        self.params.clone()
    }

    fn process(
        &mut self,
        buffer: &mut Buffer,
        _aux: &mut AuxiliaryBuffers,
        _context: &mut impl ProcessContext<Self>,
    ) -> ProcessStatus {
        for (ch, channel_data) in buffer.as_slice().iter().enumerate() {
            let peak = channel_data.iter().map(|s| s.abs()).fold(0.0f32, f32::max);
            let _ = self.gui_tx.try_push(GuiMessage::PeakLevel { channel: ch, level: peak });
        }
        ProcessStatus::Normal
    }
}

impl ClapPlugin for SensoriumPlugin {
    const CLAP_ID: &'static str = "dev.sensorium.sensorium";
    const CLAP_DESCRIPTION: Option<&'static str> = Some("Sensorium Zero-Latency Audio Engine");
    const CLAP_MANUAL_URL: Option<&'static str> = Some(Self::URL);
    const CLAP_SUPPORT_URL: Option<&'static str> = None;
    const CLAP_FEATURES: &'static [ClapFeature] = &[
        ClapFeature::AudioEffect,
        ClapFeature::Stereo,
        ClapFeature::Utility,
    ];
}

impl Vst3Plugin for SensoriumPlugin {
    const VST3_CLASS_ID: [u8; 16] = *b"SensoriumPlugIDx";
    const VST3_SUBCATEGORIES: &'static [Vst3SubCategory] = &[
        Vst3SubCategory::Fx,
        Vst3SubCategory::Dynamics,
    ];
}

nih_export_clap!(SensoriumPlugin);
nih_export_vst3!(SensoriumPlugin);