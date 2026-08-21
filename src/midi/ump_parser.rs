/// Module for MIDI 2.0 Universal MIDI Packet (UMP) parsing.
///
/// This module provides a comprehensive stub parser that can be extended
/// to fully implement the UMP specification (Versions 1.1 and 2.0).
pub mod ump {
    /// Error type for UMP parsing.
    #[derive(Debug, PartialEq, Eq)]
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

    /// Result type for UMP parsing.
    pub type Result<T> = std::result::Result<T, Error>;

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

    /// MIDI 2.0 UMP message representation.
    #[derive(Debug, PartialEq, Clone)]
    pub enum Message {
        /// Channel Voice Message (0x80-0xEF)
        ChannelVoice {
            /// Message type (0x80 = Note On, 0x90 = Note Off, etc.)
            message_type: u8,
            /// MIDI channel (0‑15)
            channel: u8,
            /// Data bytes specific to the message type
            data: Vec<u8>,
        },
        /// System Common Message (0xF0-0xFF)
        SystemCommon {
            /// Subtype (e.g., SysEx, MIDI 2.0 Specific)
            subtype: u8,
            /// Data bytes
            data: Vec<u8>,
        },
        /// System Real‑Time Message (0xF0-0xFF)
        SystemRealTime {
            /// Command identifier
            command: u8,
            /// Data bytes (usually none)
            data: Vec<u8>,
        },
        /// MIDI 1.0 Compatibility Message
        Compatibility {
            /// MIDI 1.0 message bytes
            data: Vec<u8>,
        },
    }

    /// Parse a byte slice into a `Packet`.
    ///
    /// # Arguments
    /// * `bytes` – A slice containing the UMP packet bytes.
    ///
    /// # Returns
    /// `Ok(Packet)` on success, `Err(Error)` on failure.
    pub fn parse(bytes: &[u8]) -> Result<Packet> {
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

    /// Convert a `Packet` into a high‑level `Message`.
    ///
    /// This stub implementation only decodes the most common Channel Voice
    /// messages; other packet types are treated as generic system messages.
    pub fn decode_message(packet: &Packet) -> Result<Message> {
        let packet_type = packet.packet_type;
        let channel = packet.channel;
        let data = &packet.data;

        match packet_type {
            // 0x80-0xEF = Channel Voice messages
            0x80..=0xEF => {
                // For simplicity, we only handle Note On (0x80), Note Off (0x90),
                // Polyphonic Aftertouch (0xA0), Control Change (0xB0), etc.
                if data.len() >= 2 {
                    let status = packet_type;
                    let note = data[0];
                    let velocity = data[1];
                    match status {
                        0x80 => {
                            // Note On
                            Ok(Message::ChannelVoice {
                                message_type: status,
                                channel,
                                data: vec![note, velocity],
                            })
                        }
                        0x90 => {
                            // Note Off
                            Ok(Message::ChannelVoice {
                                message_type: status,
                                channel,
                                data: vec![note, velocity],
                            })
                        }
                        0xA0 => {
                            // Polyphonic Aftertouch
                            Ok(Message::ChannelVoice {
                                message_type: status,
                                channel,
                                data: vec![note, velocity],
                            })
                        }
                        0xB0 => {
                            // Control Change
                            Ok(Message::ChannelVoice {
                                message_type: status,
                                channel,
                                data: vec![note, velocity],
                            })
                        }
                        0xC0 => {
                            // Program Change
                            Ok(Message::ChannelVoice {
                                message_type: status,
                                channel,
                                data: vec![note],
                            })
                        }
                        0xD0 => {
                            // Channel Pressure
                            Ok(Message::ChannelVoice {
                                message_type: status,
                                channel,
                                data: vec![note],
                            })
                        }
                        0xE0 => {
                            // Pitch Bend Change (2 data bytes: LSB, MSB)
                            if data.len() >= 2 {
                                Ok(Message::ChannelVoice {
                                    message_type: status,
                                    channel,
                                    data: data[..2].to_vec(),
                                })
                            } else {
                                Err(Error::PacketTooShort)
                            }
                        }
                        _ => {
                            // Other unhandled Channel Voice types
                            Err(Error::InvalidPacketType)
                        }
                    }
                } else {
                    Err(Error::PacketTooShort)
                }
            }
            // 0xF0-0xFF = System messages
            0xF0..=0xFF => {
                // System messages are not fully decoded here; we just wrap them.
                Ok(Message::SystemCommon {
                    subtype: packet_type,
                    data: data.clone(),
                })
            }
            // Any other packet_type is invalid
            _ => Err(Error::InvalidPacketType),
        }
    }
}