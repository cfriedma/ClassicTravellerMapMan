export type TradeClassCode = 'A' | 'NA' | 'I' | 'NI' | 'R' | 'P';

export interface TradePriceResult {
    roll: number;
    dm: number;
    percent: number;
}

export interface DrugMarketState {
    available: boolean;
    illegal: boolean;
}

export interface PlanetMarketState {
    tradeResults: Record<string, TradePriceResult>;
    resaleResults?: Record<string, TradePriceResult>;
    drugs: Record<string, DrugMarketState>;
}
