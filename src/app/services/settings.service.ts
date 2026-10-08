import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  ThemeName,
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
    this.applyTheme(this.snapshot.theme);
  }

  get snapshot(): AppSettings {
    return this.settingsSubject.value;
  }

  async hydrate(): Promise<void> {
    try {
      const raw = await this.store.getItem(this.STORAGE_KEY);
      if (!raw) {
        this.applyTheme(this.snapshot.theme);
        return;
      }
      const next = this.normalize({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      this.settingsSubject.next(next);
      this.applyTheme(next.theme);
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
      this.applyTheme(this.snapshot.theme);
    }
  }

  patch(partial: Partial<AppSettings>): void {
    const next = this.normalize({ ...this.snapshot, ...partial });
    this.settingsSubject.next(next);
    this.save(next);
    this.applyTheme(next.theme);
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

  private applyTheme(theme: ThemeName): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
