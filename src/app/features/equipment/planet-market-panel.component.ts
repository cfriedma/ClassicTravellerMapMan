import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { World } from '../../models/world';
import { EquipmentItem, EQUIPMENT_CATEGORY_ORDER } from '../../models/equipment';
import { TradeGood } from '../../models/trade-goods';
import { PlanetMarketState } from '../../models/planet-market';
import { PriceSource } from '../../models/settings';
import { EquipmentCatalogService } from '../../services/equipment-catalog.service';
import { PlanetMarketService } from '../../services/planet-market.service';
import { SettingsService } from '../../services/settings.service';

type MarketTabId = 'trade_goods' | string;

@Component({
  selector: 'app-planet-market-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="market-panel" *ngIf="world && market">
      <div class="market-header">
        <div class="market-title">
          <h3>{{ hexLabel }} Equipment &amp; Market</h3>
          <p class="market-meta">
            TL {{ world.planetTechLevel }}
            · Law {{ world.planetLawLevel.key }}
            · <span *ngIf="tradeClassLabels.length; else noClasses">{{ tradeClassLabels.join(', ') }}</span>
            <ng-template #noClasses>No trade classifications</ng-template>
          </p>
        </div>
        <div class="market-actions">
          <button type="button" class="btn" (click)="rerollPrices()">Reroll Prices</button>
          <button type="button" class="btn" (click)="rerollAvailability()">Reroll Drug Availability</button>
          <button type="button" class="btn btn-close-panel" (click)="closed.emit()">Close</button>
        </div>
      </div>

      <div class="tab-bar">
        <button
          type="button"
          class="tab"
          [class.active]="activeTab === 'trade_goods'"
          (click)="activeTab = 'trade_goods'"
        >Trade Goods</button>
        <button
          type="button"
          class="tab"
          *ngFor="let tab of categoryTabs"
          [class.active]="activeTab === tab.id"
          (click)="activeTab = tab.id"
        >{{ tab.label }}</button>
      </div>

      <div class="tab-body" *ngIf="activeTab === 'trade_goods'">
        <table>
          <thead>
            <tr>
              <th>Die</th>
              <th>Cargo</th>
              <th *ngIf="showTradeModifiers">DM</th>
              <th *ngIf="showTradeModifiers">Roll</th>
              <th *ngIf="showTradeModifiers">Actual</th>
              <th>Price</th>
              <th>Lot</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let good of goods">
              <td>{{ good.die }}</td>
              <td>{{ good.name }}</td>
              <td *ngIf="showTradeModifiers">{{ formatSigned(activeDm(good)) }}</td>
              <td *ngIf="showTradeModifiers">{{ tradeResult(good)?.roll }}</td>
              <td *ngIf="showTradeModifiers">{{ tradeResult(good)?.percent }}%</td>
              <td>{{ formatMoney(cargoPrice(good)) }}</td>
              <td>{{ good.quantity }} {{ good.quantityUnit }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="tab-body" *ngIf="activeTab !== 'trade_goods'">
        <p class="psi-banner" *ngIf="psionicsEnabled && activeTab === 'drugs'">
          <ng-container *ngIf="world.isPsionicsPermitted(); else psiIllegal">
            Psionics are permitted on this world.
          </ng-container>
          <ng-template #psiIllegal>
            Psionics are illegal on this world<span *ngIf="punishmentLabel"> ({{ punishmentLabel }})</span>.
          </ng-template>
          Psi-drugs are {{ world.arePsiDrugsLegal() ? 'legal' : 'illegal' }}.
        </p>
        <p class="law-banner" *ngIf="activeTab === 'weapons' || activeTab === 'ammunition'">
          {{ world.planetLawLevel.label }}
          <span *ngIf="world.planetLawLevel.key > 0"> Prohibitions from lower law levels also apply.</span>
        </p>
        <p class="empty" *ngIf="visibleItems.length === 0">No items at this tech level.</p>
        <table *ngIf="visibleItems.length > 0">
          <thead>
            <tr>
              <th>Name</th>
              <th>TL</th>
              <th>Weight</th>
              <th>Price</th>
              <th *ngIf="showStatusColumn">Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of visibleItems" [class.unavailable]="isUnavailable(item)">
              <td>{{ item.name }}</td>
              <td>{{ item.tl == null ? '—' : item.tl }}</td>
              <td>{{ formatWeight(item) }}</td>
              <td>
                <ng-container *ngIf="displayPriceLabel(item) as price; else noPrice">
                  {{ price }}
                  <span class="pct" *ngIf="pricePercent(item) as pct"> ({{ pct }}%)</span>
                </ng-container>
                <ng-template #noPrice>—</ng-template>
              </td>
              <td *ngIf="showStatusColumn">
                <ng-container *ngIf="activeTab === 'drugs'">
                  <span class="badge" [class.ok]="drugState(item)?.available" [class.bad]="!drugState(item)?.available">
                    {{ drugState(item)?.available ? 'Available' : 'Unavailable' }}
                  </span>
                </ng-container>
                <span
                  *ngIf="hasLegality(item)"
                  class="badge"
                  [class.ok]="!isIllegal(item)"
                  [class.bad]="isIllegal(item)"
                >
                  {{ isIllegal(item) ? 'Illegal' : 'Legal' }}
                </span>
              </td>
              <td>
                <div class="notes" *ngIf="formatNotes(item.notes) as notes; else noNotes">{{ notes }}</div>
                <ng-template #noNotes>—</ng-template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; padding: 0 1rem; }
    .market-panel {
      margin: 0 auto 2rem;
      max-width: 1400px;
      background: var(--bg-card);
      color: var(--text-primary);
      border-radius: 12px;
      box-shadow: 0 4px 20px var(--shadow);
      overflow: hidden;
    }
    .market-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
    }
    .market-title h3 { margin: 0 0 0.35rem; font-size: 1.2rem; }
    .market-meta { margin: 0; opacity: 0.9; font-size: 0.9rem; }
    .market-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .btn {
      background: rgba(255,255,255,0.2);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.35);
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    .btn:hover { background: rgba(255,255,255,0.3); }
    .tab-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      padding: 0.75rem 1rem 0;
      background: var(--bg-muted);
      border-bottom: 1px solid var(--border);
    }
    .tab {
      border: none;
      background: transparent;
      padding: 0.6rem 0.8rem;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-body { padding: 1rem 1.25rem 1.5rem; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.45rem 0.5rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { color: var(--text-primary); font-size: 0.8rem; }
    .notes {
      max-width: 22rem;
      max-height: 7.5rem;
      overflow-y: auto;
      color: var(--text-secondary);
      line-height: 1.4;
      padding-right: 0.35rem;
    }
    .pct { color: var(--accent); font-size: 0.8rem; }
    .badge {
      display: inline-block;
      margin-right: 0.35rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge.ok { background: #d4edda; color: #155724; }
    .badge.bad { background: #f8d7da; color: #721c24; }
    .unavailable { opacity: 0.65; }
    .empty, .psi-banner, .law-banner { margin: 0 0 0.75rem; color: var(--text-secondary); }
    .psi-banner { background: var(--banner-psi-bg); border-left: 3px solid #6f42c1; padding: 0.6rem 0.8rem; }
    .law-banner { background: var(--banner-law-bg); border-left: 3px solid #fd7e14; padding: 0.6rem 0.8rem; }
    @media (max-width: 768px) {
      .market-header { flex-direction: column; }
    }
  `]
})
export class PlanetMarketPanelComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) world!: World;
  @Input() hexLabel = '';
  @Input() psionicsEnabled = true;
  @Output() closed = new EventEmitter<void>();

  activeTab: MarketTabId = 'trade_goods';
  market: PlanetMarketState | null = null;
  goods: TradeGood[] = [];
  categoryTabs = EQUIPMENT_CATEGORY_ORDER;
  tradeClassLabels: string[] = [];
  priceSource: PriceSource = 'purchase';
  private destroy$ = new Subject<void>();

  get visibleItems(): EquipmentItem[] {
    if (!this.world || this.activeTab === 'trade_goods') {
      return [];
    }
    return this.catalog.getItemsForCategory(this.activeTab, this.world.planetTechLevel, this.psionicsEnabled);
  }

  get punishmentLabel(): string | null {
    if (!this.world?.psionicPunishment || this.world.psionicPunishment === 'None') {
      return null;
    }
    return this.world.psionicPunishment;
  }

  get showStatusColumn(): boolean {
    return this.activeTab === 'drugs' || this.visibleItems.some(item => this.hasLegality(item));
  }

  get showTradeModifiers(): boolean {
    return this.priceSource !== 'base';
  }

  constructor(
    private catalog: EquipmentCatalogService,
    private planetMarket: PlanetMarketService,
    private settingsService: SettingsService
  ) {
    this.settingsService.settings$.pipe(takeUntil(this.destroy$)).subscribe(settings => {
      this.priceSource = settings.priceSource;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['world'] || changes['psionicsEnabled']) && this.world) {
      this.refresh();
    }
  }

  async rerollPrices(): Promise<void> {
    await this.planetMarket.rerollPrices(this.world);
    this.syncFromWorld();
  }

  async rerollAvailability(): Promise<void> {
    await this.planetMarket.rerollDrugAvailability(this.world);
    this.syncFromWorld();
  }

  activeDm(good: TradeGood): number {
    return this.planetMarket.getActiveDm(this.world, good);
  }

  tradeResult(good: TradeGood) {
    return this.market ? this.planetMarket.getActiveTradeResult(good, this.market) : undefined;
  }

  cargoPrice(good: TradeGood): number {
    return this.market ? this.planetMarket.getCargoPrice(good, this.market) : good.basePriceCr;
  }

  formatMoney(amount: number): string {
    return this.planetMarket.formatMoney(amount);
  }

  formatSigned(value: number): string {
    if (value > 0) return `+${value}`;
    return String(value);
  }

  formatWeight(item: EquipmentItem): string {
    if (item.weight == null || item.weight === '') {
      return '—';
    }
    return item.weightUnit ? `${item.weight} ${item.weightUnit}` : String(item.weight);
  }

  formatItemPrice(item: EquipmentItem): string {
    const price = this.planetMarket.getPurchasePrice(item, this.world);
    return this.planetMarket.formatItemPrice(price, item.currency || 'Cr');
  }

  displayPriceLabel(item: EquipmentItem): string | null {
    if (!this.market) {
      return this.formatItemPrice(item);
    }
    const purchasePrice = this.planetMarket.getPurchasePrice(item, this.world);
    const local = this.planetMarket.getLocalPrice(item, this.market, this.world);
    if (local == null) {
      if (purchasePrice == null || purchasePrice === '') {
        return null;
      }
      return this.planetMarket.formatItemPrice(purchasePrice, item.currency || 'Cr');
    }
    return this.planetMarket.formatMoney(local, item.currency || 'Cr');
  }

  pricePercent(item: EquipmentItem): number | null {
    return this.market ? this.planetMarket.getPricePercent(item, this.market) : null;
  }

  drugState(item: EquipmentItem) {
    return this.market?.drugs[item.name];
  }

  hasLegality(item: EquipmentItem): boolean {
    return item.category === 'drugs' || this.planetMarket.getIllegalFromLawLevel(item) != null;
  }

  isIllegal(item: EquipmentItem): boolean {
    if (item.category === 'drugs') {
      return this.drugState(item)?.illegal === true;
    }
    return this.planetMarket.isIllegalByLaw(item, this.world);
  }

  isUnavailable(item: EquipmentItem): boolean {
    if (item.category !== 'drugs') {
      return false;
    }
    return this.drugState(item)?.available === false;
  }

  formatNotes(notes: string | null): string {
    if (!notes) {
      return '';
    }
    const trimmed = notes.replace(/^Book\s+\d+\s+PSI-DRUGS:\s*/i, '');
    return trimmed.replace(/^[a-z]/, letter => letter.toUpperCase());
  }

  private async refresh(): Promise<void> {
    await this.catalog.ensureLoaded();
    await this.planetMarket.ensureMarket(this.world);
    this.goods = this.catalog.getGoods();
    this.syncFromWorld();
  }

  private syncFromWorld(): void {
    this.market = this.world.market ?? null;
    this.tradeClassLabels = this.world.getTradeClassLabels();
  }
}
