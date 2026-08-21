//! Criterion benchmarks for MIDI 2.0 UMP parsing and routing.

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use sensorium_midi::{UmpPacket, MidiRouter, MidiBuffer};

fn bench_ump_parse_32bit(c: &mut Criterion) {
    let bytes = [0x12, 0x90, 0x3C, 0x64];
    c.bench_function("ump_parse_32bit", |b| {
        b.iter(|| UmpPacket::from_bytes(black_box(&bytes)).unwrap())
    });
}

fn bench_ump_serialize(c: &mut Criterion) {
    let pkt = UmpPacket {
        message_type: 0x1,
        group: 0,
        status: 0x90,
        data1: 60,
        data2: 100,
        data3: None,
        data4: None,
        data5: None,
        data6: None,
        data7: None,
        data8: None,
        data9: None,
        data10: None,
        data11: None,
    };
    c.bench_function("ump_serialize_32bit", |b| {
        b.iter(|| black_box(&pkt).to_bytes())
    });
}

fn bench_ump_roundtrip(c: &mut Criterion) {
    let pkt = UmpPacket {
        message_type: 0x4,
        group: 1,
        status: 0x20,
        data1: 61,
        data2: 0x40,
        data3: Some(0x50),
        data4: Some(0x60),
        data5: Some(0x70),
        data6: Some(0x00),
        data7: None,
        data8: None,
        data9: None,
        data10: None,
        data11: None,
    };
    c.bench_function("ump_roundtrip_64bit", |b| {
        b.iter(|| {
            let bytes = black_box(&pkt).to_bytes();
            UmpPacket::from_bytes(&bytes).unwrap()
        })
    });
}

fn bench_router(c: &mut Criterion) {
    let router = MidiRouter::default();
    let pkt = UmpPacket {
        message_type: 0x1,
        group: 5,
        status: 0x90,
        data1: 60,
        data2: 100,
        data3: None,
        data4: None,
        data5: None,
        data6: None,
        data7: None,
        data8: None,
        data9: None,
        data10: None,
        data11: None,
    };
    c.bench_function("midi_route", |b| {
        b.iter(|| router.route(black_box(&pkt)).unwrap())
    });
}

fn bench_buffer_push_drain(c: &mut Criterion) {
    let mut group = c.benchmark_group("midi_buffer");
    for count in [16, 64, 256] {
        let pkt = UmpPacket {
            message_type: 0x1,
            group: 0,
            status: 0x90,
            data1: 60,
            data2: 100,
            data3: None,
            data4: None,
            data5: None,
            data6: None,
            data7: None,
            data8: None,
            data9: None,
            data10: None,
            data11: None,
        };
        group.bench_with_input(BenchmarkId::from_parameter(count), &count, |b, &n| {
            let mut buf = MidiBuffer::new(n);
            b.iter(|| {
                for _ in 0..n {
                    buf.push(black_box(pkt.clone()));
                }
                buf.drain()
            });
        });
    }
    group.finish();
}

criterion_group!(
    benches,
    bench_ump_parse_32bit,
    bench_ump_serialize,
    bench_ump_roundtrip,
    bench_router,
    bench_buffer_push_drain,
);
criterion_main!(benches);
