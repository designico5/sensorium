#[cfg(test)]
mod tests {
    use super::ump::ump::{parse, Error, Packet};

    #[test]
    fn test_parse_empty_slice() {
        let result = parse(&[]);
        assert_eq!(result, Err(Error::PacketTooShort));
    }

    #[test]
    fn test_parse_single_byte() {
        let bytes = [0x90]; // status byte for Note Off on channel 0
        let result = parse(&bytes);
        assert!(result.is_ok());
        let packet = result.unwrap();
        assert_eq!(packet.packet_type, 0x90);
        assert_eq!(packet.channel, 0);
        assert_eq!(packet.data, Vec::new());
    }

    #[test]
    fn test_parse_multi_byte() {
        let bytes = [0x82, 0x45, 0x67, 0x99]; // status 0x82 (Note On, channel 2), data [0x45,0x67,0x99]
        let result = parse(&bytes);
        assert!(result.is_ok());
        let packet = result.unwrap();
        assert_eq!(packet.packet_type, 0x82);
        assert_eq!(packet.channel, 2);
        assert_eq!(packet.data, vec![0x45, 0x67, 0x99]);
    }

    #[test]
    fn test_decode_note_on() {
        use super::ump_parser::ump::Message;
        let packet = Packet {
            packet_type: 0x80,
            channel: 1,
            data: vec![0x3C, 0x40], // note 60, velocity 64
        };
        let msg = Message::decode_message(&packet).expect("decode_message should succeed");
        match msg {
            Message::ChannelVoice {
                message_type,
                channel,
                data,
            } => {
                assert_eq!(message_type, 0x80);
                assert_eq!(channel, 1);
                assert_eq!(data, vec![0x3C, 0x40]);
            }
            _ => panic!("Expected ChannelVoice message"),
        }
    }

    #[test]
    fn test_decode_note_off() {
        use super::ump_parser::ump::Message;
        let packet = Packet {
            packet_type: 0x90,
            channel: 0,
            data: vec![0x24, 0x66], // note 36, velocity 102
        };
        let msg = Message::decode_message(&packet).expect("decode_message should succeed");
        match msg {
            Message::ChannelVoice {
                message_type,
                channel,
                data,
            } => {
                assert_eq!(message_type, 0x90);
                assert_eq!(channel, 0);
                assert_eq!(data, vec![0x24, 0x66]);
            }
            _ => panic!("Expected ChannelVoice message"),
        }
    }

    #[test]
    fn test_invalid_packet_type() {
        let packet = Packet {
            packet_type: 0xFF,
            channel: 0,
            data: vec![],
        };
        let msg = Message::decode_message(&packet);
        assert_eq!(msg, Err(super::ump::Error::InvalidPacketType));
    }

    #[test]
    fn test_packet_too_short_for_pitch_bend() {
        // Pitch Bend needs at least 2 data bytes
        let packet = Packet {
            packet_type: 0xE0,
            channel: 0,
            data: vec![0x55], // only 1 data byte
        };
        let msg = Message::decode_message(&packet);
        assert_eq!(msg, Err(super::ump::Error::PacketTooShort));
    }
}