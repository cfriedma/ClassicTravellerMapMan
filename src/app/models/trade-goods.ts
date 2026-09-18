import { TradeClassCode } from "./planet-market";

export interface TradeGood {
    die: string;
    name: string;
    basePriceCr: number;
    purchaseDms: Partial<Record<TradeClassCode, number>>;
    resaleDms: Partial<Record<TradeClassCode, number>>;
    quantity: string | null;
    quantityUnit: string | null;
    notes: string | null;
}

export interface TradeGoodsCatalogData {
    goods: TradeGood[];
    actualValue: Record<string, number>;
}
