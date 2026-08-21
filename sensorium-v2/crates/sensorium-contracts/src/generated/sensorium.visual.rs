/// Visual engine contracts (sensorium.visual)
/// Source: specs/visual-engine.proto

#[derive(Clone, PartialEq, prost::Message)]
pub struct DrawRect {
    #[prost(float, tag = "1")]
    pub x: f32,
    #[prost(float, tag = "2")]
    pub y: f32,
    #[prost(float, tag = "3")]
    pub width: f32,
    #[prost(float, tag = "4")]
    pub height: f32,
    #[prost(float, tag = "5")]
    pub r: f32,
    #[prost(float, tag = "6")]
    pub g: f32,
    #[prost(float, tag = "7")]
    pub b: f32,
    #[prost(float, tag = "8")]
    pub a: f32,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct DrawText {
    #[prost(string, tag = "1")]
    pub text: String,
    #[prost(float, tag = "2")]
    pub x: f32,
    #[prost(float, tag = "3")]
    pub y: f32,
    #[prost(float, tag = "4")]
    pub size: f32,
    #[prost(float, tag = "5")]
    pub r: f32,
    #[prost(float, tag = "6")]
    pub g: f32,
    #[prost(float, tag = "7")]
    pub b: f32,
    #[prost(float, tag = "8")]
    pub a: f32,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct DrawNode {
    #[prost(uint32, tag = "1")]
    pub id: u32,
    #[prost(float, repeated, tag = "2")]
    pub transform: Vec<f32>,
    #[prost(message, repeated, tag = "3")]
    pub children: Vec<RenderCommand>,
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct RenderCommand {
    #[prost(oneof = "render_command::Payload", tags = "1, 2, 3")]
    pub payload: Option<render_command::Payload>,
}

pub mod render_command {
    #[derive(Clone, PartialEq, prost::Oneof)]
    pub enum Payload {
        #[prost(message, tag = "1")]
        Rect(super::DrawRect),
        #[prost(message, tag = "2")]
        Text(super::DrawText),
        #[prost(message, tag = "3")]
        Node(super::DrawNode),
    }
}

#[derive(Clone, PartialEq, prost::Message)]
pub struct GpuBuffer {
    #[prost(bytes = "vec", tag = "1")]
    pub data: Vec<u8>,
    #[prost(uint32, tag = "2")]
    pub stride: u32,
    #[prost(uint32, tag = "3")]
    pub count: u32,
}
