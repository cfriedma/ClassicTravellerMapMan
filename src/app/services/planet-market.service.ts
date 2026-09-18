import { Injectable } from '@angular/core';
import { DiceUtils } from '../shared/dice-utils';
import { World } from '../models/world';
import { EquipmentItem } from '../models/equipment';
import { TradeGood } from '../models/trade-goods';
import { DrugMarketState, PlanetMarketState, TradePriceResult } from '../models/planet-market';
import { EquipmentCatalogService } from './equipment-catalog.service';
import { SubsectorManagerService } from './subsector-manager.service';

@Injectable({
  providedIn: 'root'
})
export class PlanetMarketService {
  constructor(
    private catalog: EquipmentCatalogService,
    private subsectorManager: SubsectorManagerService
  ) {}

  async ensureMarket(world: World): Promise<PlanetMarketState> {
    await this.catalog.ensureLoaded();
    if (!world.market) {
      world.market = {
        tradeResults: this.rollAllTradeResults(world),
        drugs: this.rollAllDrugs(world, true, true)
      };
      this.persist();
      return world.market;
    }

    let changed = false;
    for (const good of this.catalog.getGoods()) {
      if (!world.market.tradeResults[good.die]) {
        world.market.tradeResults[good.die] = this.rollTradeResult(world, good);
        changed = true;
      }
    }
    for (const drug of this.catalog.getDrugs()) {
      if (!world.market.drugs[drug.name]) {
        world.market.drugs[drug.name] = this.rollDrugState(world, drug, true, true);
        changed = true;
      } else if (drug.isPsiDrug) {
        const illegal = !world.isPsionicsPermitted();
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
    market.tradeResults = this.rollAllTradeResults(world);
    this.persist();
  }

  async rerollDrugAvailability(world: World): Promise<void> {
    await this.catalog.ensureLoaded();
    const market = await this.ensureMarket(world);
    market.drugs = this.rollAllDrugs(world, true, false, market.drugs);
    this.persist();
  }

  getPurchaseDm(world: World, good: TradeGood): number {
    const classes = world.getTradeClasses();
    let dm = 0;
    for (const tradeClass of classes) {
      const value = good.purchaseDms[tradeClass];
      if (typeof value === 'number') {
        dm += value;
      }
    }
    return dm;
  }

  getPricePercent(item: EquipmentItem, market: PlanetMarketState): number | null {
    if (!this.isMapped(item) || !item.tradeDie) {
      return null;
    }
    const result = market.tradeResults[item.tradeDie];
    return result ? result.percent : null;
  }

  isIllegalByLaw(item: EquipmentItem, world: World): boolean {
    return item.illegalFromLawLevel != null
      && world.planetLawLevel.key >= item.illegalFromLawLevel;
  }

  getPurchasePrice(item: EquipmentItem, world: World): number | string | null {
    if (this.isIllegalByLaw(item, world) && item.illegalPrice != null && item.illegalPrice !== '') {
      const extraLaw = world.planetLawLevel.key - (item.illegalFromLawLevel ?? world.planetLawLevel.key);
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

  getCargoLocalPrice(good: TradeGood, market: PlanetMarketState): number {
    const result = market.tradeResults[good.die];
    const percent = result ? result.percent : 100;
    return good.basePriceCr * (percent / 100);
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

  private rollAllTradeResults(world: World): Record<string, TradePriceResult> {
    const results: Record<string, TradePriceResult> = {};
    for (const good of this.catalog.getGoods()) {
      results[good.die] = this.rollTradeResult(world, good);
    }
    return results;
  }

  private rollTradeResult(world: World, good: TradeGood): TradePriceResult {
    const dm = this.getPurchaseDm(world, good);
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
      return !world.isPsionicsPermitted();
    }
    const legal = DiceUtils.rollStandardCheck(world.planetLawLevel.key);
    return !legal;
  }
}
