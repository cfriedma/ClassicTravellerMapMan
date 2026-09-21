import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  ThemeName,
  normalizeAppSettings
} from '../models/settings';
import { cloneGenerationOptions } from '../models/generation-options';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'traveller_settings';
  private readonly settingsSubject = new BehaviorSubject<AppSettings>(this.load());
  readonly settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.applyTheme(this.snapshot.theme);
  }

  get snapshot(): AppSettings {
    return this.settingsSubject.value;
  }

  patch(partial: Partial<AppSettings>): void {
    const next = this.normalize({ ...this.snapshot, ...partial });
    this.settingsSubject.next(next);
    this.save(next);
    this.applyTheme(next.theme);
  }

  private load(): AppSettings {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return this.normalize({ ...DEFAULT_SETTINGS });
      }
      return this.normalize({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      return this.normalize({ ...DEFAULT_SETTINGS });
    }
  }

  private save(settings: AppSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
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
