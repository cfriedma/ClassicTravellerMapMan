import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { World } from '../../models/world';
import {
  AnimalCategory,
  AnimalEncounterRow,
  TerrainEncounterTable,
  TerrainGroup,
  WorldEncounterState
} from '../../models/animal-encounter';
import { AnimalEncounterService } from '../../services/animal-encounter.service';

@Component({
  selector: 'app-world-encounter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="encounter-panel" [class.editing]="editMode" *ngIf="world && encounters">
      <div class="encounter-header">
        <div>
          <h3>{{ hexLabel }} Encounter Tables</h3>
          <p class="meta">{{ encounters.ecosystemSummary }}</p>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-line" (click)="reroll()">Reroll tables</button>
          <button type="button" class="btn btn-line" (click)="print()">Print</button>
          <button type="button" class="btn" (click)="closed.emit()">Close</button>
        </div>
      </div>

      <div class="group-bar" *ngIf="encounters.allEcosystems">
        <button
          type="button"
          class="tab"
          *ngFor="let group of groups"
          [class.active]="activeGroup === group.id"
          (click)="selectGroup(group.id)"
        >{{ group.label }}</button>
      </div>

      <div class="tab-bar">
        <button
          type="button"
          class="tab"
          *ngFor="let table of visibleTables"
          [class.active]="activeTerrain === table.terrain"
          (click)="activeTerrain = table.terrain"
        >{{ table.terrain }}</button>
      </div>

      <div class="tab-body" *ngIf="activeTable as table">
        <p class="meta">
          {{ table.terrain }} ({{ table.equivalent }})
          · 2 dice
          · Type DM {{ formatDm(table.typeDm) }}
          · Size DM {{ formatDm(table.sizeDm) }}
        </p>
        <table>
          <thead>
            <tr>
              <th>Die</th>
              <th>Qty</th>
              <th>Animal</th>
              <th>Weight</th>
              <th>Hits</th>
              <th>Armor</th>
              <th>Wounds</th>
              <th>Weapons</th>
              <th>Characteristics / Event</th>
            </tr>
          </thead>
          <tbody *ngIf="editMode; else readOnlyRows">
            <tr *ngFor="let row of table.rows" [class.event-row]="row.kind === 'event'">
              <td>{{ row.die }}</td>
              <ng-container *ngIf="row.kind === 'animal'; else eventCells">
                <td>
                  <input class="cell-input" [(ngModel)]="row.quantity" (change)="saveEdits()" />
                </td>
                <td>
                  <input class="cell-input" [(ngModel)]="row.name" (change)="saveEdits()" />
                  <label class="field-label">Attribute</label>
                  <input class="cell-input" [ngModel]="row.attribute || ''" (ngModelChange)="row.attribute = $event || null" (change)="saveEdits()" />
                  <label class="field-label">Category</label>
                  <select class="cell-input" [ngModel]="row.category" (ngModelChange)="setCategory(row, $event)">
                    <option *ngFor="let category of animalCategories" [ngValue]="category">{{ category }}</option>
                  </select>
                  <label class="field-label">Type</label>
                  <input class="cell-input" [(ngModel)]="row.type" (change)="saveEdits()" />
                  <label class="field-label">Local name</label>
                  <input class="cell-input" [(ngModel)]="row.localName" (change)="saveEdits()" />
                  <label class="field-label">Description</label>
                  <textarea class="cell-area" rows="2" [(ngModel)]="row.description" (change)="saveEdits()"></textarea>
                </td>
                <td>
                  <input class="cell-input" type="number" [ngModel]="row.weightKg" (ngModelChange)="setWeight(row, $event)" (change)="saveEdits()" />
                </td>
                <td><input class="cell-input" [(ngModel)]="row.hits" (change)="saveEdits()" /></td>
                <td><input class="cell-input" [(ngModel)]="row.armor" (change)="saveEdits()" /></td>
                <td><input class="cell-input" [(ngModel)]="row.wounds" (change)="saveEdits()" /></td>
                <td><input class="cell-input" [(ngModel)]="row.weapons" (change)="saveEdits()" /></td>
                <td>
                  <input class="cell-input" [(ngModel)]="row.characteristics" (change)="saveEdits()" />
                  <label class="field-label">Special notes</label>
                  <textarea class="cell-area" rows="2" [(ngModel)]="row.specialNotes" (change)="saveEdits()"></textarea>
                </td>
              </ng-container>
              <ng-template #eventCells>
                <td>{{ row.quantity || '—' }}</td>
                <td colspan="7">
                  <label class="field-label">Event</label>
                  <textarea class="cell-area" rows="2" [(ngModel)]="row.eventText" (change)="saveEdits()"></textarea>
                  <label class="field-label">Mechanics</label>
                  <textarea class="cell-area" rows="3" [(ngModel)]="row.eventMechanics" (change)="saveEdits()"></textarea>
                  <ng-container *ngIf="isCustomEvent(row)">
                    <label class="field-label">Local name</label>
                    <input class="cell-input" [(ngModel)]="row.localName" (change)="saveEdits()" />
                    <label class="field-label">Description</label>
                    <textarea class="cell-area" rows="2" [(ngModel)]="row.description" (change)="saveEdits()"></textarea>
                  </ng-container>
                  <div class="stat-line" *ngIf="row.eventName === 'Psionic Assaulters' && row.hits">
                    {{ row.quantity }}
                    · {{ row.name }}
                    · {{ row.weightKg }}kg
                    · {{ row.hits }}
                    · {{ row.armor }}
                    · {{ row.wounds }}
                    · {{ row.weapons }}
                    · {{ row.characteristics }}
                  </div>
                </td>
              </ng-template>
            </tr>
          </tbody>
          <ng-template #readOnlyRows>
            <tbody>
              <tr *ngFor="let row of table.rows" [class.event-row]="row.kind === 'event'">
                <td>{{ row.die }}</td>
                <ng-container *ngIf="row.kind === 'animal'; else readOnlyEvent">
                  <td>{{ row.quantity }}</td>
                  <td>
                    {{ row.name }}
                    <div class="note" *ngIf="row.attribute">{{ row.attribute }} {{ row.type }}</div>
                    <div class="note" *ngIf="!row.attribute">{{ row.category }} {{ row.type }}</div>
                    <div class="note" *ngIf="row.localName">{{ row.localName }}</div>
                    <div class="note" *ngIf="row.description">{{ row.description }}</div>
                  </td>
                  <td>{{ row.weightKg }}kg</td>
                  <td>{{ row.hits }}</td>
                  <td>{{ row.armor }}</td>
                  <td>{{ row.wounds }}</td>
                  <td>{{ row.weapons }}</td>
                  <td>
                    {{ row.characteristics }}
                    <div class="note" *ngIf="row.specialNotes">{{ row.specialNotes }}</div>
                  </td>
                </ng-container>
                <ng-template #readOnlyEvent>
                  <td>{{ row.quantity || '—' }}</td>
                  <td colspan="7">
                    <strong>{{ row.eventText }}</strong>
                    <div class="note" *ngIf="isCustomEvent(row) && row.localName">{{ row.localName }}</div>
                    <div class="note" *ngIf="isCustomEvent(row) && row.description">{{ row.description }}</div>
                    <details *ngIf="row.eventMechanics">
                      <summary>Mechanics</summary>
                      <p>{{ row.eventMechanics }}</p>
                    </details>
                    <div class="stat-line" *ngIf="row.eventName === 'Psionic Assaulters' && row.hits">
                      {{ row.quantity }}
                      · {{ row.name }}
                      · {{ row.weightKg }}kg
                      · {{ row.hits }}
                      · {{ row.armor }}
                      · {{ row.wounds }}
                      · {{ row.weapons }}
                      · {{ row.characteristics }}
                    </div>
                  </td>
                </ng-template>
              </tr>
            </tbody>
          </ng-template>
        </table>
        <div class="psi-block" *ngIf="encounters.psionicAssaulters as psi">
          <h4>Psionic Assaulters</h4>
          <p class="note">
            Possible event on this world. Quantity 1D when encountered.
            Always surprise. Unshielded adventurers are unconscious and take 2D+6 hits;
            shielded individuals fight using these stats.
          </p>
          <table>
            <thead>
              <tr>
                <th>Qty</th>
                <th>Animal</th>
                <th>Weight</th>
                <th>Hits</th>
                <th>Armor</th>
                <th>Wounds</th>
                <th>Weapons</th>
                <th>Characteristics</th>
              </tr>
            </thead>
            <tbody *ngIf="editMode; else readOnlyPsi">
              <tr>
                <td>
                  <input class="cell-input" [(ngModel)]="psi.quantity" (change)="saveEdits()" />
                </td>
                <td>
                  <input class="cell-input" [(ngModel)]="psi.name" (change)="saveEdits()" />
                  <label class="field-label">Attribute</label>
                  <input class="cell-input" [ngModel]="psi.attribute || ''" (ngModelChange)="psi.attribute = $event || null" (change)="saveEdits()" />
                  <label class="field-label">Category</label>
                  <select class="cell-input" [ngModel]="psi.category" (ngModelChange)="setCategory(psi, $event)">
                    <option *ngFor="let category of animalCategories" [ngValue]="category">{{ category }}</option>
                  </select>
                  <label class="field-label">Type</label>
                  <input class="cell-input" [(ngModel)]="psi.type" (change)="saveEdits()" />
                  <label class="field-label">Local name</label>
                  <input class="cell-input" [(ngModel)]="psi.localName" (change)="saveEdits()" />
                  <label class="field-label">Description</label>
                  <textarea class="cell-area" rows="2" [(ngModel)]="psi.description" (change)="saveEdits()"></textarea>
                </td>
                <td>
                  <input class="cell-input" type="number" [ngModel]="psi.weightKg" (ngModelChange)="setWeight(psi, $event)" (change)="saveEdits()" />
                </td>
                <td><input class="cell-input" [(ngModel)]="psi.hits" (change)="saveEdits()" /></td>
                <td><input class="cell-input" [(ngModel)]="psi.armor" (change)="saveEdits()" /></td>
                <td><input class="cell-input" [(ngModel)]="psi.wounds" (change)="saveEdits()" /></td>
                <td><input class="cell-input" [(ngModel)]="psi.weapons" (change)="saveEdits()" /></td>
                <td>
                  <input class="cell-input" [(ngModel)]="psi.characteristics" (change)="saveEdits()" />
                  <label class="field-label">Special notes</label>
                  <textarea class="cell-area" rows="2" [(ngModel)]="psi.specialNotes" (change)="saveEdits()"></textarea>
                </td>
              </tr>
            </tbody>
            <ng-template #readOnlyPsi>
              <tbody>
                <tr>
                  <td>{{ psi.quantity }}</td>
                  <td>
                    {{ psi.name }}
                    <div class="note">{{ psi.attribute || psi.category }} {{ psi.type }}</div>
                    <div class="note" *ngIf="psi.localName">{{ psi.localName }}</div>
                    <div class="note" *ngIf="psi.description">{{ psi.description }}</div>
                  </td>
                  <td>{{ psi.weightKg }}kg</td>
                  <td>{{ psi.hits }}</td>
                  <td>{{ psi.armor }}</td>
                  <td>{{ psi.wounds }}</td>
                  <td>{{ psi.weapons }}</td>
                  <td>
                    {{ psi.characteristics }}
                    <div class="note" *ngIf="psi.specialNotes">{{ psi.specialNotes }}</div>
                  </td>
                </tr>
              </tbody>
            </ng-template>
          </table>
        </div>
        <p class="legend">
          Characteristics: A# attack on #+, F# flee on #+ if not already acting, S# speed multiplier
          (S0 immobile, S1 ordinary). 0 is a special case (if surprise, if more, if possible).
          Herbivores are listed F A S. Hits: damage to unconscious / total damage to kill.
          Qty is rolled when the encounter occurs.
          Wounds is a signed DM (or × multiplier) on the weapon’s Book 1 damage dice, rolled when the animal hits.
          Filters ignore wound alteration (1D per 50 kg or less).
        </p>
      </div>
    </section>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .encounter-panel {
      margin: 0; max-width: none; background: var(--paper);
      color: var(--ink); border: 1px solid var(--ink); border-radius: 0; box-shadow: none;
      display: flex; flex-direction: column; min-height: 0; flex: 1; overflow: hidden;
    }
    .encounter-header {
      display: flex; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; flex-shrink: 0;
      padding: 0.55rem 0.7rem; background: var(--paper); color: var(--ink);
      border-bottom: 1px solid var(--ink);
    }
    h3 {
      margin: 0 0 0.2rem;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .meta { margin: 0 0 0.55rem; font-size: 0.8rem; color: var(--ink-soft); }
    .encounter-header .meta { color: var(--ink-soft); }
    .actions { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .group-bar, .tab-bar {
      display: flex; flex-wrap: wrap; gap: 0; padding: 0 0.45rem; flex-shrink: 0;
      background: var(--paper); border-bottom: 1px solid var(--rule);
    }
    .tab {
      border: 1px solid transparent;
      border-bottom: none;
      background: transparent;
      margin-bottom: -1px;
      padding: 0.35rem 0.55rem;
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }
    .tab.active {
      color: var(--ink);
      border-color: var(--rule);
      background: var(--paper);
    }
    .tab-body { padding: 0.55rem 0.65rem 0.75rem; overflow: auto; min-height: 0; flex: 1; }
    table { width: 100%; min-width: 1080px; border-collapse: collapse; font-size: 0.78rem; }
    th, td { text-align: left; padding: 0.28rem 0.35rem; border: 1px solid var(--rule-soft); vertical-align: top; }
    th {
      position: sticky; top: 0; z-index: 2;
      background: var(--muted);
      font-size: 0.66rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    th:nth-child(3), td:nth-child(3) { min-width: 14rem; }
    th:nth-child(9), td:nth-child(9) { min-width: 12rem; }
    .note { color: var(--ink-soft); font-size: 0.75rem; margin-top: 0.15rem; }
    .cell-input, .cell-area {
      width: 100%;
      min-width: 4.5rem;
      box-sizing: border-box;
      font: inherit;
      font-size: 0.75rem;
      padding: 0.12rem 0.2rem;
      border: 1px solid var(--rule);
      border-radius: 0;
      background: var(--paper);
      color: var(--ink);
    }
    .cell-area { min-width: 8rem; display: block; }
    .field-label {
      display: block;
      margin-top: 0.3rem;
      font-size: 0.66rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }
    .event-row td { background: var(--muted); }
    .stat-line { margin-top: 0.35rem; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 0.75rem; }
    .psi-block { margin: 0.75rem 0 0; padding: 0.55rem 0 0; border-top: 1px solid var(--rule); }
    .psi-block h4 {
      margin: 0 0 0.3rem;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .legend { margin: 0.7rem 0 0; color: var(--ink-soft); font-size: 0.75rem; }
    details { margin-top: 0.3rem; }
    details p { margin: 0.3rem 0 0; color: var(--ink-soft); }
    @media (max-width: 768px) {
      :host, .encounter-panel { height: auto; overflow: visible; display: block; }
      .encounter-header { flex-direction: column; }
      .tab-body { overflow: visible; }
    }
    @media print {
      .actions { display: none; }
      .encounter-panel { box-shadow: none; border-color: #111; }
    }
  `]
})
export class WorldEncounterPanelComponent implements OnChanges {
  @Input({ required: true }) world!: World;
  @Input() hexLabel = '';
  @Input() revision = 0;
  @Input() editMode = false;
  @Output() closed = new EventEmitter<void>();
  readonly animalCategories: AnimalCategory[] = ['Herbivore', 'Omnivore', 'Carnivore', 'Scavenger'];

  encounters: WorldEncounterState | null = null;
  activeGroup: TerrainGroup = 'land';
  activeTerrain = '';
  readonly groups: { id: TerrainGroup; label: string }[] = [
    { id: 'land', label: 'Land' },
    { id: 'sea', label: 'Sea' },
    { id: 'special', label: 'Special' }
  ];

  constructor(private encountersService: AnimalEncounterService) {}

  get visibleTables(): TerrainEncounterTable[] {
    if (!this.encounters) {
      return [];
    }
    if (!this.encounters.allEcosystems) {
      return this.encounters.terrains;
    }
    return this.encounters.terrains.filter(table => table.group === this.activeGroup);
  }

  get activeTable(): TerrainEncounterTable | undefined {
    return this.visibleTables.find(table => table.terrain === this.activeTerrain) ?? this.visibleTables[0];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['world'] || changes['revision']) && this.world) {
      void this.refresh();
    }
  }

  saveEdits(): void {
    this.encountersService.saveEdits();
  }

  setCategory(row: AnimalEncounterRow, category: AnimalCategory): void {
    row.category = category;
    this.saveEdits();
  }

  setWeight(row: AnimalEncounterRow, weight: number | null): void {
    row.weightKg = weight ?? undefined;
  }

  isCustomEvent(row: AnimalEncounterRow): boolean {
    return this.encountersService.isCustomEvent(row);
  }

  selectGroup(group: TerrainGroup): void {
    this.activeGroup = group;
    this.activeTerrain = this.visibleTables[0]?.terrain ?? '';
  }

  async reroll(): Promise<void> {
    this.encounters = await this.encountersService.rerollEncounters(this.world);
    this.syncTabs();
  }

  print(): void {
    window.print();
  }

  formatDm(value: number): string {
    if (value > 0) return `+${value}`;
    if (value === 0) return '—';
    return String(value);
  }

  private async refresh(): Promise<void> {
    this.encounters = await this.encountersService.ensureEncounters(this.world);
    this.syncTabs();
  }

  private syncTabs(): void {
    if (!this.encounters?.terrains.length) {
      this.activeTerrain = '';
      return;
    }
    if (this.encounters.allEcosystems) {
      const currentGroupHas = this.encounters.terrains.some(
        table => table.group === this.activeGroup
      );
      if (!currentGroupHas) {
        this.activeGroup = this.encounters.terrains[0].group;
      }
    }
    const visible = this.visibleTables;
    if (!visible.some(table => table.terrain === this.activeTerrain)) {
      this.activeTerrain = visible[0]?.terrain ?? '';
    }
  }
}
