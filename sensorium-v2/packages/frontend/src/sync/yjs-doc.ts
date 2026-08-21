/**
 * Sensorium Yjs Sync Client (Scaffold)
 * 
 * This module provides collaborative document sync via Yjs.
 * Dependencies (yjs, y-webrtc, y-indexeddb) are not yet installed.
 * Enable by installing: npm install yjs y-webrtc y-indexeddb
 */

export interface Track {
  id: string;
  name: string;
  clips: Clip[];
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

export interface Clip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
}

export interface SensoriumDoc {
  tracks: Track[];
  settings: Record<string, unknown>;
}

/**
 * Create a local Sensorium document (non-collaborative scaffold).
 * Replace with Yjs implementation when dependencies are available.
 */
export function createSensoriumDoc(): SensoriumDoc {
  return {
    tracks: [],
    settings: { tempo: 120, timeSignature: [4, 4] },
  };
}

/**
 * Sync client scaffold — no-op until Yjs deps are installed.
 */
export class SensoriumSyncClient {
  private doc: SensoriumDoc;

  constructor(_room: string, _signaling: string[]) {
    this.doc = createSensoriumDoc();
  }

  async connect() {
    console.warn('[SensoriumSync] Yjs not available — running in local mode');
  }

  getTracks(): Track[] {
    return this.doc.tracks;
  }

  getSettings(): Record<string, unknown> {
    return this.doc.settings;
  }

  destroy() {
    // no-op
  }
}
