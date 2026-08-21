//! sensorium-contracts — Protobuf Contract Definitions
//!
//! Auto-generated Rust types from the Sensorium protobuf specifications.
//! These types define the inter-module communication contracts.

/// Audio engine contracts (sensorium.audio).
pub mod audio {
    include!("generated/sensorium.audio.rs");
}

/// MIDI 2.0 contracts (sensorium.midi).
pub mod midi {
    include!("generated/sensorium.midi.rs");
}

/// State sync contracts (sensorium.state).
pub mod state {
    include!("generated/sensorium.state.rs");
}

/// Visual engine contracts (sensorium.visual).
pub mod visual {
    include!("generated/sensorium.visual.rs");
}

/// Local AI contracts (sensorium.local_ai).
pub mod ai {
    include!("generated/sensorium.local_ai.rs");
}

#[cfg(test)]
mod tests {
    use super::*;
    use prost::Message;

    // ── Audio Contracts ────────────────────────────────────────────

    #[test]
    fn audio_callback_default() {
        let cb = audio::AudioCallback::default();
        assert_eq!(cb.sample_index, 0);
        assert_eq!(cb.channel_count, 0);
        assert!(cb.input.is_empty());
        assert!(cb.output.is_empty());
    }

    #[test]
    fn transport_default_and_encode() {
        let t = audio::Transport {
            tempo: 120.0,
            playing: true,
            position_samples: 48000,
            time_signature_numerator: 4,
            time_signature_denominator: 4,
        };
        let encoded = t.encode_to_vec();
        let decoded = audio::Transport::decode(encoded.as_slice()).unwrap();
        assert_eq!(decoded.tempo, 120.0);
        assert!(decoded.playing);
        assert_eq!(decoded.position_samples, 48000);
    }

    #[test]
    fn parameter_roundtrip() {
        let p = audio::Parameter {
            id: "gain".into(),
            normalized_value: 0.75,
            raw_value: -6.0,
        };
        let bytes = p.encode_to_vec();
        let decoded = audio::Parameter::decode(bytes.as_slice()).unwrap();
        assert_eq!(decoded.id, "gain");
        assert!((decoded.normalized_value - 0.75).abs() < 0.001);
    }

    #[test]
    fn audio_engine_state_with_transport() {
        let state = audio::AudioEngineState {
            parameters: vec![audio::Parameter {
                id: "filter_cutoff".into(),
                normalized_value: 0.5,
                raw_value: 1000.0,
            }],
            transport: Some(audio::Transport {
                tempo: 140.0,
                playing: true,
                position_samples: 96000,
                time_signature_numerator: 3,
                time_signature_denominator: 4,
            }),
        };
        let bytes = state.encode_to_vec();
        let decoded = audio::AudioEngineState::decode(bytes.as_slice()).unwrap();
        assert_eq!(decoded.parameters.len(), 1);
        assert!(decoded.transport.is_some());
        assert_eq!(decoded.transport.unwrap().tempo, 140.0);
    }

    // ── MIDI Contracts ─────────────────────────────────────────────

    #[test]
    fn ump_message_default() {
        let msg = midi::UmpMessage::default();
        assert_eq!(msg.message_type, 0);
        assert_eq!(msg.group, 0);
    }

    #[test]
    fn ump_message_roundtrip() {
        let msg = midi::UmpMessage {
            words: 2,
            message_type: 0x4,
            group: 3,
            status: 0x90,
            data1: 60,
            data2: 100,
            data3: 0,
            data4: 0,
        };
        let bytes = msg.encode_to_vec();
        let decoded = midi::UmpMessage::decode(bytes.as_slice()).unwrap();
        assert_eq!(decoded.message_type, 0x4);
        assert_eq!(decoded.data1, 60);
        assert_eq!(decoded.data2, 100);
    }

    #[test]
    fn midi2_configuration() {
        let config = midi::Midi2Configuration {
            max_groups: 16,
            max_streams: 4,
            per_note_enabled: true,
        };
        let bytes = config.encode_to_vec();
        let decoded = midi::Midi2Configuration::decode(bytes.as_slice()).unwrap();
        assert_eq!(decoded.max_groups, 16);
        assert!(decoded.per_note_enabled);
    }

    // ── State Sync Contracts ───────────────────────────────────────

    #[test]
    fn sync_message_roundtrip() {
        let msg = state::SyncMessage {
            peer_id: "peer-1".into(),
            changes: vec![state::ChangeOp {
                key: b"track/0/name".to_vec(),
                value: b"Drums".to_vec(),
                seq: 42,
            }],
            clock: 1000,
            needs_ack: true,
        };
        let bytes = msg.encode_to_vec();
        let decoded = state::SyncMessage::decode(bytes.as_slice()).unwrap();
        assert_eq!(decoded.peer_id, "peer-1");
        assert_eq!(decoded.changes.len(), 1);
        assert_eq!(decoded.changes[0].key, b"track/0/name");
        assert!(decoded.needs_ack);
    }

    #[test]
    fn state_snapshot_roundtrip() {
        let snap = state::StateSnapshot {
            automerge_binary: vec![1, 2, 3, 4, 5],
            saved_at: 1700000000,
            peer_id: "node-a".into(),
        };
        let bytes = snap.encode_to_vec();
        let decoded = state::StateSnapshot::decode(bytes.as_slice()).unwrap();
        assert_eq!(decoded.automerge_binary.len(), 5);
        assert_eq!(decoded.peer_id, "node-a");
    }

    // ── Visual Contracts ───────────────────────────────────────────

    #[test]
    fn visual_contracts_exist() {
        let rect = visual::DrawRect::default();
        assert_eq!(rect.x, 0.0);
        assert_eq!(rect.width, 0.0);
    }

    // ── AI Contracts ───────────────────────────────────────────────

    #[test]
    fn ai_contracts_exist() {
        let _req = ai::InferenceRequest::default();
    }
}
