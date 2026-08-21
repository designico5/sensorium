/// Audio engine contracts (sensorium.audio)
/// Source: specs/audio-engine.proto

#[derive(Clone, PartialEq, prost::Message)]
pub struct AudioCallback {
    #[prost(int64, tag = "1")]
    pub sample_index: i64,
    #[prost(int32, tag = "2")]
    pub channel_count: i32,
    #[prost(float, repeated, tag = "3")]
    pub input: Vec<f32>,
    #[prost(float, repeated, tag = "4")]
    pub output: Vec<f32>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct Parameter {
    #[prost(string, tag = "1")]
    pub id: String,
    #[prost(float, tag = "2")]
    pub normalized_value: f32,
    #[prost(float, tag = "3")]
    pub raw_value: f32,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct Transport {
    #[prost(double, tag = "1")]
    pub tempo: f64,
    #[prost(bool, tag = "2")]
    pub playing: bool,
    #[prost(int64, tag = "3")]
    pub position_samples: i64,
    #[prost(uint32, tag = "4")]
    pub time_signature_numerator: u32,
    #[prost(uint32, tag = "5")]
    pub time_signature_denominator: u32,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct AudioEngineState {
    #[prost(message, repeated, tag = "1")]
    pub parameters: Vec<Parameter>,
    #[prost(message, optional, tag = "2")]
    pub transport: Option<Transport>,
}
