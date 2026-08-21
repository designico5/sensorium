/// MIDI 2.0 contracts (sensorium.midi)
/// Source: specs/midi-2.0.proto

#[derive(Clone, PartialEq, prost::Message)]
pub struct UmpMessage {
    #[prost(uint32, tag = "1")]
    pub words: u32,
    #[prost(uint32, tag = "2")]
    pub message_type: u32,
    #[prost(uint32, tag = "3")]
    pub group: u32,
    #[prost(uint32, tag = "4")]
    pub status: u32,
    #[prost(uint32, tag = "5")]
    pub data1: u32,
    #[prost(uint32, tag = "6")]
    pub data2: u32,
    #[prost(uint32, tag = "7")]
    pub data3: u32,
    #[prost(uint32, tag = "8")]
    pub data4: u32,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct PerNoteExpression {
    #[prost(uint32, tag = "1")]
    pub note: u32,
    #[prost(uint32, tag = "2")]
    pub attribute: u32,
    #[prost(uint32, tag = "3")]
    pub value: u32,
    #[prost(uint32, tag = "4")]
    pub controller_type: u32,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct Midi2Configuration {
    #[prost(uint32, tag = "1")]
    pub max_groups: u32,
    #[prost(uint32, tag = "2")]
    pub max_streams: u32,
    #[prost(bool, tag = "3")]
    pub per_note_enabled: bool,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct MidiRouterState {
    #[prost(message, optional, tag = "1")]
    pub config: Option<Midi2Configuration>,
    #[prost(message, repeated, tag = "2")]
    pub pending: Vec<UmpMessage>,
}
