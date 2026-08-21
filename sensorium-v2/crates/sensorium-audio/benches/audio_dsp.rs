//! Criterion benchmarks for the audio DSP pipeline.
//!
//! Measures real-time safety: gain processing, biquad filtering,
//! and metering — all must complete well within the audio callback
//! budget (< 1ms for 512 samples @ 48kHz).

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use sensorium_audio::dsp::{AudioGraph, FilterType, meter_interleaved};

fn bench_gain_stereo(c: &mut Criterion) {
    let mut group = c.benchmark_group("gain_stereo");
    for buf_size in [64, 128, 256, 512, 1024] {
        let mut graph = AudioGraph::with_gain(48000.0, -6.0);
        let mut buffer = vec![0.5f32; buf_size * 2]; // stereo interleaved
        group.throughput(criterion::Throughput::Elements(buf_size as u64));
        group.bench_with_input(BenchmarkId::from_parameter(buf_size), &buf_size, |b, _| {
            b.iter(|| graph.process_interleaved(black_box(&mut buffer)));
        });
    }
    group.finish();
}

fn bench_biquad_lowpass(c: &mut Criterion) {
    let mut group = c.benchmark_group("biquad_lowpass");
    for buf_size in [64, 128, 256, 512, 1024] {
        let mut graph = AudioGraph::new(48000.0);
        graph.set_filter(FilterType::Lowpass, 1000.0, 0.707);
        let mut buffer = vec![0.5f32; buf_size * 2];
        group.throughput(criterion::Throughput::Elements(buf_size as u64));
        group.bench_with_input(BenchmarkId::from_parameter(buf_size), &buf_size, |b, _| {
            b.iter(|| graph.process_interleaved(black_box(&mut buffer)));
        });
    }
    group.finish();
}

fn bench_metering(c: &mut Criterion) {
    let mut group = c.benchmark_group("metering");
    for buf_size in [64, 128, 256, 512, 1024] {
        let buffer = vec![0.5f32; buf_size * 2];
        group.throughput(criterion::Throughput::Elements(buf_size as u64));
        group.bench_with_input(BenchmarkId::from_parameter(buf_size), &buf_size, |b, _| {
            b.iter(|| meter_interleaved(black_box(&buffer)));
        });
    }
    group.finish();
}

fn bench_mono_processing(c: &mut Criterion) {
    let mut graph = AudioGraph::with_gain(48000.0, -3.0);
    graph.set_filter(FilterType::Highpass, 80.0, 0.707);
    let mut buffer = vec![0.5f32; 512];
    c.bench_function("mono_hp_512", |b| {
        b.iter(|| graph.process_mono(black_box(&mut buffer)));
    });
}

criterion_group!(
    benches,
    bench_gain_stereo,
    bench_biquad_lowpass,
    bench_metering,
    bench_mono_processing,
);
criterion_main!(benches);
