export type PriceSource = 'base' | 'purchase' | 'resale';
export type ThemeName = 'light' | 'dark';

export interface AppSettings {
  psionicsEnabled: boolean;
  autoRollBalkanization: boolean;
  priceSource: PriceSource;
  mapScale: number;
  theme: ThemeName;
}

export const DEFAULT_SETTINGS: AppSettings = {
  psionicsEnabled: true,
  autoRollBalkanization: false,
  priceSource: 'purchase',
  mapScale: 1,
  theme: 'light'
};

export const MAP_SCALE_MIN = 0.75;
export const MAP_SCALE_MAX = 1.5;
export const MAP_SCALE_STEP = 0.05;
