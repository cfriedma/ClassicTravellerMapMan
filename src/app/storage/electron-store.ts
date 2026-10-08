import { QueuedKeyValueStore } from './key-value-store';

interface CtmmBridge {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

declare global {
  interface Window {
    ctmm?: CtmmBridge;
  }
}

export class ElectronStore extends QueuedKeyValueStore {
  getItem(key: string): Promise<string | null> {
    return this.enqueue(() => this.bridge().getItem(key));
  }

  setItem(key: string, value: string): Promise<void> {
    return this.enqueue(() => this.bridge().setItem(key, value));
  }

  removeItem(key: string): Promise<void> {
    return this.enqueue(() => this.bridge().removeItem(key));
  }

  private bridge(): CtmmBridge {
    const bridge = window.ctmm;
    if (!bridge) {
      throw new Error('Electron storage bridge is not available');
    }
    return bridge;
  }
}
