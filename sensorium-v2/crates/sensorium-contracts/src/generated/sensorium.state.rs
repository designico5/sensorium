/// State sync contracts (sensorium.state)
/// Source: specs/state-sync.proto

#[derive(Clone, PartialEq, prost::Message)]
pub struct ChangeOp {
    #[prost(bytes = "vec", tag = "1")]
    pub key: Vec<u8>,
    #[prost(bytes = "vec", tag = "2")]
    pub value: Vec<u8>,
    #[prost(int64, tag = "3")]
    pub seq: i64,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct SyncMessage {
    #[prost(string, tag = "1")]
    pub peer_id: String,
    #[prost(message, repeated, tag = "2")]
    pub changes: Vec<ChangeOp>,
    #[prost(int64, tag = "3")]
    pub clock: i64,
    #[prost(bool, tag = "4")]
    pub needs_ack: bool,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct StateSnapshot {
    #[prost(bytes = "vec", tag = "1")]
    pub automerge_binary: Vec<u8>,
    #[prost(int64, tag = "2")]
    pub saved_at: i64,
    #[prost(string, tag = "3")]
    pub peer_id: String,
}
