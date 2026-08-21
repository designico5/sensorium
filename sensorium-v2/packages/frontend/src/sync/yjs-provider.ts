import { SensoriumSyncClient } from './yjs-doc';

export interface WebTransportConfig {
  url: string;
  headers?: Record<string, string>;
}

export class YjsWebTransportSync {
  private client: SensoriumSyncClient | null = null;

  constructor(private config: WebTransportConfig) {}

  async connect() {
    // Placeholder for future y-webtransport integration.
    // This will bridge Yjs document state through a WebTransport
    // channel to the Rust automerge-repo backend.
    console.log('Yjs <-> WebTransport sync not implemented yet', this.config);
  }

  async disconnect() {
    this.client?.destroy();
    this.client = null;
  }
}