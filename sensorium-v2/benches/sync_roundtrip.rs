use criterion::{black_box, criterion_group, criterion_main, Criterion};
use sensorium_sync::{SyncState, SensoriumDocument, Track, Settings};

fn bench_document_roundtrip(c: &mut Criterion) {
    let mut state = SyncState::new();
    let doc = SensoriumDocument {
        tracks: vec![Track {
            id: "t1".into(),
            name: "Bench".into(),
            clips: vec![],
            volume: 0.5,
            pan: 0.0,
            muted: false,
            solo: false,
        }],
        settings: Settings {
            tempo: 120.0,
            time_signature: (4, 4),
            loop_enabled: true,
        },
    };
    state.apply_document(&doc).unwrap();

    c.bench_function("document_roundtrip", |b| {
        b.iter(|| {
            let bytes = black_box(state.save_binary().unwrap());
            let state2 = SyncState::load_binary(&bytes).unwrap();
            let _ = state2.to_document().unwrap();
        })
    });
}

criterion_group!(benches, bench_document_roundtrip);
criterion_main!(benches);