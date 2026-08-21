use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_array_peak(c: &mut Criterion) {
    c.bench_function("audio_peak_calc", |b| {
        b.iter(|| {
            let buffer: Vec<f32> = vec![0.1_f32; 1024];
            let mut peak: f32 = 0.0;
            for sample in buffer.iter() {
                let abs = sample.abs();
                if abs > peak {
                    peak = abs;
                }
            }
            black_box(peak)
        })
    });
}

criterion_group!(benches, bench_array_peak);
criterion_main!(benches);