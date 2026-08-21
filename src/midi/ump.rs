/// Module for MIDI 2.0 Universal MIDI Packet (UMP) parsing.
///
/// This module provides a simple stub parser that can be extended to
/// fully implement the UMP specification (Versions 1.1 and 2.0).
pub mod ump {
    /// Error type for UMP parsing.
    #[derive(Debug, PartialEq)]
    pub enum Error {
        /// Packet too short
        PacketTooShort,
        /// Invalid packet type
        InvalidPacketType,
        /// Reserved field non‑zero
        ReservedNonZero,
        /// Other custom error
        Custom(String),
    }

    /// Represents a parsed UMP packet.
    #[derive(Debug, PartialEq, Clone)]
    pub struct Packet {
        /// The status byte (high nibble indicates message type)
        pub packet_type: u8,
        /// Channel number (0‑15)
        pub channel: u8,
        /// Data bytes (0 or more)
        pub data: Vec<u8>,
    }

    /// Parse a byte slice into a `Packet`.
    ///
    /// This stub implementation only validates length and extracts the
    /// packet type and channel; it does not interpret the payload.
    ///
    /// # Arguments
    /// * `bytes` – A slice containing the UMP packet bytes.
    ///
    /// # Returns
    /// `Ok(Packet)` on success, `Err(Error)` on failure.
    pub fn parse(bytes: &[u8]) -> std::result::Result<Packet, Error> {
        // Minimal validation: packet must be at least 1 byte (packet type)
        if bytes.is_empty() {
            return Err(Error::PacketTooShort);
        }
        let packet_type = bytes[0] & 0xF0; // high nibble
        let channel = (bytes[0] & 0x0F) as u8;
        let data = if bytes.len() > 1 {
            bytes[1..].to_vec()
        } else {
            Vec::new()
        };
        Ok(Packet { packet_type, channel, data })
    }
}