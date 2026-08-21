//! Criterion benchmarks for CRDT state sync (Automerge).

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use sensorium_sync::{SensoriumDocument, SyncState, Track, Clip, Settings};

fn make_test_document(n_tracks: usize) -> SensoriumDocument {
    let mut doc = SensoriumDocument::new();
    for i in 0..n_tracks {
        doc.add_track(Track {
            id: format!("track_{}", i),
            name: format!("Track {}", i),
            clips: vec![Clip {
                id: format!("clip_{}_0", i),
                track_id: format!("track_{}", i),
                start_time: 0.0,
                duration: 4.0,
            }],
            volume: 0.8,
            pan: 0.0,
            muted: false,
            solo: false,
        });
    }
    doc.update_settings(Settings {
        tempo: 120.0,
        time_signature: (4, 4),
        loop_enabled: true,
    });
    doc
}

fn bench_document_apply(c: &mut Criterion) {
    let doc = make_test_document(16);
    c.bench_function("crdt_apply_16_tracks", |b| {
        b.iter(|| {
            let mut state = SyncState::new();
            state.apply_document(black_box(&doc)).unwrap();
        })
    });
}

fn bench_document_roundtrip(c: &mut Criterion) {
    let doc = make_test_document(8);
    c.bench_function("crdt_roundtrip_8_tracks", |b| {
        b.iter(|| {
            let mut state = SyncState::new();
            state.apply_document(&doc).unwrap();
            let binary = state.save_binary().unwrap();
            let state2 = SyncState::load_binary(&binary).unwrap();
            let _doc2 = state2.to_document().unwrap();
        })
    });
}

fn bench_binary_save(c: &mut Criterion) {
    let mut state = SyncState::new();
    let doc = make_test_document(32);
    state.apply_document(&doc).unwrap();
    c.bench_function("crdt_save_binary_32_tracks", |b| {
        b.iter(|| black_box(&mut state).save_binary().unwrap())
    });
}

fn bench_binary_load(c: &mut Criterion) {
    let mut state = SyncState::new();
    let doc = make_test_document(32);
    state.apply_document(&doc).unwrap();
    let binary = state.save_binary().unwrap();
    c.bench_function("crdt_load_binary_32_tracks", |b| {
        b.iter(|| SyncState::load_binary(black_box(&binary)).unwrap())
    });
}

criterion_group!(
    benches,
    bench_document_apply,
    bench_document_roundtrip,
    bench_binary_save,
    bench_binary_load,
);
criterion_main!(benches);
