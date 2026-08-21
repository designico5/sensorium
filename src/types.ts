/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DeviceStatus = 'Healthy' | 'Warn' | 'Error';

export type DeviceType = 'USB Controller' | 'Synthesizer' | 'Drum Machine' | 'Internal MIDI' | 'Virtual Bridge';

export interface MidiDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  isPhysicalHardware?: boolean;
  connectionType?: 'PHYSICAL_USB' | 'VIRTUAL_SIMULATION';
  portNameIn: string;
  portNameOut: string;
  bufferUsage: number; // 0 - 100%
  clockDrift: number; // in milliseconds
  latency: number; // in milliseconds
  latencyHistory?: number[]; // history of latency values (ms) for real-time charts
  dropCount: number;
  lastMessageTime: number;
  lastMessageValue: string;
  errorMessage?: string;
  recommendation?: string;
  triggerDirection?: 'Rising Edge' | 'Falling Edge' | 'Bidirectional';
  midiChannel?: number;
  ccFilterActive?: boolean;
  velocityCurve?: 'Linear' | 'Exponential' | 'Logarithmic' | 'Fixed';
  pollingRate?: 250 | 500 | 1000;
  debounceMs?: number;
  noiseFloor?: number;
  usbSuspensionDisabled?: boolean;
  bufferSizeSamples?: 32 | 64 | 128 | 256 | 512 | 1024;
  driftCompensationMs?: number;
  autoRecalibrateEnabled?: boolean;
  firmwareVersion?: string;
  latestFirmwareVersion?: string;
  firmwareUpdateAvailable?: boolean;
  firmwareUpdateStatus?: 'idle' | 'downloading' | 'backing_up' | 'updating' | 'success' | 'failed';
  firmwareUpdateProgress?: number;
  backups?: Array<{ id: string; timestamp: string; firmwareVersion: string; note: string }>;
  predictiveRisk?: {
    score: number; // 0-100 risk score
    secondsToError: number; // estimated seconds remaining
    explanation: string; // descriptive warning text
  };
}

export interface DiagnosticCardData {
  id: string;
  deviceId: string;
  deviceName: string;
  symptom: string;
  cause: string;
  action: string;
  severity: 'Warn' | 'Error';
  timestamp: string;
  acknowledged: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  source: 'SYSTEM' | 'ABLETON' | 'OSC' | 'MIDI';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface AbletonState {
  bpm: number;
  isPlaying: boolean;
  beat: number;
  bar: number;
  activeClip: string;
  trackArmed: string;
  deviceName: string;
  remoteScriptStatus: 'CONNECTED' | 'DISCONNECTED' | 'INSTALL_PENDING';
}
