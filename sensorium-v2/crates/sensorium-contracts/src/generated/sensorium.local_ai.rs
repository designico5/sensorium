/// Local AI contracts (sensorium.local_ai)
/// Source: specs/local-ai.proto

#[derive(Clone, PartialEq, prost::Message)]
pub struct InferenceRequest {
    #[prost(string, tag = "1")]
    pub prompt: String,
    #[prost(int32, tag = "2")]
    pub max_tokens: i32,
    #[prost(float, tag = "3")]
    pub temperature: f32,
    #[prost(map = "string, string", tag = "4")]
    pub context: std::collections::HashMap<String, String>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct InferenceResponse {
    #[prost(string, tag = "1")]
    pub text: String,
    #[prost(string, repeated, tag = "2")]
    pub tool_calls: Vec<String>,
    #[prost(float, tag = "3")]
    pub confidence: f32,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct FunctionCall {
    #[prost(string, tag = "1")]
    pub name: String,
    #[prost(map = "string, string", tag = "2")]
    pub arguments: std::collections::HashMap<String, String>,
}
