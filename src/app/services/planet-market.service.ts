import { Injectable } from '@angular/core';
import { DiceUtils } from '../shared/dice-utils';
import { World } from '../models/world';
import { EquipmentItem } from '../models/equipment';
import { TradeGood } from '../models/trade-goods';
import { DrugMarketState, PlanetMarketState, TradePriceResult } from '../models/planet-market';
import { getItemIllegalFromLawLevel } from '../models/weapon-legality';
import { EquipmentCatalogService } from './equipment-catalog.service';
import { SubsectorManagerService } from './subsector-manager.service';
import { SettingsService } from './settings.service';

type TradeDmKind = 'purchase' | 'resale';

@Injectable({
  providedIn: 'root'
})
export class PlanetMarketService {
  constructor(
    private catalog: EquipmentCatalogService,
    private subsectorManager: SubsectorManagerService,
    private settings: SettingsService
  ) {}

  async ensureMarket(world: World): Promise<PlanetMarketState> {
    await this.catalog.ensureLoaded();
    if (!world.market) {
      world.market = {
        tradeResults: this.rollAllTradeResults(world, 'purchase'),
        resaleResults: this.rollAllTradeResults(world, 'resale'),
        drugs: this.rollAllDrugs(world, true, true)
      };
      this.persist();
      return world.market;
    }

    let changed = false;
    if (!world.market.resaleResults) {
      world.market.resaleResults = this.rollAllTradeResults(world, 'resale');
      changed = true;
    }
    for (const good of this.catalog.getGoods()) {
      if (!world.market.tradeResults[good.die]) {
        world.market.tradeResults[good.die] = this.rollTradeResult(world, good, 'purchase');
        changed = true;
      }
      if (!world.market.resaleResults[good.die]) {
        world.market.resaleResults[good.die] = this.rollTradeResult(world, good, 'resale');
        changed = true;
      }
    }
    for (const drug of this.catalog.getDrugs()) {
      if (!world.market.drugs[drug.name]) {
        world.market.drugs[drug.name] = this.rollDrugState(world, drug, true, true);
        changed = true;
      } else if (drug.isPsiDrug) {
        const illegal = !world.arePsiDrugsLegal();
        if (world.market.drugs[drug.name].illegal !== illegal) {
          world.market.drugs[drug.name] = {
            ...world.market.drugs[drug.name],
            illegal
          };
          changed = true;
        }
      }
    }
    if (changed) {
      this.persist();
    }
    return world.market;
  }

  async rerollPrices(world: World): Promise<void> {
    await this.catalog.ensureLoaded();
    const market = await this.ensureMarket(world);
    market.tradeResults = this.rollAllTradeResults(world, 'purchase');
    market.resaleResults = this.rollAllTradeResults(world, 'resale');
    this.persist();
  }

  async rerollDrugAvailability(world: World): Promise<void> {
    await this.catalog.ensureLoaded();
    const market = await this.ensureMarket(world);
    market.drugs = this.rollAllDrugs(world, true, false, market.drugs);
    this.persist();
  }

  getPurchaseDm(world: World, good: TradeGood): number {
    return this.getDm(world, good, 'purchase');
  }

  getResaleDm(world: World, good: TradeGood): number {
    return this.getDm(world, good, 'resale');
  }

  getActiveDm(world: World, good: TradeGood): number {
    const source = this.settings.snapshot.priceSource;
    if (source === 'resale') {
      return this.getResaleDm(world, good);
    }
    return this.getPurchaseDm(world, good);
  }

  getActiveTradeResult(good: TradeGood, market: PlanetMarketState): TradePriceResult | undefined {
    const source = this.settings.snapshot.priceSource;
    if (source === 'resale') {
      return market.resaleResults?.[good.die];
    }
    return market.tradeResults[good.die];
  }

  getPricePercent(item: EquipmentItem, market: PlanetMarketState): number | null {
    if (this.settings.snapshot.priceSource === 'base') {
      return null;
    }
    if (!this.isMapped(item) || !item.tradeDie) {
      return null;
    }
    const result = this.getResultForDie(item.tradeDie, market);
    return result ? result.percent : null;
  }

  getIllegalFromLawLevel(item: EquipmentItem): number | null {
    return getItemIllegalFromLawLevel(item);
  }

  isIllegalByLaw(item: EquipmentItem, world: World): boolean {
    const fromLaw = this.getIllegalFromLawLevel(item);
    return fromLaw != null && world.planetLawLevel.key >= fromLaw;
  }

  getPurchasePrice(item: EquipmentItem, world: World): number | string | null {
    const fromLaw = this.getIllegalFromLawLevel(item);
    if (this.isIllegalByLaw(item, world) && item.illegalPrice != null && item.illegalPrice !== '') {
      const extraLaw = world.planetLawLevel.key - (fromLaw ?? world.planetLawLevel.key);
      if (typeof item.illegalPrice === 'number') {
        return item.illegalPrice * (1 + extraLaw);
      }
      return item.illegalPrice;
    }
    return item.price;
  }

  getLocalPrice(item: EquipmentItem, market: PlanetMarketState, world?: World): number | null {
    const price = world ? this.getPurchasePrice(item, world) : item.price;
    if (typeof price !== 'number') {
      return null;
    }
    const percent = this.getPricePercent(item, market);
    if (percent == null) {
      return price;
    }
    return price * (percent / 100);
  }

  getCargoPrice(good: TradeGood, market: PlanetMarketState): number {
    if (this.settings.snapshot.priceSource === 'base') {
      return good.basePriceCr;
    }
    const result = this.getActiveTradeResult(good, market);
    const percent = result ? result.percent : 100;
    return good.basePriceCr * (percent / 100);
  }

  getCargoLocalPrice(good: TradeGood, market: PlanetMarketState): number {
    return this.getCargoPrice(good, market);
  }

  formatMoney(amount: number, currency: string = 'Cr'): string {
    const rounded = currency === 'MCr'
      ? Math.round(amount * 1000) / 1000
      : Math.round(amount);
    return `${currency}${rounded.toLocaleString()}`;
  }

  formatItemPrice(price: number | string | null, currency: string): string {
    if (price == null || price === '') {
      return 'Variable';
    }
    if (typeof price === 'number') {
      return this.formatMoney(price, currency || 'Cr');
    }
    return `${currency || 'Cr'}${price}`;
  }

  private persist(): void {
    this.subsectorManager.persistCurrentSubsector();
  }

  private isMapped(item: EquipmentItem): boolean {
    return !!item.tradeDie && !!item.tradeGoodTag && item.tradeGoodTag !== 'unmapped';
  }

  private getResultForDie(die: string, market: PlanetMarketState): TradePriceResult | undefined {
    const source = this.settings.snapshot.priceSource;
    if (source === 'resale') {
      return market.resaleResults?.[die];
    }
    return market.tradeResults[die];
  }

  private getDm(world: World, good: TradeGood, kind: TradeDmKind): number {
    const classes = world.getTradeClasses();
    const table = kind === 'resale' ? good.resaleDms : good.purchaseDms;
    let dm = 0;
    for (const tradeClass of classes) {
      const value = table[tradeClass];
      if (typeof value === 'number') {
        dm += value;
      }
    }
    return dm;
  }

  private rollAllTradeResults(world: World, kind: TradeDmKind): Record<string, TradePriceResult> {
    const results: Record<string, TradePriceResult> = {};
    for (const good of this.catalog.getGoods()) {
      results[good.die] = this.rollTradeResult(world, good, kind);
    }
    return results;
  }

  private rollTradeResult(world: World, good: TradeGood, kind: TradeDmKind): TradePriceResult {
    const dm = this.getDm(world, good, kind);
    const raw = DiceUtils.standardRoll(dm);
    const roll = Math.min(15, Math.max(2, raw));
    return {
      roll,
      dm,
      percent: this.catalog.getActualValuePercent(roll)
    };
  }

  private rollAllDrugs(
    world: World,
    rollAvailability: boolean,
    rollLegality: boolean,
    previous?: Record<string, DrugMarketState>
  ): Record<string, DrugMarketState> {
    const drugs: Record<string, DrugMarketState> = {};
    for (const drug of this.catalog.getDrugs()) {
      drugs[drug.name] = this.rollDrugState(world, drug, rollAvailability, rollLegality, previous?.[drug.name]);
    }
    return drugs;
  }

  private rollDrugState(
    world: World,
    drug: EquipmentItem,
    rollAvailability: boolean,
    rollLegality: boolean,
    previous?: DrugMarketState
  ): DrugMarketState {
    const available = rollAvailability
      ? this.rollAvailability(world, drug)
      : previous?.available ?? this.rollAvailability(world, drug);
    const illegal = rollLegality
      ? this.rollIllegal(world, drug)
      : previous?.illegal ?? this.rollIllegal(world, drug);
    return { available, illegal };
  }

  private rollAvailability(world: World, drug: EquipmentItem): boolean {
    const target = drug.availabilityThrow ?? 13;
    const dm = drug.tl == null ? 0 : Math.max(0, world.planetTechLevel - drug.tl);
    return DiceUtils.rollStandardCheck(target, dm);
  }

  private rollIllegal(world: World, drug: EquipmentItem): boolean {
    if (drug.isPsiDrug) {
      return !world.arePsiDrugsLegal();
    }
    const legal = DiceUtils.rollStandardCheck(world.planetLawLevel.key);
    return !legal;
  }
}
