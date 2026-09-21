import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { World } from '../../models/world';
import {
  TerrainEncounterTable,
  TerrainGroup,
  WorldEncounterState
} from '../../models/animal-encounter';
import { AnimalEncounterService } from '../../services/animal-encounter.service';

@Component({
  selector: 'app-world-encounter-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="encounter-panel" *ngIf="world && encounters">
      <div class="encounter-header">
        <div>
          <h3>{{ hexLabel }} Encounter Tables</h3>
          <p class="meta">{{ encounters.ecosystemSummary }}</p>
        </div>
        <div class="actions">
          <button type="button" class="btn" (click)="reroll()">Reroll tables</button>
          <button type="button" class="btn" (click)="print()">Print</button>
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
          <tbody>
            <tr *ngFor="let row of table.rows" [class.event-row]="row.kind === 'event'">
              <td>{{ row.die }}</td>
              <ng-container *ngIf="row.kind === 'animal'; else eventCells">
                <td>{{ row.quantity }}</td>
                <td>
                  {{ row.name }}
                  <div class="note" *ngIf="row.attribute">{{ row.attribute }} {{ row.type }}</div>
                  <div class="note" *ngIf="!row.attribute">{{ row.category }} {{ row.type }}</div>
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
              <ng-template #eventCells>
                <td>{{ row.quantity || '—' }}</td>
                <td colspan="7">
                  <strong>{{ row.eventText }}</strong>
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
            <tbody>
              <tr>
                <td>{{ psi.quantity }}</td>
                <td>
                  {{ psi.name }}
                  <div class="note">{{ psi.attribute || psi.category }} {{ psi.type }}</div>
                </td>
                <td>{{ psi.weightKg }}kg</td>
                <td>{{ psi.hits }}</td>
                <td>{{ psi.armor }}</td>
                <td>{{ psi.wounds }}</td>
                <td>{{ psi.weapons }}</td>
                <td>{{ psi.characteristics }}</td>
              </tr>
            </tbody>
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
    :host { display: block; height: 100%; }
    .encounter-panel {
      margin: 0; max-width: none; background: var(--bg-card);
      color: var(--text-primary); border-radius: 12px; box-shadow: 0 4px 20px var(--shadow); overflow: hidden;
    }
    .encounter-header {
      display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
      padding: 1.25rem 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff;
    }
    h3 { margin: 0 0 0.35rem; font-size: 1.2rem; }
    .meta { margin: 0 0 0.75rem; opacity: 0.95; font-size: 0.9rem; color: inherit; }
    .tab-body .meta { color: var(--text-secondary); opacity: 1; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .btn {
      background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.35);
      padding: 0.45rem 0.85rem; border-radius: 6px; cursor: pointer; font-weight: 600;
    }
    .btn:hover { background: rgba(255,255,255,0.3); }
    .group-bar, .tab-bar {
      display: flex; flex-wrap: wrap; gap: 0.25rem; padding: 0.65rem 1rem 0;
      background: var(--bg-muted); border-bottom: 1px solid var(--border);
    }
    .tab {
      border: none; background: transparent; padding: 0.55rem 0.75rem; cursor: pointer;
      border-bottom: 3px solid transparent; font-weight: 600; color: var(--text-secondary);
    }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-body { padding: 0.75rem 0.85rem 1rem; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { text-align: left; padding: 0.4rem 0.45rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    .note { color: var(--text-secondary); font-size: 0.78rem; margin-top: 0.15rem; }
    .event-row td { background: var(--bg-muted); }
    .stat-line { margin-top: 0.4rem; font-family: 'Courier New', monospace; font-size: 0.8rem; }
    .psi-block { margin: 1rem 0 0; padding: 0.75rem 0 0; border-top: 1px solid var(--border); }
    .psi-block h4 { margin: 0 0 0.35rem; font-size: 0.95rem; }
    .legend { margin: 0.85rem 0 0; color: var(--text-secondary); font-size: 0.8rem; }
    details { margin-top: 0.35rem; }
    details p { margin: 0.35rem 0 0; color: var(--text-secondary); }
    @media (max-width: 768px) { .encounter-header { flex-direction: column; } }
    @media print {
      .actions { display: none; }
      .encounter-panel { box-shadow: none; }
    }
  `]
})
export class WorldEncounterPanelComponent implements OnChanges {
  @Input({ required: true }) world!: World;
  @Input() hexLabel = '';
  @Output() closed = new EventEmitter<void>();

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
    if (changes['world'] && this.world) {
      void this.refresh();
    }
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
