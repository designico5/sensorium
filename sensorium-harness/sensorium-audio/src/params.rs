//! Plugin Parameters using NIH-Plug's parameter system

use nih_plug::params::prelude::*;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// All plugin parameters
#[derive(Params)]
pub struct SensoriumParams {
    // Master section
    #[id = "bypass"]
    pub bypass: BoolParam,

    #[id = "gain"]
    pub gain: FloatParam,

    #[id = "output_gain"]
    pub output_gain: FloatParam,

    // Filter section
    #[id = "filter_freq"]
    pub filter_freq: FloatParam,

    #[id = "filter_q"]
    pub filter_q: FloatParam,

    #[id = "filter_type"]
    pub filter_type: EnumParam<FilterType>,

    // Reverb section
    #[id = "reverb_mix"]
    pub reverb_mix: FloatParam,

    #[id = "reverb_size"]
    pub reverb_size: FloatParam,

    #[id = "reverb_damping"]
    pub reverb_damping: FloatParam,

    // Modulation section
    #[id = "lfo_rate"]
    pub lfo_rate: FloatParam,

    #[id = "lfo_depth"]
    pub lfo_depth: FloatParam,

    #[id = "lfo_target"]
    pub lfo_target: EnumParam<LfoTarget>,

    // Internal state for smoothed values
    #[serde(skip)]
    param_changed: Arc<[AtomicBool; NUM_PARAMS]>,
}

const NUM_PARAMS: usize = 12;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Enum)]
pub enum FilterType {
    #[name = "Lowpass"]
    Lowpass,
    #[name = "Highpass"]
    Highpass,
    #[name = "Bandpass"]
    Bandpass,
    #[name = "Notch"]
    Notch,
    #[name = "Peak"]
    Peak,
    #[name = "Low Shelf"]
    LowShelf,
    #[name = "High Shelf"]
    HighShelf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Enum)]
pub enum LfoTarget {
    #[name = "Filter Freq"]
    FilterFreq,
    #[name = "Filter Q"]
    FilterQ,
    #[name = "Reverb Mix"]
    ReverbMix,
    #[name = "Gain"]
    Gain,
    #[name = "Pan"]
    Pan,
}

impl SensoriumParams {
    pub fn new(host: HostHandle) -> Self {
        let param_changed = (0..NUM_PARAMS).map(|_| AtomicBool::new(false)).collect::<Vec<_>>().into_boxed_slice();

        Self {
            bypass: BoolParam::new("Bypass", false),
            gain: FloatParam::new(
                "Gain",
                0.0,
                FloatRange::Skewed { min: -60.0, max: 6.0, factor: 1.0 },
            )
            .with_unit(" dB")
            .with_smoother(SmoothingStyle::Logarithmic(50.0)),
            
            output_gain: FloatParam::new(
                "Output Gain",
                0.0,
                FloatRange::Skewed { min: -60.0, max: 6.0, factor: 1.0 },
            )
            .with_unit(" dB")
            .with_smoother(SmoothingStyle::Logarithmic(50.0)),

            filter_freq: FloatParam::new(
                "Filter Frequency",
                1000.0,
                FloatRange::Skewed { min: 20.0, max: 20000.0, factor: 1.0 },
            )
            .with_unit(" Hz")
            .with_smoother(SmoothingStyle::Linear(50.0)),

            filter_q: FloatParam::new(
                "Filter Q",
                0.707,
                FloatRange::Linear { min: 0.1, max: 20.0 },
            )
            .with_smoother(SmoothingStyle::Linear(50.0)),

            filter_type: EnumParam::new("Filter Type", FilterType::Lowpass),

            reverb_mix: FloatParam::new(
                "Reverb Mix",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            )
            .with_smoother(SmoothingStyle::Linear(50.0)),

            reverb_size: FloatParam::new(
                "Reverb Size",
                0.5,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            )
            .with_smoother(SmoothingStyle::Linear(50.0)),

            reverb_damping: FloatParam::new(
                "Reverb Damping",
                0.5,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            )
            .with_smoother(SmoothingStyle::Linear(50.0)),

            lfo_rate: FloatParam::new(
                "LFO Rate",
                1.0,
                FloatRange::Skewed { min: 0.01, max: 20.0, factor: 1.0 },
            )
            .with_unit(" Hz")
            .with_smoother(SmoothingStyle::Linear(50.0)),

            lfo_depth: FloatParam::new(
                "LFO Depth",
                0.0,
                FloatRange::Linear { min: 0.0, max: 1.0 },
            )
            .with_smoother(SmoothingStyle::Linear(50.0)),

            lfo_target: EnumParam::new("LFO Target", LfoTarget::FilterFreq),

            param_changed,
        }
    }

    /// Get all params as slice for iteration
    pub fn all_params(&self) -> &[&dyn Param] {
        &[
            &self.bypass, &self.gain, &self.output_gain,
            &self.filter_freq, &self.filter_q, &self.filter_type,
            &self.reverb_mix, &self.reverb_size, &self.reverb_damping,
            &self.lfo_rate, &self.lfo_depth, &self.lfo_target,
        ]
    }

    /// Check if any parameter changed since last call
    pub fn any_changed(&self) -> bool {
        self.param_changed.iter().any(|p| p.swap(false, Ordering::Relaxed))
    }

    /// Mark parameter as changed
    pub fn mark_changed(&self, index: usize) {
        if index < NUM_PARAMS {
            self.param_changed[index].store(true, Ordering::Relaxed);
        }
    }
}

impl Params for SensoriumParams {
    fn get_parameter(&self, index: i32) -> Option<&dyn Param> {
        self.all_params().get(index as usize).copied()
    }

    fn parameter_count(&self) -> i32 {
        self.all_params().len() as i32
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use nih_plug::prelude::HostHandle;

    #[test]
    fn test_params_creation() {
        // Can't easily test without a host, but we can verify structure
        assert_eq!(NUM_PARAMS, 12);
    }

    #[test]
    fn test_filter_type_enum() {
        assert_eq!(FilterType::Lowpass as i32, 0);
        assert_eq!(FilterType::Highpass as i32, 1);
    }

    #[test]
    fn test_lfo_target_enum() {
        assert_eq!(LfoTarget::FilterFreq as i32, 0);
        assert_eq!(LfoTarget::Gain as i32, 3);
    }
}