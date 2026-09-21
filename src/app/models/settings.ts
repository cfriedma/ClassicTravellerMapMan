import {
  createDefaultGenerationOptions,
  GenerationOptions,
  normalizeGenerationOptions
} from './generation-options';

export type PriceSource = 'base' | 'purchase' | 'resale';
export type ThemeName = 'light' | 'dark';

export interface AppSettings {
  priceSource: PriceSource;
  mapScale: number;
  theme: ThemeName;
  lastGenerationOptions: GenerationOptions;
}

export const DEFAULT_SETTINGS: AppSettings = {
  priceSource: 'purchase',
  mapScale: 1,
  theme: 'light',
  lastGenerationOptions: createDefaultGenerationOptions()
};

export const MAP_SCALE_MIN = 0.75;
export const MAP_SCALE_MAX = 1.5;
export const MAP_SCALE_STEP = 0.05;

export function normalizeAppSettings(settings: Partial<AppSettings> & Record<string, unknown>): AppSettings {
  const priceSource: PriceSource = ['base', 'purchase', 'resale'].includes(settings.priceSource as PriceSource)
    ? settings.priceSource as PriceSource
    : DEFAULT_SETTINGS.priceSource;
  const theme: ThemeName = settings.theme === 'dark' ? 'dark' : 'light';
  const mapScale = Math.min(
    MAP_SCALE_MAX,
    Math.max(MAP_SCALE_MIN, Number(settings.mapScale) || DEFAULT_SETTINGS.mapScale)
  );

  const rawGeneration = settings.lastGenerationOptions
    ?? {
      ...createDefaultGenerationOptions(),
      psionicsEnabled: settings['psionicsEnabled'] !== false,
      autoRollBalkanization: settings['autoRollBalkanization'] === true
    };

  return {
    priceSource,
    mapScale,
    theme,
    lastGenerationOptions: normalizeGenerationOptions(rawGeneration)
  };
}
