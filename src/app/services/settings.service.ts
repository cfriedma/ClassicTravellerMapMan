import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  normalizeAppSettings
} from '../models/settings';
import { cloneGenerationOptions } from '../models/generation-options';
import { KEY_VALUE_STORE, KeyValueStore } from '../storage/key-value-store';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'traveller_settings';
  private readonly settingsSubject = new BehaviorSubject<AppSettings>(
    this.normalize({ ...DEFAULT_SETTINGS })
  );
  readonly settings$ = this.settingsSubject.asObservable();

  constructor(@Inject(KEY_VALUE_STORE) private store: KeyValueStore) {
    this.applyAppearance(this.snapshot);
  }

  get snapshot(): AppSettings {
    return this.settingsSubject.value;
  }

  async hydrate(): Promise<void> {
    try {
      const raw = await this.store.getItem(this.STORAGE_KEY);
      if (!raw) {
        this.applyAppearance(this.snapshot);
        return;
      }
      const next = this.normalize({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      this.applyAppearance(next);
      this.settingsSubject.next(next);
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
      this.applyAppearance(this.snapshot);
    }
  }

  patch(partial: Partial<AppSettings>): void {
    const next = this.normalize({ ...this.snapshot, ...partial });
    this.applyAppearance(next);
    this.settingsSubject.next(next);
    this.save(next);
  }

  private save(settings: AppSettings): void {
    void this.store.setItem(this.STORAGE_KEY, JSON.stringify(settings)).catch((error) => {
      console.error('Failed to save settings to storage:', error);
    });
  }

  private normalize(settings: Partial<AppSettings> & Record<string, unknown>): AppSettings {
    const normalized = normalizeAppSettings(settings);
    return {
      ...normalized,
      lastGenerationOptions: cloneGenerationOptions(normalized.lastGenerationOptions)
    };
  }

  private applyAppearance(settings: AppSettings): void {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-color', settings.colorCoding ? 'on' : 'off');
  }
}
