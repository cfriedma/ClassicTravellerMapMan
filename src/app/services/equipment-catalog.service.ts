import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EquipmentCatalogData, EquipmentItem, EQUIPMENT_CATEGORY_ORDER } from '../models/equipment';
import { TradeGood, TradeGoodsCatalogData } from '../models/trade-goods';

@Injectable({
  providedIn: 'root'
})
export class EquipmentCatalogService {
  private loadPromise: Promise<void> | null = null;
  private items: EquipmentItem[] = [];
  private goods: TradeGood[] = [];
  private actualValue: Record<string, number> = {};

  constructor(private http: HttpClient) {}

  ensureLoaded(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.load();
    }
    return this.loadPromise;
  }

  getItems(): EquipmentItem[] {
    return this.items;
  }

  getGoods(): TradeGood[] {
    return this.goods;
  }

  getActualValueTable(): Record<string, number> {
    return this.actualValue;
  }

  getActualValuePercent(roll: number): number {
    const clamped = Math.min(15, Math.max(2, roll));
    return this.actualValue[String(clamped)] ?? 100;
  }

  getGoodByDie(die: string): TradeGood | undefined {
    return this.goods.find(good => good.die === die);
  }

  getDrugs(): EquipmentItem[] {
    return this.items.filter(item => item.category === 'drugs');
  }

  getItemsForCategory(category: string, planetTechLevel: number): EquipmentItem[] {
    return this.items.filter(item =>
      item.category === category && this.isAvailableAtTechLevel(item, planetTechLevel)
    );
  }

  isAvailableAtTechLevel(item: EquipmentItem, planetTechLevel: number): boolean {
    return item.tl == null || item.tl <= planetTechLevel;
  }

  getCategoryTabs(): { id: string; label: string }[] {
    return EQUIPMENT_CATEGORY_ORDER;
  }

  private async load(): Promise<void> {
    const [equipment, tradeGoods] = await Promise.all([
      firstValueFrom(this.http.get<EquipmentCatalogData>('assets/data/equipment.json')),
      firstValueFrom(this.http.get<TradeGoodsCatalogData>('assets/data/trade-goods.json'))
    ]);
    this.items = equipment.items;
    this.goods = tradeGoods.goods;
    this.actualValue = tradeGoods.actualValue;
  }
}
