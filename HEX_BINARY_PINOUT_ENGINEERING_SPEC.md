# SENSORIUM STUDIO OS — HARDWARE ENGINE SPECIFICATION
## DOCUMENT ID: `SENSORIUM-SPEC-2026-HEXPINOUT-REV4.2`
### Hardware & Protocol Engineering Blueprint: Low-Level Bit/Byte Schematics, Physical Pinouts & DMA Packet Layouts (1995–2026)

---

## 1. PHYSICAL PINOUT & VOLTAGE ISOLATION SCHEMATICS

### 1.1 DIN 5-Pin 180° ISO 10373 Hardware Connector
Industry standard physical interface for legacy hardware (Roland TR-909, TB-303, Akai MPC, Moog, Sequential, Lexicon).

```
          PHYSICAL MALE CONNECTOR (FRONT VIEW)
                   
                     ┌───┬───┐
                   /   [3]   \
                  │ [5]     [4] │
                  │  [1]   [2]  │
                   \     █     /
                     └───┴───┘

Pin 1: Unassigned / Reserved (+5V DC Pull-up on specialized DIN-Sync24)
Pin 2: Shield / Chassis Ground (Connected to cable shield ONLY at transmitter)
Pin 3: Unassigned / Reserved (Sync Pulse +5V on Roland DIN-Sync24)
Pin 4: Current Loop (+) Positive / VCC (+5V DC via 220Ω 1% Resistor)
Pin 5: Current Loop (-) Negative / Data Transmission (TXD via 220Ω 1% Resistor)
```

#### Opto-Coupler Isolation Schematic (Receiver Circuit - Prevent Ground Loops)
```
  DIN Pin 4 (+5V Loop) ───────[ 220 Ω ]───────┐
                                              │  ┌────────────┐
                                             ┌┴┐ │ 6N138 /    │
                                            ▲  │ │ PC900      │
  DIN Pin 5 (Data Loop) ────────────────────┼──┤ │ OPTOCOUPLER│───── RXD (To MCU / UART)
                                             │ │ │            │
                                             └─┘ └────────────┘
  DIN Pin 2 (Shield) ───[ Chassis GND ]               │
                                                     GND
```

---

### 1.2 3.5mm TRS MIDI Adapter Pinout Matrix (Standardization)

| TRS Pin | Type A (MMA Standard) | Type B (Arturia Legacy) | Type C (Korg Classic) | Signal Function |
| :--- | :--- | :--- | :--- | :--- |
| **Tip** | DIN Pin 5 (Data -) | DIN Pin 4 (Data +) | DIN Pin 5 (Data -) | Current Loop Output / Input |
| **Ring** | DIN Pin 4 (Data +) | DIN Pin 5 (Data -) | Shield / GND | Current Loop Power Supply (+5V) |
| **Sleeve**| DIN Pin 2 (Shield) | DIN Pin 2 (Shield) | DIN Pin 4 (Data +) | Ground / Cable Shield |

---

### 1.3 RS-422 Differential Serial Interface (Macintosh / Akai SCSI / Vintage Studio Buses)
Used on 1990s legacy devices for high-speed serial communication (38.4 kbit/s – 230.4 kbit/s).

```
DB-9 / Mini-DIN 8 Pinout Map:
Pin 1: HSKo (Handshake Output - RTS)      -> Voltage Level: -5V to +5V Differential
Pin 2: HSKi (Handshake Input - CTS)       -> Differential Line Pair (-)
Pin 3: TxD- (Transmit Data Differential -)-> RS-422 Inverting Driver
Pin 4: GND  (Signal Ground)               -> 0V Reference
Pin 5: RxD- (Receive Data Differential -) -> RS-422 Inverting Receiver
Pin 6: TxD+ (Transmit Data Differential +)-> RS-422 Non-Inverting Driver
Pin 7: GPi  (General Purpose Input)       -> Clock Trigger Interrupt
Pin 8: RxD+ (Receive Data Differential +) -> RS-422 Non-Inverting Receiver
```

---

### 1.4 USB 2.0 & USB 3.2 Gen 2x2 High-Speed Pinouts

#### USB Type-C High-Speed Differential Bus
```
   A1   A2   A3   A4   A5   A6   A7   A8   A9   A10  A11  A12
  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐
  │GND │TX1+│TX1-│VBUS│CC1 │D+  │D-  │SBU1│VBUS│RX2-│RX2+│GND │
  ├────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┼────┤
  │GND │RX1+│RX1-│VBUS│SBU2│D-  │D+  │CC2 │VBUS│TX2-│TX2+│GND │
  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘
   B12  B11  B10  B9   B8   B7   B6   B5   B4   B3   B2   B1
```

- **VBUS**: +5.0V DC (Up to 3.0A Power Delivery)
- **D+ / D-**: USB 2.0 Differential Half-Duplex Data Lines (480 Mbit/s)
- **TX1 / RX1 / TX2 / RX2**: SuperSpeed Differential Lanes (Up to 20 Gbps for Sensorium FPGA Direct DMA)
- **CC1 / CC2**: Configuration Channel (Cable Orientation & USB PD Handshake)

---

### 1.5 CV / Gate Analog Signal Voltages
```
CV Pitch Standard:      1.000 V / Octave (0.000V = C0, 1.000V = C1 ... 5.000V = C5)
Resolution Requirement: 16-Bit DAC (0x0000 = 0.000V, 0xFFFF = 10.000V -> 0.00015V per LSB)
Gate Trigger Voltage:   Off = 0.0V DC (0x00) | On = +5.0V DC (0xFF) / V-Trig
S-Trig (Moog Legacy):   Off = Open Circuit (+5V Pull-up) | On = Short Circuit to GND (0V)
```

---

## 2. SERIAL FRAME & BYTE ARCHITECTURE

### 2.1 31.25 kbit/s Asynchronous Serial Bit Frame (DIN MIDI)
Each byte transmitted over a DIN 5-pin physical line takes **320 microseconds** (10 bits total).

```
┌───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┐
│ START │ BIT 0 │ BIT 1 │ BIT 2 │ BIT 3 │ BIT 4 │ BIT 5 │ BIT 6 │ BIT 7 │ STOP  │
│  (0)  │ (LSB) │       │       │       │       │       │ (MSB) │ (PAR) │  (1)  │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┘
│◄───── 32 µs ─────►│                                                   │◄─32µs─►│
│◄───────────────────────────── 320 µs (1 Byte Frame) ──────────────────────────►│
```

---

### 2.2 Status Byte vs. Data Byte Binary Structure

| Byte Class | Bit 7 (MSB) | Bit 6..4 | Bit 3..0 | Value Range (Hex) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Status Byte** | `1` | `Command Opcode` | `Channel (0-15)` | `0x80` – `0xFF` | Initiates new command |
| **Data Byte** | `0` | `7-Bit Data Payload` | `7-Bit Data` | `0x00` – `0x7F` | Parameter, Pitch, Velocity |

---

### 2.3 Bitwise Command Decoding Table

| Command Type | Hex Prefix | Binary Pattern | Byte 1 (Data 1) | Byte 2 (Data 2) |
| :--- | :--- | :--- | :--- | :--- |
| **Note Off** | `0x8n` | `1000 nnnn` | Key Number (`0x00 - 0x7F`) | Release Velocity (`0x00 - 0x7F`) |
| **Note On** | `0x9n` | `1001 nnnn` | Key Number (`0x00 - 0x7F`) | Attack Velocity (`0x01 - 0x7F`) |
| **Polyphonic Aftertouch**| `0xAn` | `1010 nnnn` | Key Number (`0x00 - 0x7F`) | Pressure Value (`0x00 - 0x7F`) |
| **Control Change (CC)** | `0xBn` | `1011 nnnn` | Controller ID (`0x00 - 0x7F`)| Controller Value (`0x00 - 0x7F`) |
| **Program Change** | `0xCn` | `1100 nnnn` | Program ID (`0x00 - 0x7F`) | *(None)* |
| **Channel Pressure** | `0xDn` | `1101 nnnn` | Pressure Value (`0x00 - 0x7F`) | *(None)* |
| **Pitch Bend Change** | `0xEn` | `1110 nnnn` | LSB 7-Bit (`0x00 - 0x7F`) | MSB 7-Bit (`0x00 - 0x7F`) |
| **System Exclusive Start**|`0xF0` | `1111 0000` | Manufacturer ID | Variable Payload Data... |
| **MIDI Clock Tick** | `0xF8` | `1111 1000` | *(Single Byte Realtime)* | *(24 Ticks per Quarter Note)* |
| **MIDI Start** | `0xFA` | `1111 1010` | *(Single Byte Realtime)* | Resets Sequencer Position |
| **MIDI Continue** | `0xFB` | `1111 1011` | *(Single Byte Realtime)* | Resumes Playback |
| **MIDI Stop** | `0xFC` | `1111 1100` | *(Single Byte Realtime)* | Halts Playback |
| **System Exclusive End** |`0xF7` | `1111 0111` | *(End Marker)* | Terminates SysEx Transmission |

---

## 3. MANUFACTURER SYSTEM EXCLUSIVE (SYSEX) BIT & BYTE MAPS

### 3.1 Roland Hardware SysEx Frame Blueprint
```
Frame Structure:
[0xF0]  System Exclusive Start
[0x41]  Roland Manufacturer ID
[0x10]  Device ID (Unit #1 = 0x10, Unit #2 = 0x11...)
[0x00]  Model ID High (e.g., TR-909 = 0x00, JP-8000 = 0x80, JV-1080 = 0x6A)
[0x09]  Model ID Low
[0x12]  Command ID (0x11 = Request Data DT1, 0x12 = Send Data RQ1)
[0x00]  Address High Byte
[0x00]  Address Mid Byte
[0x01]  Address Low Byte
[DATA]  Payload Data Bytes (0x00 - 0x7F)
[CHK]   Roland Checksum Byte
[0xF7]  System Exclusive End
```

#### Roland Checksum Calculation Formula
```c
// Algorithm: Sum all Address and Data Bytes, modulo 128, subtract from 128
uint8_t calculate_roland_checksum(uint8_t *address_and_data, size_t length) {
    uint32_t sum = 0;
    for (size_t i = 0; i < length; i++) {
        sum += address_and_data[i];
    }
    uint8_t remainder = sum % 128;
    return (128 - remainder) & 0x7F; // 7-bit result
}
```

---

### 3.2 Akai MPC Sampler SysEx Frame Blueprint
```
Frame Structure:
[0xF0]  System Exclusive Start
[0x47]  Akai Manufacturer ID
[0x00]  Device ID (MPC2000XL = 0x00)
[0x20]  Model ID (MPC Series = 0x20)
[0x48]  Opcode (0x48 = Sample Header Dump, 0x49 = Pad Assignment)
[0x00]  Pad Number (Pad A01 = 0x00 ... Pad D16 = 0x3F)
[DATA]  16-Bit Sample Word High & Low Nibbles (Split into 7-bit bytes)
[0xF7]  System Exclusive End
```

---

### 3.3 Elektron TurboMIDI High-Speed Protocol Handshake
TurboMIDI increases 5-Pin DIN baud rate up to 10x (`312.5 kbit/s`).

```
Handshake Byte Sequence:
Host Send:   0xF0 0x00 0x20 0x3C 0x00 0x01 0x01 [Speed Request: 0x0A = 10x] 0xF7
Device Ack:  0xF0 0x00 0x20 0x3C 0x00 0x01 0x02 [Speed Accept:  0x0A = 10x] 0xF7
UART Reconfig: Switch MCU Baud Rate from 31,250 bps -> 312,500 bps within 5.0ms.
```

---

## 4. SENSORIUM 2026 FPGA ULTRA-LOW LATENCY DMA PACKET BLUEPRINT
*64-Byte Raw DMA Hardware Packet Transmitted Over USB-C / PCIe Interconnect*

```
Byte Offset | Field Name            | Data Type     | Bit Alignment & Description
────────────┼───────────────────────┼───────────────┼───────────────────────────────────────────────────────────
0x00 - 0x02 | Magic Header          | 3 Bytes ASCII | 'S' 'N' 'S' (0x53 0x4E 0x53)
0x03        | Protocol Version      | UINT8         | 0x20 (Version 2.0)
0x04 - 0x0B | Nanosecond Timestamp  | UINT64 (BE)   | 64-Bit System Hardware Timer (0.0001ms Precision)
0x0C        | Physical Port ID      | UINT8         | 0x01 = DIN1, 0x02 = DIN2, 0x03 = USB, 0x04 = CV1
0x0D        | Command Type Flags    | UINT8         | Bit 0: Realtime, Bit 1: MPE, Bit 2: SysEx, Bit 3: CV-Out
0x0E - 0x0F | Payload Byte Length   | UINT16 (BE)   | Number of valid MIDI/CV bytes in payload (e.g. 0x0003)
0x10 - 0x3B | Payload Buffer        | 44 Bytes Raw  | Raw MIDI Message / 16-Bit DAC Voltages
0x3C - 0x3F | CRC32 Hardware Check  | UINT32 (BE)   | IEEE 802.3 Ethernet Polynomial CRC (0x04C11DB7)
```

### Hexadecimal Memory Dump Example (Sensorium Note On + Nano Timestamp Packet)
```
00000000: 53 4E 53 20 00 00 01 8F  A2 3C 90 12 01 02 00 03  │SNS .....<.│
00000010: 90 3C 7F 00 00 00 00 00  00 00 00 00 00 00 00 00  │.<..........│
00000020: 00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00  │............│
00000030: 00 00 00 00 00 00 00 00  00 00 00 00 C4 A8 1F 92  │............│
```

---

## 5. ABLETON LIVE 12 REMOTE SCRIPT CONTROL SURFACE ASCII PROTOCOL

### 5.1 Connection Handshake Protocol
```
Sensorium Host -> Ableton Socket (Port 9001 UDP/TCP):
"SENSORIUM_CONNECT\n" -> Hex: 53 45 4E 53 0F 52 49 55 4D 5F 43 4F 4E 4E 45 43 54 0A

Ableton Response Ack:
"SENSORIUM_ACK_V12\n" -> Hex: 53 45 4E 53 0F 52 49 55 4D 5F 41 43 4B 5F 56 31 32 0A
```

### 5.2 ASCII Telemetry Feedback Strings
- **Tempo Sync Command**: `SET_TEMPO 128.00\n`
- **Track Arm Query**: `GET_TRACK_ARM 1\n` -> Response: `TRACK_ARM 1 1\n`
- **Clip Trigger Direct**: `FIRE_CLIP 2 4\n` (Track 2, Scene 4)

---

## 6. VERIFICATION & ELECTRICAL TEST PROCEDURE

1. **Oscilloscope Voltage Check**: Measure DIN Pin 4 to Pin 5 differential voltage. Must read **+5.0V ±0.2V** at idle, dropping to **0.0V** during active start bits.
2. **Current Loop Test**: Verify current draw during logic low bit states is **5.0 mA ±0.5 mA** across the 220Ω isolation resistor.
3. **Optocoupler Rise Time**: Ensure 6N138 collector rise time $t_r \le 1.5\,\mu\text{s}$ to prevent bit distortion at 31.25 kbit/s.

---
*SPECIFICATION END — SENSORIUM HARDWARE OS REV 4.2 (2026)*
