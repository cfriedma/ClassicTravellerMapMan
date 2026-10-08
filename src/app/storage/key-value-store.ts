import { InjectionToken } from '@angular/core';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const KEY_VALUE_STORE = new InjectionToken<KeyValueStore>('KEY_VALUE_STORE');

/**
 * Serializes reads and writes so a later save cannot finish before an earlier one.
 */
export abstract class QueuedKeyValueStore implements KeyValueStore {
  private chain: Promise<void> = Promise.resolve();

  protected enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.chain.then(task, task);
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  abstract getItem(key: string): Promise<string | null>;
  abstract setItem(key: string, value: string): Promise<void>;
  abstract removeItem(key: string): Promise<void>;
}
