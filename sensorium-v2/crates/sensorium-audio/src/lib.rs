use nih_plug::prelude::*;
use std::sync::Arc;
use ringbuf::{HeapRb, HeapProd};
use ringbuf::traits::{Producer, Split};
use std::num::NonZeroU32;

pub mod dsp;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AudioDeviceState {
    Unknown,
    Ready,
    Degraded,
    Disconnected,
    Recovering,
    Failed,
}

#[derive(Debug, Clone, PartialEq)]
pub struct AudioReadback {
    pub state: AudioDeviceState,
    pub device_name: Option<String>,
    pub sample_rate: Option<f64>,
    pub buffer_size: Option<usize>,
    pub xrun_count: u64,
}

/// Control-plane state for truthful audio-device readback and recovery.
#[derive(Debug, Clone)]
pub struct AudioRuntimeState {
    state: AudioDeviceState,
    device_name: Option<String>,
    sample_rate: Option<f64>,
    buffer_size: Option<usize>,
    xrun_count: u64,
}

impl Default for AudioRuntimeState {
    fn default() -> Self {
        Self {
            state: AudioDeviceState::Unknown,
            device_name: None,
            sample_rate: None,
            buffer_size: None,
            xrun_count: 0,
        }
    }
}

impl AudioRuntimeState {
    pub fn connect(&mut self, device_name: impl Into<String>, sample_rate: f64, buffer_size: usize) -> anyhow::Result<()> {
        if !sample_rate.is_finite() || sample_rate <= 0.0 || buffer_size == 0 {
            anyhow::bail!("audio readback requires a finite sample rate and non-zero buffer");
        }
        self.device_name = Some(device_name.into());
        self.sample_rate = Some(sample_rate);
        self.buffer_size = Some(buffer_size);
        self.state = AudioDeviceState::Ready;
        Ok(())
    }

    pub fn disconnect(&mut self) {
        self.state = AudioDeviceState::Disconnected;
    }

    pub fn begin_recovery(&mut self) -> anyhow::Result<()> {
        match self.state {
            AudioDeviceState::Disconnected | AudioDeviceState::Failed | AudioDeviceState::Degraded => {
                self.state = AudioDeviceState::Recovering;
                Ok(())
            }
            _ => anyhow::bail!("audio recovery requires a disconnected, degraded or failed device"),
        }
    }

    pub fn fail(&mut self) {
        self.state = AudioDeviceState::Failed;
    }

    pub fn record_xrun(&mut self) {
        self.xrun_count = self.xrun_count.saturating_add(1);
        if self.state == AudioDeviceState::Ready {
            self.state = AudioDeviceState::Degraded;
        }
    }

    pub fn readback(&self) -> AudioReadback {
        AudioReadback {
            state: self.state,
            device_name: self.device_name.clone(),
            sample_rate: self.sample_rate,
            buffer_size: self.buffer_size,
            xrun_count: self.xrun_count,
        }
    }
}

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn audio_readback_starts_unknown_and_recovers_truthfully() {
        let mut runtime = AudioRuntimeState::default();
        assert_eq!(runtime.readback().state, AudioDeviceState::Unknown);
        runtime.connect("Stage Interface", 48_000.0, 128).unwrap();
        runtime.record_xrun();
        assert_eq!(runtime.readback().state, AudioDeviceState::Degraded);
        assert_eq!(runtime.readback().xrun_count, 1);
        runtime.disconnect();
        runtime.begin_recovery().unwrap();
        runtime.connect("Stage Interface", 96_000.0, 64).unwrap();
        let readback = runtime.readback();
        assert_eq!(readback.state, AudioDeviceState::Ready);
        assert_eq!(readback.sample_rate, Some(96_000.0));
        assert_eq!(readback.buffer_size, Some(64));
    }

    #[test]
    fn audio_readback_rejects_invalid_configuration() {
        let mut runtime = AudioRuntimeState::default();
        assert!(runtime.connect("bad", f64::NAN, 128).is_err());
        assert!(runtime.connect("bad", 48_000.0, 0).is_err());
    }
}
