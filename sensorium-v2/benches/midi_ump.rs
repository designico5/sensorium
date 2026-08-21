use criterion::{black_box, criterion_group, criterion_main, Criterion};
use sensorium_midi::{UmpPacket, MidiRouter};

fn bench_ump_parse(c: &mut Criterion) {
    let bytes = [0x12, 0x90, 0x3C, 0x64];
    c.bench_function("ump_parse", |b| {
        b.iter(|| UmpPacket::from_bytes(black_box(&bytes)).unwrap())
    });
}

fn bench_ump_route(c: &mut Criterion) {
    let router = MidiRouter::default();
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
    c.bench_function("ump_route", |b| {
        b.iter(|| router.route(black_box(&pkt)).unwrap())
    });
}

criterion_group!(benches, bench_ump_parse, bench_ump_route);
criterion_main!(benches);