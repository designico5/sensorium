// @sensorium/shared-protocol
// Generated TypeScript types from Protobuf contracts
// This package is populated by `npm run generate:types` from the root

export interface AudioEngineConfig {
  sampleRate: number;
  blockSize: number;
  inputChannels: number;
  outputChannels: number;
}

export interface Midi20Config {
  maxGroups: 16;
  maxChannelsPerGroup: 16;
  supportsPerNoteExpression: boolean;
  supportsMPE: boolean;
}

export interface StateSyncConfig {
  automergeEnabled: boolean;
  yjsEnabled: boolean;
  webTransportUrl: string;
}

export interface VisualEngineConfig {
  canvasWidth: number;
  canvasHeight: number;
  maxInstances: number;
  useWebGPU: boolean;
}

export interface LocalAIConfig {
  modelPath: string;
  contextLength: number;
  useMetal: boolean;
  useCUDA: boolean;
  useWebGPU: boolean;
}

export type SensoriumConfig = {
  audio: AudioEngineConfig;
  midi: Midi20Config;
  state: StateSyncConfig;
  visual: VisualEngineConfig;
  ai: LocalAIConfig;
};

export const DEFAULT_CONFIG: SensoriumConfig = {
  audio: {
    sampleRate: 48000,
    blockSize: 256,
    inputChannels: 2,
    outputChannels: 2,
  },
  midi: {
    maxGroups: 16,
    maxChannelsPerGroup: 16,
    supportsPerNoteExpression: true,
    supportsMPE: true,
  },
  state: {
    automergeEnabled: true,
    yjsEnabled: true,
    webTransportUrl: 'https://sync.sensorium.dev',
  },
  visual: {
    canvasWidth: 1920,
    canvasHeight: 1080,
    maxInstances: 10000,
    useWebGPU: true,
  },
  ai: {
    modelPath: '',
    contextLength: 8192,
    useMetal: true,
    useCUDA: false,
    useWebGPU: true,
  },
};