//! Vizia GUI Editor for Sensorium Plugin
//!
//! GPU-accelerated, React-like declarative UI

#[cfg(feature = "vizia")]
use vizia::prelude::*;
#[cfg(feature = "vizia")]
use std::sync::{Arc, mpsc};
#[cfg(feature = "vizia")]
use ringbuf::Consumer;
#[cfg(feature = "vizia")]
use raw_window_handle::RawWindowHandle;

#[cfg(feature = "vizia")]
use crate::params::SensoriumParams;
#[cfg(feature = "vizia")]
use super::GuiMessage;

/// Sensorium Editor State
#[cfg(feature = "vizia")]
#[derive(Default)]
pub struct SensoriumEditor {
    params: Arc<SensoriumParams>,
    gui_rx: Consumer<GuiMessage>,
    // UI state
    peak_levels: [f32; 2],
    cpu_usage: f32,
}

#[cfg(feature = "vizia")]
impl SensoriumEditor {
    pub fn new(params: Arc<SensoriumParams>, gui_rx: Consumer<GuiMessage>) -> Self {
        Self {
            params,
            gui_rx,
            peak_levels: [0.0, 0.0],
            cpu_usage: 0.0,
        }
    }

    pub fn build(cx: &mut Context) {
        // Main plugin window
        VStack::new(cx, |cx| {
            // Header
            Header::new(cx);
            
            // Main content area
            HStack::new(cx, |cx| {
                // Left panel: Controls
                ControlPanel::new(cx);
                
                // Right panel: Visualization
                VisualizationPanel::new(cx);
            })
            .flex_grow(1.0);
            
            // Footer: Meter bridge
            MeterBridge::new(cx);
        })
        .class("plugin-window")
        .size(Pixels(800.0), Pixels(500.0));
    }
}

/// Plugin Header with branding
#[cfg(feature = "vizia")]
struct Header;
#[cfg(feature = "vizia")]
impl View for Header {
    fn element(&self) -> Option<&'static str> { Some("header") }
    fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
        let bounds = cx.bounds();
        let rect = Rect::new(bounds.x, bounds.y, bounds.w, 60.0);
        
        // Background gradient
        let gradient = Paint::linear_gradient(
            (0.0, 0.0), (bounds.w, 60.0),
            &[
                (0.0, Color::rgb(0.05, 0.05, 0.15)),
                (1.0, Color::rgb(0.1, 0.1, 0.2)),
            ],
        );
        canvas.fill_rect(rect, &gradient);
        
        // Title
        let text_paint = Paint::text()
            .color(Color::white())
            .font_size(24.0)
            .font_weight(FontWeight::BOLD);
        canvas.fill_text("Sensorium", (20.0, 38.0), &text_paint);
        
        // Subtitle
        let sub_paint = Paint::text()
            .color(Color::rgba(0.7, 0.7, 0.8, 1.0))
            .font_size(12.0);
        canvas.fill_text("Zero-Latency Audio Engine", (20.0, 52.0), &sub_paint);
        
        // Version
        let ver_paint = Paint::text()
            .color(Color::rgba(0.5, 0.5, 0.6, 1.0))
            .font_size(10.0);
        canvas.fill_text("v0.1.0", (bounds.w - 60.0, 38.0), &ver_paint);
    }
}

/// Left Control Panel
#[cfg(feature = "vizia")]
struct ControlPanel;
#[cfg(feature = "vizia")]
impl View for ControlPanel {
    fn element(&self) -> Option<&'static str> { Some("control-panel") }
    fn draw(&self, cx: &mut DrawContext, _canvas: &mut Canvas) {
        VStack::new(cx, |cx| {
            // Master Section
            ParamSection::new(cx, "MASTER", |cx| {
                ParamKnob::new(cx, "Gain", -60.0..=6.0, 0.0, "dB");
                ParamKnob::new(cx, "Output", -60.0..=6.0, 0.0, "dB");
                ParamToggle::new(cx, "Bypass");
            });
            
            // Filter Section
            ParamSection::new(cx, "FILTER", |cx| {
                ParamKnob::new(cx, "Frequency", 20.0..=20000.0, 1000.0, "Hz");
                ParamKnob::new(cx, "Q", 0.1..=20.0, 0.707, "");
                ParamEnum::new(cx, "Type", &["Lowpass", "Highpass", "Bandpass", "Notch", "Peak", "Low Shelf", "High Shelf"]);
            });
            
            // Reverb Section
            ParamSection::new(cx, "REVERB", |cx| {
                ParamKnob::new(cx, "Mix", 0.0..=1.0, 0.0, "");
                ParamKnob::new(cx, "Size", 0.0..=1.0, 0.5, "");
                ParamKnob::new(cx, "Damping", 0.0..=1.0, 0.5, "");
            });
            
            // Modulation Section
            ParamSection::new(cx, "MODULATION", |cx| {
                ParamKnob::new(cx, "LFO Rate", 0.01..=20.0, 1.0, "Hz");
                ParamKnob::new(cx, "LFO Depth", 0.0..=1.0, 0.0, "");
                ParamEnum::new(cx, "Target", &["Filter Freq", "Filter Q", "Reverb Mix", "Gain", "Pan"]);
            });
        })
        .class("control-panel")
        .child_space(Stretch(1.0));
    }
}

/// Parameter Section Container
#[cfg(feature = "vizia")]
struct ParamSection<F: FnOnce(&mut Context)>(String, F);
#[cfg(feature = "vizia")]
impl<F: FnOnce(&mut Context)> View for ParamSection<F> {
    fn element(&self) -> Option<&'static str> { Some("param-section") }
    fn layout(&self, cx: &mut LayoutContext, _: Option<&LayoutParams>) {
        VStack::new(cx, |cx| {
            // Section title
            Label::new(cx, &self.0).class("section-title");
            
            // Section content
            HStack::new(cx, |cx| {
                (self.1)(cx);
            })
            .child_space(Stretch(1.0))
            .spacing(Pixels(16.0));
        })
        .class("param-section")
        .child_space(Stretch(1.0))
        .spacing(Pixels(8.0));
    }
}

/// Parameter Knob
#[cfg(feature = "vizia")]
struct ParamKnob;
#[cfg(feature = "vizia")]
impl ParamKnob {
    fn new(cx: &mut Context, label: &str, range: std::ops::RangeInclusive<f32>, default: f32, unit: &str) {
        VStack::new(cx, |cx| {
            Knob::new(cx, default, *range.start()..=*range.end())
                .step(0.01)
                .class("param-knob")
                .on_changing(|cx, value| {
                    // Handle parameter change
                    println!("{} = {}", label, value);
                });
            
            Label::new(cx, label).class("param-label");
            if !unit.is_empty() {
                Label::new(cx, unit).class("param-unit");
            }
        })
        .class("knob-container")
        .child_space(Stretch(1.0))
        .spacing(Pixels(4.0));
    }
}

/// Parameter Toggle
#[cfg(feature = "vizia")]
struct ParamToggle;
#[cfg(feature = "vizia")]
impl ParamToggle {
    fn new(cx: &mut Context, label: &str) {
        Checkbox::new(cx, false)
            .on_toggle(|cx, checked| {
                println!("{} = {}", label, checked);
            });
        Label::new(cx, label).class("param-label");
    }
}

/// Parameter Enum Selector
#[cfg(feature = "vizia")]
struct ParamEnum;
#[cfg(feature = "vizia")]
impl ParamEnum {
    fn new(cx: &mut Context, label: &str, options: &[&str]) {
        VStack::new(cx, |cx| {
            Label::new(cx, label).class("param-label");
            Combobox::new(cx, options, 0)
                .on_select(|cx, index| {
                    println!("{} = {}", label, options[index]);
                });
        })
        .class("enum-container")
        .child_space(Stretch(1.0));
    }
}

/// Right Visualization Panel
#[cfg(feature = "vizia")]
struct VisualizationPanel;
#[cfg(feature = "vizia")]
impl View for VisualizationPanel {
    fn element(&self) -> Option<&'static str> { Some("viz-panel") }
    fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
        let bounds = cx.bounds();
        let rect = Rect::new(bounds.x, bounds.y, bounds.w, bounds.h);
        
        // Dark background
        canvas.fill_rect(rect, &Paint::color(Color::rgb(0.08, 0.08, 0.12)));
        
        // Border
        canvas.stroke_rect(rect, &Paint::stroke().color(Color::rgba(0.3, 0.3, 0.4, 0.5)).width(1.0));
        
        // Frequency response curve (placeholder)
        let center_y = bounds.y + bounds.h * 0.5;
        let mut path = Path::new();
        path.move_to(bounds.x, center_y);
        
        for i in 0..=100 {
            let x = bounds.x + bounds.w * (i as f32 / 100.0);
            let freq = 20.0_f32 * (20000.0 / 20.0).powf(i as f32 / 100.0);
            // Simple lowpass response visualization
            let gain = 1.0 / (1.0 + (freq / 1000.0).powi(2)).sqrt();
            let y = center_y - gain * bounds.h * 0.4;
            path.line_to(x, y);
        }
        
        canvas.stroke_path(
            &path,
            &Paint::stroke()
                .color(Color::rgb(0.38, 0.85, 0.98))
                .width(2.0)
        );
        
        // Title
        let text_paint = Paint::text()
            .color(Color::rgba(0.7, 0.7, 0.8, 1.0))
            .font_size(14.0)
            .font_weight(FontWeight::MEDIUM);
        canvas.fill_text("Frequency Response", (bounds.x + 16.0, bounds.y + 24.0), &text_paint);
    }
}

/// Meter Bridge at bottom
#[cfg(feature = "vizia")]
struct MeterBridge;
#[cfg(feature = "vizia")]
impl View for MeterBridge {
    fn element(&self) -> Option<&'static str> { Some("meter-bridge") }
    fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
        let bounds = cx.bounds();
        let meter_w = bounds.w / 2.0 - 16.0;
        let meter_h = 24.0;
        let x_start = bounds.x + 16.0;
        let y = bounds.y + 8.0;
        
        for ch in 0..2 {
            let x = x_start + ch as f32 * (meter_w + 16.0);
            let rect = Rect::new(x, y, meter_w, meter_h);
            
            // Background
            canvas.fill_rect(rect, &Paint::color(Color::rgb(0.05, 0.05, 0.1)));
            
            // Level (placeholder - would read from actual peak levels)
            let level = 0.3 + (ch as f32 * 0.2); // Demo levels
            let level_w = meter_w * level;
            let level_rect = Rect::new(x, y, level_w, meter_h);
            
            let color = if level > 0.9 {
                Color::rgb(1.0, 0.2, 0.2)
            } else if level > 0.7 {
                Color::rgb(1.0, 0.8, 0.2)
            } else {
                Color::rgb(0.2, 0.9, 0.4)
            };
            
            canvas.fill_rect(level_rect, &Paint::color(color));
            
            // Border
            canvas.stroke_rect(rect, &Paint::stroke().color(Color::rgba(0.3, 0.3, 0.4, 0.5)).width(1.0));
            
            // Channel label
            let text_paint = Paint::text()
                .color(Color::rgba(0.6, 0.6, 0.7, 1.0))
                .font_size(10.0);
            canvas.fill_text(&format!("CH{}", ch + 1), (x + 4.0, y + 16.0), &text_paint);
        }
        
        // CPU usage
        let cpu_text = "CPU: 12%";
        let cpu_paint = Paint::text()
            .color(Color::rgba(0.6, 0.6, 0.7, 1.0))
            .font_size(11.0);
        canvas.fill_text(cpu_text, (bounds.x + bounds.w - 80.0, y + 16.0), &cpu_paint);
    }
}

/// Main Editor Entry Point
#[cfg(feature = "vizia")]
pub fn create_editor(params: Arc<SensoriumParams>, gui_rx: Consumer<GuiMessage>) -> Box<dyn Editor> {
    // Create a simple Vizia-based editor
    // Note: Full NIH-Plug vizia integration requires the nih_plug_vizia crate from git
    struct ViziaEditor {
        params: Arc<SensoriumParams>,
        gui_rx: Consumer<GuiMessage>,
    }
    
    impl Editor for ViziaEditor {
        fn spawn(&mut self, _parent: RawWindowHandle) -> Box<dyn std::any::Any> {
            // In a real implementation, this would spawn the Vizia window
            // For now, return a dummy box
            Box::new(())
        }
        
        fn size(&self) -> (u32, u32) {
            (800, 500)
        }
        
        fn set_scale(&mut self, _scale: f32) {}
        
        fn param_changed(&mut self, _param: &str) {}
        
        fn close(&mut self) {}
    }
    
    Box::new(ViziaEditor { params, gui_rx })
}

#[cfg(not(feature = "vizia"))]
pub fn create_editor(_params: Arc<SensoriumParams>, _gui_rx: Consumer<GuiMessage>) -> Box<dyn Editor> {
    // Fallback when vizia feature not enabled
    struct NoEditor;
    impl Editor for NoEditor {}
    Box::new(NoEditor)
}

// Vizia custom view implementations
#[cfg(feature = "vizia")]
mod vizia_views {
    use super::*;
    use vizia::prelude::*;

    // Knob implementation
    pub struct Knob {
        value: f32,
        min: f32,
        max: f32,
        step: f32,
        on_changing: Option<Box<dyn Fn(&mut EventContext, f32)>>,
    }

    impl Knob {
        pub fn new(cx: &mut Context, value: f32, range: std::ops::RangeInclusive<f32>) -> Handle<Self> {
            Self {
                value,
                min: *range.start(),
                max: *range.end(),
                step: 0.01,
                on_changing: None,
            }.build(cx, |_| {})
        }

        pub fn step(mut self, step: f32) -> Self { self.step = step; self }
        pub fn on_changing(mut self, f: impl Fn(&mut EventContext, f32) + 'static) -> Self {
            self.on_changing = Some(Box::new(f)); self
        }
    }

    impl View for Knob {
        fn element(&self) -> Option<&'static str> { Some("knob") }
        fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
            let bounds = cx.bounds();
            let center_x = bounds.x + bounds.w * 0.5;
            let center_y = bounds.y + bounds.h * 0.5;
            let radius = bounds.w.min(bounds.h) * 0.4;
            
            // Track
            let track_paint = Paint::stroke()
                .color(Color::rgba(0.2, 0.2, 0.3, 1.0))
                .width(4.0);
            canvas.stroke_circle((center_x, center_y), radius, &track_paint);
            
            // Value arc
            let normalized = (self.value - self.min) / (self.max - self.min);
            let angle = -std::f32::consts::PI * 0.75 + normalized * std::f32::consts::PI * 1.5;
            let arc_paint = Paint::stroke()
                .color(Color::rgb(0.38, 0.85, 0.98))
                .width(4.0);
            
            // Draw indicator line
            let indicator_x = center_x + angle.cos() * radius * 0.8;
            let indicator_y = center_y + angle.sin() * radius * 0.8;
            canvas.stroke_line(
                (center_x, center_y),
                (indicator_x, indicator_y),
                &Paint::stroke().color(Color::white()).width(2.0),
            );
        }
        
        fn event(&mut self, cx: &mut EventContext, event: &Event) {
            if let Event::MouseDown(mouse) = event {
                if mouse.button == MouseButton::Left {
                    cx.capture();
                }
            } else if let Event::MouseMove(mouse) = event {
                if cx.has_capture() {
                    // Calculate value from mouse position
                    let bounds = cx.bounds();
                    let center_x = bounds.x + bounds.w * 0.5;
                    let center_y = bounds.y + bounds.h * 0.5;
                    let dx = mouse.x - center_x;
                    let dy = mouse.y - center_y;
                    let angle = dy.atan2(dx);
                    let normalized = (angle + std::f32::consts::PI * 0.75) / (std::f32::consts::PI * 1.5);
                    let value = (self.min + normalized.clamp(0.0, 1.0) * (self.max - self.min)).round() / self.step * self.step;
                    self.value = value.clamp(self.min, self.max);
                    if let Some(ref f) = self.on_changing {
                        f(cx, self.value);
                    }
                    cx.needs_redraw();
                }
            } else if let Event::MouseUp(_) = event {
                cx.release();
            }
        }
    }

    // Combobox implementation
    pub struct Combobox {
        options: Vec<String>,
        selected: usize,
        on_select: Option<Box<dyn Fn(&mut EventContext, usize)>>,
    }

    impl Combobox {
        pub fn new(cx: &mut Context, options: &[&str], selected: usize) -> Handle<Self> {
            Self {
                options: options.iter().map(|s| s.to_string()).collect(),
                selected,
                on_select: None,
            }.build(cx, |_| {})
        }
        
        pub fn on_select(mut self, f: impl Fn(&mut EventContext, usize) + 'static) -> Self {
            self.on_select = Some(Box::new(f)); self
        }
    }

    impl View for Combobox {
        fn element(&self) -> Option<&'static str> { Some("combobox") }
        fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
            let bounds = cx.bounds();
            let rect = Rect::new(bounds.x, bounds.y, bounds.w, 32.0);
            
            // Background
            canvas.fill_rect(rect, &Paint::color(Color::rgb(0.12, 0.12, 0.18)));
            canvas.stroke_rect(rect, &Paint::stroke().color(Color::rgba(0.3, 0.3, 0.4, 0.5)).width(1.0));
            
            // Selected text
            if self.selected < self.options.len() {
                let text_paint = Paint::text()
                    .color(Color::white())
                    .font_size(13.0);
                canvas.fill_text(&self.options[self.selected], (bounds.x + 12.0, bounds.y + 22.0), &text_paint);
            }
            
            // Arrow
            let arrow_x = bounds.x + bounds.w - 20.0;
            let arrow_y = bounds.y + bounds.h * 0.5;
            canvas.fill_text("▼", (arrow_x, arrow_y + 4.0), &Paint::text().color(Color::rgba(0.6, 0.6, 0.7, 1.0)).font_size(10.0));
        }
        
        fn event(&mut self, cx: &mut EventContext, event: &Event) {
            if let Event::MouseDown(mouse) = event {
                if mouse.button == MouseButton::Left {
                    let bounds = cx.bounds();
                    let rect = Rect::new(bounds.x, bounds.y, bounds.w, 32.0);
                    if rect.contains(mouse.x, mouse.y) {
                        // Toggle dropdown (simplified - just cycle)
                        self.selected = (self.selected + 1) % self.options.len();
                        if let Some(ref f) = self.on_select {
                            f(cx, self.selected);
                        }
                        cx.needs_redraw();
                    }
                }
            }
        }
    }

    // Checkbox implementation
    pub struct Checkbox {
        checked: bool,
        on_toggle: Option<Box<dyn Fn(&mut EventContext, bool)>>,
    }

    impl Checkbox {
        pub fn new(cx: &mut Context, checked: bool) -> Handle<Self> {
            Self { checked, on_toggle: None }.build(cx, |_| {})
        }
        
        pub fn on_toggle(mut self, f: impl Fn(&mut EventContext, bool) + 'static) -> Self {
            self.on_toggle = Some(Box::new(f)); self
        }
    }

    impl View for Checkbox {
        fn element(&self) -> Option<&'static str> { Some("checkbox") }
        fn draw(&self, cx: &mut DrawContext, canvas: &mut Canvas) {
            let bounds = cx.bounds();
            let size = 20.0;
            let rect = Rect::new(bounds.x, bounds.y + (bounds.h - size) * 0.5, size, size);
            
            // Background
            if self.checked {
                canvas.fill_rect(rect, &Paint::color(Color::rgb(0.38, 0.85, 0.98)));
            } else {
                canvas.fill_rect(rect, &Paint::color(Color::rgb(0.12, 0.12, 0.18)));
            }
            canvas.stroke_rect(rect, &Paint::stroke().color(Color::rgba(0.3, 0.3, 0.4, 0.5)).width(1.0));
            
            // Checkmark
            if self.checked {
                let check_paint = Paint::text().color(Color::white()).font_size(14.0);
                canvas.fill_text("✓", (bounds.x + 4.0, bounds.y + 16.0), &check_paint);
            }
        }
        
        fn event(&mut self, cx: &mut EventContext, event: &Event) {
            if let Event::MouseDown(mouse) = event {
                if mouse.button == MouseButton::Left {
                    let bounds = cx.bounds();
                    let size = 20.0;
                    let rect = Rect::new(bounds.x, bounds.y + (bounds.h - size) * 0.5, size, size);
                    if rect.contains(mouse.x, mouse.y) {
                        self.checked = !self.checked;
                        if let Some(ref f) = self.on_toggle {
                            f(cx, self.checked);
                        }
                        cx.needs_redraw();
                    }
                }
            }
        }
    }
}