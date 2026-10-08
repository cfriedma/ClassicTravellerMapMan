import { QueuedKeyValueStore } from './key-value-store';

export class LocalStorageStore extends QueuedKeyValueStore {
  getItem(key: string): Promise<string | null> {
    return this.enqueue(() => Promise.resolve(localStorage.getItem(key)));
  }

  setItem(key: string, value: string): Promise<void> {
    return this.enqueue(() => {
      localStorage.setItem(key, value);
      return Promise.resolve();
    });
  }

  removeItem(key: string): Promise<void> {
    return this.enqueue(() => {
      localStorage.removeItem(key);
      return Promise.resolve();
    });
  }
}
