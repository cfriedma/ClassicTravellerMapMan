import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  MAP_SCALE_MAX,
  MAP_SCALE_MIN,
  PriceSource,
  ThemeName
} from '../models/settings';

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
        return { ...DEFAULT_SETTINGS };
      }
      return this.normalize({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private save(settings: AppSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  private normalize(settings: AppSettings): AppSettings {
    const priceSource: PriceSource = ['base', 'purchase', 'resale'].includes(settings.priceSource)
      ? settings.priceSource
      : DEFAULT_SETTINGS.priceSource;
    const theme: ThemeName = settings.theme === 'dark' ? 'dark' : 'light';
    const mapScale = Math.min(
      MAP_SCALE_MAX,
      Math.max(MAP_SCALE_MIN, Number(settings.mapScale) || DEFAULT_SETTINGS.mapScale)
    );

    return {
      psionicsEnabled: settings.psionicsEnabled !== false,
      autoRollBalkanization: settings.autoRollBalkanization === true,
      priceSource,
      mapScale,
      theme
    };
  }

  private applyTheme(theme: ThemeName): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
