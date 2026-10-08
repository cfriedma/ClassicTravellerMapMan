import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SubsectorManagerService, SubsectorData } from '../services/subsector-manager.service';
import { SectorHex } from '../models/sectorhex';
import {
  BalkanState,
  PsionicPunishment,
  StarportType,
  World,
  createPlanetAtmosphere,
  createPlanetGovernment,
  createPlanetHydrographics,
  createPlanetLawLevel,
  createPlanetPopulation,
  createPlanetSize
} from '../models/world';
import { PlanetMarketPanelComponent } from '../features/equipment/planet-market-panel.component';
import { WorldEncounterPanelComponent } from '../features/encounters/world-encounter-panel.component';
import { describeStoredEcosystem } from '../features/encounters/ecosystem-profiler';
import { SettingsMenuComponent } from '../shared/settings-menu.component';
import { SettingsService } from '../services/settings.service';
import { PlanetMarketService } from '../services/planet-market.service';
import { hexCanvasPosition, hexCanvasSize, hexColumn, hexCoordinates, hexIndexAtPosition, hexRow } from '../shared/hex-grid';

@Component({
  selector: 'app-subsector-view',
  standalone: true,
  imports: [CommonModule, FormsModule, PlanetMarketPanelComponent, SettingsMenuComponent, WorldEncounterPanelComponent],
  template: `
    <div class="subsector-container" *ngIf="subsectorData; else notFound">
      <!-- Header -->
      <header class="subsector-header">
        <div class="header-content">
          <button class="btn btn-line" type="button" (click)="goHome()">Return</button>

          <div class="header-info">
            <p class="running-kicker">Subsector record</p>
            <h1>{{ subsectorData.name }}</h1>
            <div class="subsector-meta">
              <span class="subsector-code mono">{{ subsectorData.id }}</span>
              <span class="subsector-date">Filed {{ subsectorData.createdAt | date:'mediumDate' }}</span>
              <button class="btn btn-line btn-small" type="button" (click)="copyCode()">Copy code</button>
              <button class="btn btn-line btn-small" type="button" (click)="shareUrl()">Share</button>
            </div>
          </div>

          <div class="header-tools">
            <button
              type="button"
              class="edit-mode-toggle"
              [class.active]="editMode"
              [attr.aria-pressed]="editMode"
              (click)="editMode = !editMode"
            >{{ editMode ? 'Editing' : 'Edit' }}</button>
            <app-settings-menu></app-settings-menu>
          </div>
        </div>
      </header>

      <!-- Hex Map -->
      <div class="hex-map-container" [class.with-encounters]="!!encounterWorld" [class.editing]="editMode">
        <app-world-encounter-panel
          *ngIf="encounterWorld as world"
          class="encounter-column"
          [class.editing]="editMode"
          [world]="world"
          [hexLabel]="getHexCoordinates(selectedHexIndex)"
          [revision]="editRevision"
          [editMode]="editMode"
          (closed)="closeEncounters()"
        ></app-world-encounter-panel>

        <div class="map-column">
        <div class="map-and-detail">
        <div class="hex-map" #hexMap (wheel)="onMapWheel($event)">
          <canvas 
            #hexCanvas
            class="hex-canvas"
            [width]="canvasWidth"
            [height]="canvasHeight"
            (click)="onCanvasClick($event)"
            (mousemove)="onCanvasMouseMove($event)"
          ></canvas>
          <p class="plate-caption">Figure 1. Subsector plate</p>
        </div>

        <!-- World Detail Panel -->
        <div class="world-detail-column" *ngIf="selectedHex && selectedHex.world">
          <div class="world-detail-panel">
            <div class="panel-header">
              <h3>{{ worldHeading }}</h3>
              <button class="btn btn-line btn-small" type="button" (click)="clearSelection()">Close</button>
            </div>

            <div class="panel-content">
              <table class="spec" *ngIf="editMode; else worldReadOnly">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Code</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  <ng-container *ngIf="selectedHex.world.isHabitableForAnimals()">
                    <tr>
                      <th><label for="world-local-name">Local name</label></th>
                      <td colspan="2">
                        <input
                          id="world-local-name"
                          class="field-control"
                          [ngModel]="selectedHex.world.localName"
                          (ngModelChange)="selectedHex.world.localName = $event"
                          (change)="commitText()"
                        />
                      </td>
                    </tr>
                    <tr>
                      <th><label for="world-description">Description</label></th>
                      <td colspan="2">
                        <textarea
                          id="world-description"
                          class="field-control"
                          rows="3"
                          [ngModel]="selectedHex.world.description"
                          (ngModelChange)="selectedHex.world.description = $event"
                          (change)="commitText()"
                        ></textarea>
                      </td>
                    </tr>
                  </ng-container>

                  <tr>
                    <th><label for="world-starport">Starport</label></th>
                    <td>
                      <select
                        id="world-starport"
                        class="field-control mono starport-{{ selectedHex.world.starportType }}"
                        [ngModel]="selectedHex.world.starportType"
                        (ngModelChange)="setStarport($event)"
                      >
                        <option *ngFor="let type of starportTypes" [ngValue]="type">{{ type }}</option>
                      </select>
                    </td>
                    <td class="starport-{{ selectedHex.world.starportType }}">{{ getStarportDescription(selectedHex.world.starportType) }}</td>
                  </tr>

                  <tr>
                    <th><label for="world-size">Size</label></th>
                    <td>
                      <select id="world-size" class="field-control mono" [ngModel]="selectedHex.world.planetSize.key" (ngModelChange)="setPlanetSize($event)">
                        <option *ngFor="let key of sizeKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                    </td>
                    <td>{{ selectedHex.world.planetSize.label }}</td>
                  </tr>

                  <tr>
                    <th><label for="world-atmosphere">Atmosphere</label></th>
                    <td>
                      <select id="world-atmosphere" class="field-control mono" [ngModel]="selectedHex.world.planetAtmosphere.key" (ngModelChange)="setPlanetAtmosphere($event)">
                        <option *ngFor="let key of atmosphereKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                    </td>
                    <td>{{ selectedHex.world.planetAtmosphere.label }}</td>
                  </tr>

                  <tr>
                    <th><label for="world-hydrographics">Hydrographics</label></th>
                    <td>
                      <select id="world-hydrographics" class="field-control mono" [ngModel]="selectedHex.world.planetHydrographics.key" (ngModelChange)="setPlanetHydrographics($event)">
                        <option *ngFor="let key of hydroKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                    </td>
                    <td>{{ selectedHex.world.planetHydrographics.label }}</td>
                  </tr>

                  <tr>
                    <th><label for="world-population">Population</label></th>
                    <td>
                      <select id="world-population" class="field-control mono" [ngModel]="selectedHex.world.planetPopulation.key" (ngModelChange)="setPlanetPopulation($event)">
                        <option *ngFor="let key of populationKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                    </td>
                    <td>{{ selectedHex.world.planetPopulation.label }}</td>
                  </tr>

                  <tr>
                    <th><label for="world-government">Government</label></th>
                    <td>
                      <select id="world-government" class="field-control mono" [ngModel]="selectedHex.world.planetGovernment.key" (ngModelChange)="setPlanetGovernment($event)">
                        <option *ngFor="let key of governmentKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                    </td>
                    <td>{{ selectedHex.world.planetGovernment.label }}</td>
                  </tr>

                  <ng-container *ngIf="selectedHex.world.planetGovernment.key === 7 && selectedHex.world.balkanStates?.length">
                  <tr *ngFor="let state of selectedHex.world.balkanStates; let i = index">
                    <th>{{ i === 0 ? 'Starport state' : 'State ' + (i + 1) }}</th>
                    <td class="mono">{{ state.government.key }}/{{ state.lawLevel.key }}</td>
                    <td class="balkan-edit">
                      <label [attr.for]="'balkan-gov-' + i">Gov</label>
                      <select
                        [id]="'balkan-gov-' + i"
                        class="field-control"
                        [ngModel]="state.government.key"
                        (ngModelChange)="setBalkanGovernment(state, $event)"
                      >
                        <option *ngFor="let key of governmentKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                      <span>{{ state.government.label }}</span>
                      <label [attr.for]="'balkan-law-' + i">Law</label>
                      <select
                        [id]="'balkan-law-' + i"
                        class="field-control"
                        [ngModel]="state.lawLevel.key"
                        (ngModelChange)="setBalkanLaw(state, $event)"
                      >
                        <option *ngFor="let key of lawKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                      <span>{{ state.lawLevel.label }}</span>
                    </td>
                  </tr>
                  </ng-container>

                  <tr>
                    <th><label for="world-law">Law level</label></th>
                    <td>
                      <select id="world-law" class="field-control mono" [ngModel]="selectedHex.world.planetLawLevel.key" (ngModelChange)="setPlanetLaw($event)">
                        <option *ngFor="let key of lawKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                    </td>
                    <td>{{ selectedHex.world.planetLawLevel.label }}</td>
                  </tr>

                  <tr>
                    <th><label for="world-tech">Tech level</label></th>
                    <td>
                      <select id="world-tech" class="field-control mono" [ngModel]="selectedHex.world.planetTechLevel" (ngModelChange)="setTechLevel($event)">
                        <option *ngFor="let key of techKeys" [ngValue]="key">{{ key }}</option>
                      </select>
                    </td>
                    <td></td>
                  </tr>

                  <tr>
                    <th>Trade</th>
                    <td class="mono">—</td>
                    <td>
                      <span *ngIf="selectedHex.world.getTradeClassLabels().length; else noTradeClasses">
                        {{ selectedHex.world.getTradeClassLabels().join(', ') }}
                      </span>
                      <ng-template #noTradeClasses>None</ng-template>
                    </td>
                  </tr>

                  <tr>
                    <th>Bases</th>
                    <td class="mono">
                      <span class="mark naval" *ngIf="selectedHex.world.hasNavalBase">N</span>
                      <span class="mark scout" *ngIf="selectedHex.world.hasScoutBase">S</span>
                      <span class="mark gas" *ngIf="selectedHex.hasGasGiant">G</span>
                      <span class="mark psi" *ngIf="psionicsEnabled && selectedHex.world.hasPsionicInstitute">I</span>
                      <span *ngIf="!selectedHex.world.hasNavalBase && !selectedHex.world.hasScoutBase && !selectedHex.hasGasGiant && !(psionicsEnabled && selectedHex.world.hasPsionicInstitute)">—</span>
                    </td>
                    <td>
                      <div class="check-row">
                        <label class="check">
                          <input type="checkbox" [ngModel]="selectedHex.world.hasNavalBase" (ngModelChange)="setNavalBase($event)" />
                          Naval
                        </label>
                        <label class="check">
                          <input type="checkbox" [ngModel]="selectedHex.world.hasScoutBase" (ngModelChange)="setScoutBase($event)" />
                          Scout
                        </label>
                        <label class="check">
                          <input type="checkbox" [ngModel]="selectedHex.hasGasGiant" (ngModelChange)="setGasGiant($event)" />
                          Gas giant
                        </label>
                        <label class="check" *ngIf="psionicsEnabled">
                          <input type="checkbox" [ngModel]="selectedHex.world.hasPsionicInstitute" (ngModelChange)="setPsionicInstitute($event)" />
                          Psionic institute
                        </label>
                      </div>
                    </td>
                  </tr>

                  <tr *ngIf="psionicsEnabled">
                    <th><label for="world-punishment">Psionic punishment</label></th>
                    <td colspan="2">
                      <select
                        id="world-punishment"
                        class="field-control"
                        [ngModel]="selectedHex.world.psionicPunishment"
                        (ngModelChange)="setPsionicPunishment($event)"
                      >
                        <option *ngFor="let punishment of psionicPunishments" [ngValue]="punishment">{{ punishment }}</option>
                      </select>
                    </td>
                  </tr>

                  <tr>
                    <th>Routes</th>
                    <td class="mono">{{ getTradeRouteDetails(selectedHex.world).length || '—' }}</td>
                    <td>
                      <div class="trade-routes-list" *ngIf="getTradeRouteDetails(selectedHex.world).length">
                        <div *ngFor="let route of getTradeRouteDetails(selectedHex.world)" class="trade-route">
                          <span><span class="mono">J{{ route.distance }}</span> {{ route.destination }}</span>
                          <button type="button" class="btn btn-line btn-small" (click)="removeRoute(route.index)">Remove</button>
                        </div>
                      </div>
                      <span *ngIf="!getTradeRouteDetails(selectedHex.world).length">None</span>
                      <label for="world-add-route">Add route</label>
                      <select id="world-add-route" class="field-control" [ngModel]="routeTarget" (ngModelChange)="addRoute($event)">
                        <option [ngValue]="-1">Choose a world</option>
                        <option *ngFor="let candidate of routeCandidates" [ngValue]="candidate.index">{{ candidate.label }}</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
              <ng-template #worldReadOnly>
                <table class="spec">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Code</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngIf="selectedHex.world.isHabitableForAnimals() && selectedHex.world.description?.trim()">
                      <th>Description</th>
                      <td colspan="2">{{ selectedHex.world.description }}</td>
                    </tr>
                    <tr>
                      <th>Starport</th>
                      <td class="mono starport-{{ selectedHex.world.starportType }}">{{ selectedHex.world.starportType }}</td>
                      <td>{{ getStarportDescription(selectedHex.world.starportType) }}</td>
                    </tr>
                    <tr>
                      <th>Size</th>
                      <td class="mono">{{ selectedHex.world.planetSize.key }}</td>
                      <td>{{ selectedHex.world.planetSize.label }}</td>
                    </tr>
                    <tr>
                      <th>Atmosphere</th>
                      <td class="mono">{{ selectedHex.world.planetAtmosphere.key }}</td>
                      <td>{{ selectedHex.world.planetAtmosphere.label }}</td>
                    </tr>
                    <tr>
                      <th>Hydrographics</th>
                      <td class="mono">{{ selectedHex.world.planetHydrographics.key }}</td>
                      <td>{{ selectedHex.world.planetHydrographics.label }}</td>
                    </tr>
                    <tr>
                      <th>Population</th>
                      <td class="mono">{{ selectedHex.world.planetPopulation.key }}</td>
                      <td>{{ selectedHex.world.planetPopulation.label }}</td>
                    </tr>
                    <tr>
                      <th>Government</th>
                      <td class="mono">{{ selectedHex.world.planetGovernment.key }}</td>
                      <td>{{ selectedHex.world.planetGovernment.label }}</td>
                    </tr>
                    <ng-container *ngIf="autoRollBalkanization && selectedHex.world.balkanStates?.length">
                    <tr *ngFor="let state of selectedHex.world.balkanStates; let i = index">
                      <th>{{ i === 0 ? 'Starport state' : 'State ' + (i + 1) }}</th>
                      <td class="mono">{{ state.government.key }}/{{ state.lawLevel.key }}</td>
                      <td>Gov {{ state.government.label }}. Law {{ state.lawLevel.label }}.</td>
                    </tr>
                    </ng-container>
                    <tr>
                      <th>Law level</th>
                      <td class="mono">{{ selectedHex.world.planetLawLevel.key }}</td>
                      <td>{{ selectedHex.world.planetLawLevel.label }}</td>
                    </tr>
                    <tr>
                      <th>Tech level</th>
                      <td class="mono">{{ selectedHex.world.planetTechLevel }}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <th>Trade</th>
                      <td class="mono">—</td>
                      <td>
                        <span *ngIf="selectedHex.world.getTradeClassLabels().length; else noTradeRead">
                          {{ selectedHex.world.getTradeClassLabels().join(', ') }}
                        </span>
                        <ng-template #noTradeRead>None</ng-template>
                      </td>
                    </tr>
                    <tr *ngIf="selectedHex.world.hasNavalBase || selectedHex.world.hasScoutBase || selectedHex.hasGasGiant || (psionicsEnabled && selectedHex.world.hasPsionicInstitute)">
                      <th>Bases</th>
                      <td class="mono">
                        <span class="mark naval" *ngIf="selectedHex.world.hasNavalBase">N</span>
                        <span class="mark scout" *ngIf="selectedHex.world.hasScoutBase">S</span>
                        <span class="mark gas" *ngIf="selectedHex.hasGasGiant">G</span>
                        <span class="mark psi" *ngIf="psionicsEnabled && selectedHex.world.hasPsionicInstitute">I</span>
                      </td>
                      <td>
                        <span *ngIf="selectedHex.world.hasNavalBase">Naval</span>
                        <span *ngIf="selectedHex.world.hasScoutBase"> Scout</span>
                        <span *ngIf="selectedHex.hasGasGiant"> Gas giant</span>
                        <span *ngIf="psionicsEnabled && selectedHex.world.hasPsionicInstitute"> Psionic institute</span>
                      </td>
                    </tr>
                    <tr *ngIf="psionicsEnabled && selectedHex.world.psionicPunishment">
                      <th>Psionic punishment</th>
                      <td colspan="2">{{ selectedHex.world.psionicPunishment }}</td>
                    </tr>
                    <tr *ngIf="selectedHex.world.spaceLanes.length > 0">
                      <th>Routes</th>
                      <td class="mono">{{ getTradeRouteDetails(selectedHex.world).length }}</td>
                      <td>
                        <div *ngFor="let route of getTradeRouteDetails(selectedHex.world)">
                          <span class="mono">J{{ route.distance }}</span> {{ route.destination }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </ng-template>
            </div>
          </div>
          <div class="world-actions">
            <button type="button" class="btn" (click)="openMarket()">Equipment and market</button>
            <button
              type="button"
              class="btn btn-line"
              *ngIf="selectedHex.world.allowsEncounterTables(generateAllEcosystems)"
              (click)="openEncounters()"
            >Encounter tables</button>
          </div>
        </div>

        <div class="world-detail-column" *ngIf="selectedHex && !selectedHex.world && (editMode || selectedHex.hasGasGiant)">
          <div class="world-detail-panel">
            <div class="panel-header">
              <h3>{{ getHexCoordinates(selectedHexIndex) }} — System</h3>
              <button class="btn btn-line btn-small" type="button" (click)="clearSelection()">Close</button>
            </div>
            <div class="panel-content">
              <table class="spec">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Code</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Mainworld</th>
                    <td class="mono">—</td>
                    <td>None</td>
                  </tr>
                  <tr *ngIf="editMode; else gasGiantReadOnly">
                    <th>Gas giant</th>
                    <td class="mono">
                      <span class="mark gas" *ngIf="selectedHex.hasGasGiant">G</span>
                      <span *ngIf="!selectedHex.hasGasGiant">—</span>
                    </td>
                    <td>
                      <label class="check">
                        <input type="checkbox" [ngModel]="selectedHex.hasGasGiant" (ngModelChange)="setGasGiant($event)" />
                        Present
                      </label>
                    </td>
                  </tr>
                  <ng-template #gasGiantReadOnly>
                    <tr>
                      <th>Gas giant</th>
                      <td class="mono"><span class="mark gas">G</span></td>
                      <td>Present</td>
                    </tr>
                  </ng-template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>

        <app-planet-market-panel
          *ngIf="marketWorld as world"
          [world]="world"
          [hexLabel]="getHexCoordinates(selectedHexIndex)"
          [psionicsEnabled]="psionicsEnabled"
          [revision]="editRevision"
          (closed)="closeMarket()"
        ></app-planet-market-panel>
        </div>
      </div>
    </div>

    <ng-template #notFound>
      <div class="not-found">
        <h1>Subsector not found</h1>
        <p>The requested record is not on file.</p>
        <button class="btn" type="button" (click)="goHome()">Return</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .subsector-container {
      min-height: 100vh;
      background: var(--paper);
      color: var(--ink);
    }

    .subsector-header {
      background: var(--paper);
      color: var(--ink);
      --control: var(--ink);
      --control-inverse: var(--paper);
      border-bottom: 2px solid var(--ink);
      padding: 0.7rem 1rem;
    }

    .header-content {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .header-info {
      flex: 1;
      min-width: 0;
    }

    .running-kicker {
      margin: 0 0 0.15rem;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }

    .header-tools {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-shrink: 0;
    }

    .edit-mode-toggle {
      height: 2.1rem;
      padding: 0 0.65rem;
      border: 1px solid var(--ink);
      border-radius: 0;
      background: var(--paper);
      color: var(--ink);
      cursor: pointer;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .edit-mode-toggle.active {
      background: var(--ink);
      color: var(--paper);
    }

    .header-info h1 {
      margin: 0 0 0.3rem;
      font-size: 1.15rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .subsector-meta {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .subsector-code {
      letter-spacing: 0.08em;
    }

    .subsector-date {
      color: var(--ink-soft);
      font-size: 0.82rem;
    }

    .hex-map-container {
      max-width: 1400px;
      margin: 0.85rem auto;
      padding: 0 1rem;
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }

    .hex-map-container.with-encounters {
      max-width: none;
    }

    .map-column {
      flex: 1;
      min-width: min-content;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .map-and-detail {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }

    .encounter-column {
      width: min(1240px, calc(100vw - 28rem));
      min-width: 980px;
      flex-shrink: 0;
      height: calc(100vh - 8.5rem);
      max-height: calc(100vh - 8.5rem);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      overscroll-behavior: contain;
    }

    .hex-map {
      flex: 1;
      min-width: 24rem;
      background: var(--paper);
      border: 1px solid var(--ink);
      border-radius: 0;
      padding: 0.65rem 0.75rem 0.55rem;
      box-shadow: none;
      overflow: auto;
      max-height: calc(100vh - 8.5rem);
      overscroll-behavior: contain;
    }

    .hex-canvas {
      display: block;
      margin: 0 auto;
      border: 1px solid var(--rule-soft);
      border-radius: 0;
      cursor: pointer;
      background: var(--paper);
    }

    .world-detail-column {
      width: 26rem;
      min-width: 26rem;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .world-detail-panel {
      background: var(--paper);
      border: 1px solid var(--ink);
      border-radius: 0;
      box-shadow: none;
      max-height: 700px;
      overflow-y: auto;
    }

    .panel-header {
      background: var(--paper);
      color: var(--ink);
      padding: 0.4rem 0.55rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid var(--ink);
      border-radius: 0;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .panel-content {
      padding: 0.45rem;
    }

    .spec tbody th {
      width: 7.2rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .spec td.mono,
    .spec .mono {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
    }

    .field-control {
      width: 100%;
      box-sizing: border-box;
      padding: 0.2rem 0.3rem;
      border: 1px solid var(--rule);
      border-radius: 0;
      background: var(--paper);
      color: var(--ink);
      font: inherit;
      font-size: 0.8rem;
    }

    .check-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.75rem;
    }

    .check {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .mark {
      font-weight: 600;
      margin-right: 0.35rem;
    }

    .mark.naval { color: var(--mark-naval); }
    .mark.scout { color: var(--mark-scout); }
    .mark.gas { color: var(--mark-gas); }
    .mark.psi { color: var(--mark-psi); }

    .trade-routes-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.4rem;
    }

    .trade-route {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.15rem 0;
      border-bottom: 1px solid var(--rule-soft);
      font-size: 0.8rem;
    }

    .balkan-edit {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 0.45rem;
      align-items: center;
    }

    .balkan-edit .field-control {
      width: 3.2rem;
    }

    .balkan-edit label {
      font-size: 0.68rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: 600;
    }

    .world-actions {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .starport-A { color: var(--port-a); font-weight: 600; }
    .starport-B { color: var(--port-b); font-weight: 600; }
    .starport-C { color: var(--port-c); font-weight: 600; }
    .starport-D { color: var(--port-d); font-weight: 600; }
    .starport-E { color: var(--port-e); font-weight: 600; }
    .starport-X { color: var(--port-x); font-weight: 600; }

    .not-found {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      max-width: 36rem;
      margin: 0 auto;
    }

    .not-found h1 {
      font-size: 1.15rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .not-found p {
      color: var(--ink-soft);
      margin-bottom: 1rem;
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .hex-map-container,
      .map-and-detail {
        flex-direction: column;
      }

      .map-column,
      .hex-map {
        width: 100%;
        min-width: 0;
      }

      .world-detail-column,
      .world-detail-panel,
      .encounter-column {
        width: 100%;
        min-width: 0;
        height: auto;
        max-height: none;
        display: block;
        overflow: visible;
      }
    }
  `]
})
export class SubsectorViewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('hexCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('hexMap') hexMapRef?: ElementRef<HTMLDivElement>;
  private destroy$ = new Subject<void>();
  private ctx!: CanvasRenderingContext2D;
  
  subsectorData: SubsectorData | null = null;
  selectedHexIndex = -1;
  selectedHex: SectorHex | null = null;
  marketOpen = false;
  encountersOpen = false;
  editRevision = 0;
  routeTarget = -1;
  readonly starportTypes = Object.values(StarportType);
  readonly psionicPunishments = Object.values(PsionicPunishment);
  readonly sizeKeys = numberKeys(0, 12);
  readonly atmosphereKeys = numberKeys(0, 12);
  readonly hydroKeys = numberKeys(0, 10);
  readonly populationKeys = numberKeys(0, 10);
  readonly governmentKeys = numberKeys(0, 13);
  readonly lawKeys = numberKeys(0, 9);
  readonly techKeys = numberKeys(0, 15);
  editMode = false;
  psionicsEnabled = true;
  autoRollBalkanization = false;
  generateAllEcosystems = false;
  private mapScale = 1;
  private hoveredHexIndex = -1;

  get columns(): number {
    return this.subsectorData?.subsector.columns ?? 8;
  }

  get rows(): number {
    return this.subsectorData?.subsector.rows ?? 10;
  }

  get canvasWidth(): number {
    return hexCanvasSize(this.columns, this.rows, this.hexWidth, this.hexHeight, this.mapScale).width;
  }

  get canvasHeight(): number {
    return hexCanvasSize(this.columns, this.rows, this.hexWidth, this.hexHeight, this.mapScale).height;
  }

  get hexRadius(): number {
    return 32 * this.mapScale;
  }
  
  get hexWidth(): number {
    return this.hexRadius * Math.sqrt(3);
  }
  
  get hexHeight(): number {
    return this.hexRadius * 2;
  }
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subsectorManager: SubsectorManagerService,
    private settingsService: SettingsService,
    private planetMarket: PlanetMarketService
  ) {}

    ngOnInit(): void {
    this.settingsService.settings$.pipe(takeUntil(this.destroy$)).subscribe(settings => {
      this.mapScale = settings.mapScale;
      this.redrawCanvas();
    });
    document.fonts?.ready.then(() => this.redrawCanvas());

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadSubsector(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {
    this.redrawCanvas();
  }

  private redrawCanvas(): void {
    setTimeout(() => {
      if (this.canvasRef?.nativeElement) {
        this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
        this.drawSubsector();
      }
    }, 0);
  }

  private loadSubsector(id: string): void {
    this.subsectorData = this.subsectorManager.getSubsector(id);
    if (this.subsectorData) {
      this.psionicsEnabled = this.subsectorData.generationOptions.psionicsEnabled;
      this.autoRollBalkanization = this.subsectorData.generationOptions.autoRollBalkanization;
      this.generateAllEcosystems = this.subsectorData.generationOptions.generateAllEcosystems === true;
      if (this.ctx) {
        this.drawSubsector();
      }
    }
  }

  onMapWheel(event: WheelEvent): void {
    const el = this.hexMapRef?.nativeElement;
    if (!el) {
      return;
    }
    const canScrollX = el.scrollWidth > el.clientWidth + 1;
    const canScrollY = el.scrollHeight > el.clientHeight + 1;
    if (!canScrollX && !canScrollY) {
      return;
    }
    let dx = event.deltaX + (event.shiftKey ? event.deltaY : 0);
    let dy = event.shiftKey ? 0 : event.deltaY;
    if (!event.shiftKey && canScrollX && !canScrollY && event.deltaX === 0) {
      dx = event.deltaY;
      dy = 0;
    }
    const nextLeft = Math.min(el.scrollWidth - el.clientWidth, Math.max(0, el.scrollLeft + dx));
    const nextTop = Math.min(el.scrollHeight - el.clientHeight, Math.max(0, el.scrollTop + dy));
    const moved = nextLeft !== el.scrollLeft || nextTop !== el.scrollTop;
    if (!moved) {
      return;
    }
    event.preventDefault();
    el.scrollLeft = nextLeft;
    el.scrollTop = nextTop;
  }

  selectHex(index: number): void {
    this.selectedHexIndex = index;
    this.selectedHex = this.subsectorData?.subsector.sectorHexes[index] || null;
    if (!this.selectedHex?.world) {
      this.marketOpen = false;
      this.encountersOpen = false;
    } else if (!this.selectedHex.world.allowsEncounterTables(this.generateAllEcosystems)) {
      this.encountersOpen = false;
    }
    this.drawSubsector(); // Redraw to show selection
  }

  clearSelection(): void {
    this.selectedHexIndex = -1;
    this.selectedHex = null;
    this.marketOpen = false;
    this.encountersOpen = false;
    this.drawSubsector(); // Redraw to clear selection
  }

  openMarket(): void {
    if (this.selectedHex?.world) {
      this.marketOpen = true;
    }
  }

  closeMarket(): void {
    this.marketOpen = false;
  }

  openEncounters(): void {
    if (this.selectedHex?.world?.allowsEncounterTables(this.generateAllEcosystems)) {
      this.encountersOpen = true;
    }
  }

  closeEncounters(): void {
    this.encountersOpen = false;
  }

  get marketWorld(): World | null {
    if (!this.marketOpen || !this.selectedHex?.world) {
      return null;
    }
    return this.selectedHex.world;
  }

  get encounterWorld(): World | null {
    if (!this.encountersOpen || !this.selectedHex?.world?.allowsEncounterTables(this.generateAllEcosystems)) {
      return null;
    }
    return this.selectedHex.world;
  }

  onCanvasClick(event: MouseEvent): void {
    if (!this.subsectorData) return;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const hexIndex = this.getHexAtPosition(x, y);
    if (hexIndex !== -1) {
      this.selectHex(hexIndex);
    } else {
      this.clearSelection();
    }
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (!this.subsectorData) return;
    
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const hexIndex = this.getHexAtPosition(x, y);
    if (hexIndex !== this.hoveredHexIndex) {
      this.hoveredHexIndex = hexIndex;
      this.drawSubsector(); // Redraw to show hover
    }
  }

  private drawSubsector(): void {
    if (!this.ctx || !this.subsectorData) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    // Debug: log removed now that we know it's working
    
    // Draw trade lanes first (behind hexes)
    this.drawTradeLanes();
    
    // Draw all hexes
    for (let i = 0; i < this.subsectorData.subsector.sectorHexes.length; i++) {
      const hex = this.subsectorData.subsector.sectorHexes[i];
      if (!hex.onMap) {
        continue;
      }
      const position = this.getCanvasHexPosition(i);
      this.drawHex(position.x, position.y, i, hex);
    }
  }

  private drawHex(x: number, y: number, index: number, hex: any): void {
    if (!this.ctx) return;
    
    const isSelected = index === this.selectedHexIndex;
    const isHovered = index === this.hoveredHexIndex;
    const hasWorld = hex.world !== null;
    
    // Draw flat-top hexagon shape
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      // Rotate by 30 degrees (π/6) to get flat-top orientation
      const angle = (Math.PI / 3) * i + (Math.PI / 6);
      const hx = x + this.hexRadius * Math.cos(angle);
      const hy = y + this.hexRadius * Math.sin(angle);
      
      if (i === 0) {
        this.ctx.moveTo(hx, hy);
      } else {
        this.ctx.lineTo(hx, hy);
      }
    }
    this.ctx.closePath();
    
    // Fill hexagon
    if (hasWorld) {
      this.ctx.fillStyle = this.canvasColor('--hex-world-fill', '#ffffff');
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = this.canvasColor('--hex-empty-fill', '#ffffff');
      this.ctx.fill();
    }

    if (isSelected) {
      this.ctx.strokeStyle = this.canvasColor('--hex-selected', '#111111');
      this.ctx.lineWidth = 2.5;
    } else if (isHovered) {
      this.ctx.strokeStyle = this.canvasColor('--hex-hover', '#111111');
      this.ctx.lineWidth = 1.75;
    } else if (hasWorld) {
      this.ctx.strokeStyle = this.canvasColor('--hex-world-stroke', '#111111');
      this.ctx.lineWidth = 1.5;
    } else {
      this.ctx.strokeStyle = this.canvasColor('--hex-empty-stroke', '#b5b5b5');
      this.ctx.lineWidth = 1;
    }
    this.ctx.stroke();

    this.ctx.fillStyle = this.canvasColor('--hex-label', '#444444');
    this.ctx.font = this.scaledFont(10, '"IBM Plex Sans"');
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    const coords = this.getHexCoordinates(index);
    this.ctx.fillText(coords, x, y - this.hexRadius + this.scaled(5));
    
    // Draw world info if present
    if (hasWorld) {
      this.drawWorldInfo(x, y, hex);
    } else if (hex.hasGasGiant) {
      this.drawMarkerStrip(x, y, [{ letter: 'G', token: '--mark-gas' }]);
    }
  }

  private drawWorldInfo(x: number, y: number, hex: SectorHex): void {
    if (!this.ctx || !hex.world) return;
    const world = hex.world;
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const localName = world.isHabitableForAnimals() ? world.localName?.trim() : '';
    if (localName) {
      this.ctx.fillStyle = this.canvasColor('--hex-label', '#444444');
      this.ctx.font = this.scaledFont(7, '"IBM Plex Sans"');
      this.ctx.fillText(this.fitCanvasText(localName, this.hexWidth * 0.85), x, y - this.scaled(18));
    }

    const port = world.starportType.toLowerCase();
    this.ctx.fillStyle = this.canvasColor(`--port-${port}`, this.canvasColor('--hex-uwp', '#111111'));
    this.ctx.font = this.scaledFont(14, '"IBM Plex Sans"', true);
    this.ctx.fillText(world.starportType, x, y - this.scaled(8));

    this.ctx.fillStyle = this.canvasColor('--hex-uwp', '#111111');
    this.ctx.font = this.scaledFont(8, '"IBM Plex Mono"');
    const uwp1 = `${this.formatHex(world.planetSize.key)}${this.formatHex(world.planetAtmosphere.key)}${this.formatHex(world.planetHydrographics.key)}`;
    this.ctx.fillText(uwp1, x, y + this.scaled(4));
    
    // UWP line 2
    const uwp2 = `${this.formatHex(world.planetPopulation.key)}${this.formatHex(world.planetGovernment.key)}${this.formatHex(world.planetLawLevel.key)}-${this.formatHex(world.planetTechLevel)}`;
    this.ctx.fillText(uwp2, x, y + this.scaled(14));
    
    const markers: { letter: string; token: string }[] = [];
    if (world.hasNavalBase) markers.push({ letter: 'N', token: '--mark-naval' });
    if (world.hasScoutBase) markers.push({ letter: 'S', token: '--mark-scout' });
    if (hex.hasGasGiant) markers.push({ letter: 'G', token: '--mark-gas' });
    if (this.psionicsEnabled && world.hasPsionicInstitute) {
      markers.push({ letter: 'I', token: '--mark-psi' });
    }

    this.drawMarkerStrip(x, y + this.scaled(24), markers);
  }

  private drawMarkerStrip(x: number, y: number, markers: { letter: string; token: string }[]): void {
    if (!this.ctx || markers.length === 0) {
      return;
    }

    this.ctx.font = this.scaledFont(8, '"IBM Plex Sans"', true);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    const gap = this.scaled(3);
    const widths = markers.map(marker => this.ctx!.measureText(marker.letter).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, markers.length - 1);
    let cursor = x - totalWidth / 2;
    for (let i = 0; i < markers.length; i++) {
      this.ctx.fillStyle = this.canvasColor(markers[i].token, this.canvasColor('--ink', '#111111'));
      this.ctx.fillText(markers[i].letter, cursor, y);
      cursor += widths[i] + gap;
    }
    this.ctx.textAlign = 'center';
  }

  private drawTradeLanes(): void {
    if (!this.ctx || !this.subsectorData) return;
    
    const processedPairs = new Set<string>();
    
    this.ctx.strokeStyle = this.canvasColor('--lane', '#111111');
    this.ctx.lineWidth = Math.max(1, this.scaled(1.25));
    this.ctx.globalAlpha = 1;
    
    for (let i = 0; i < this.subsectorData.subsector.sectorHexes.length; i++) {
      const hex = this.subsectorData.subsector.sectorHexes[i];
      if (hex.world && hex.world.spaceLanes) {
        for (const connectedHex of hex.world.spaceLanes) {
          const j = this.subsectorData.subsector.sectorHexes.indexOf(connectedHex);
          if (j !== -1) {
            const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (!processedPairs.has(pairKey)) {
              processedPairs.add(pairKey);
              
              const pos1 = this.getCanvasHexPosition(i);
              const pos2 = this.getCanvasHexPosition(j);
              
              // Calculate direction vector and shorten lines to go inside hexes
              const dx = pos2.x - pos1.x;
              const dy = pos2.y - pos1.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const inset = this.scaled(15);
              
              const startX = pos1.x + (dx / length) * inset;
              const startY = pos1.y + (dy / length) * inset;
              const endX = pos2.x - (dx / length) * inset;
              const endY = pos2.y - (dy / length) * inset;
              
              this.ctx.setLineDash([]);
              
              this.ctx.beginPath();
              this.ctx.moveTo(startX, startY);
              this.ctx.lineTo(endX, endY);
              this.ctx.stroke();
            }
          }
        }
      }
    }
    
    this.ctx.setLineDash([]);
    this.ctx.globalAlpha = 1.0;
  }

  private getCanvasHexPosition(index: number): { x: number, y: number } {
    return hexCanvasPosition(index, this.columns, this.hexWidth, this.hexHeight, this.mapScale);
  }

  private getHexAtPosition(canvasX: number, canvasY: number): number {
    if (!this.subsectorData) return -1;
    return hexIndexAtPosition(
      canvasX,
      canvasY,
      this.subsectorData.subsector.sectorHexes.length,
      this.columns,
      this.hexWidth,
      this.hexHeight,
      this.hexRadius,
      this.mapScale,
      (index) => this.subsectorData!.subsector.sectorHexes[index]?.onMap !== false
    );
  }

  private async commitWorld(flags: { trade?: boolean; ecosystem?: boolean } = {}): Promise<void> {
    const world = this.selectedHex?.world;
    if (world?.encounters && flags.ecosystem && !world.encounters.allEcosystems) {
      world.encounters.ecosystemSummary = describeStoredEcosystem(
        world,
        world.encounters.terrains.map(terrain => terrain.terrain)
      );
    }
    if (world && flags.trade && world.market) {
      await this.planetMarket.recomputeTradeModifiers(world);
    } else {
      this.subsectorManager.persistCurrentSubsector();
    }
    if (world && !world.allowsEncounterTables(this.generateAllEcosystems)) {
      this.encountersOpen = false;
    }
    this.editRevision++;
    this.drawSubsector();
  }

  private fitCanvasText(text: string, maxWidth: number): string {
    if (!this.ctx || this.ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let trimmed = text;
    while (trimmed.length > 1 && this.ctx.measureText(`${trimmed}…`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed}…`;
  }

  private scaled(value: number): number {
    return value * this.mapScale;
  }

  private scaledFont(size: number, family = '"IBM Plex Sans"', bold = false): string {
    const px = Math.max(6, Math.round(size * this.mapScale));
    const weight = bold ? '600 ' : '';
    return `${weight}${px}px ${family}, "IBM Plex Sans", sans-serif`;
  }

  private canvasColor(variableName: string, fallback: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    return value || fallback;
  }

  getHexColumn(index: number): number {
    return hexColumn(index, this.columns) + 1;
  }

  getHexRow(index: number): number {
    return hexRow(index, this.columns) + 1;
  }

  private calculateJumpDistance(index1: number, index2: number): number {
    const col1 = hexColumn(index1, this.columns);
    const row1 = hexRow(index1, this.columns);
    const col2 = hexColumn(index2, this.columns);
    const row2 = hexRow(index2, this.columns);
    
    const dx = Math.abs(col2 - col1);
    const dy = Math.abs(row2 - row1);
    return Math.max(dx, dy);
  }

  getHexCoordinates(index: number): string {
    return hexCoordinates(index, this.columns);
  }

  formatHex(value: number): string {
    // Convert values 10+ to hex digits (A, B, C, etc.) for compact display
    if (value >= 10) {
      return (value - 10 + 10).toString(16).toUpperCase();
    }
    return value.toString();
  }

  get worldHeading(): string {
    const coords = this.getHexCoordinates(this.selectedHexIndex);
    const world = this.selectedHex?.world;
    const localName = world?.isHabitableForAnimals() ? world.localName?.trim() : '';
    return localName ? `${coords} — ${localName}` : `${coords} - World Details`;
  }

  get routeCandidates(): { index: number; label: string }[] {
    if (!this.subsectorData || !this.selectedHex?.world) {
      return [];
    }
    const linked = new Set(this.selectedHex.world.spaceLanes);
    return this.subsectorData.subsector.sectorHexes
      .map((hex, index) => ({ hex, index }))
      .filter(({ hex }) => hex.onMap && !!hex.world && hex !== this.selectedHex && !linked.has(hex))
      .map(({ index }) => ({ index, label: this.getHexCoordinates(index) }));
  }

  setStarport(value: StarportType): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.starportType = value;
    void this.commitWorld();
  }

  setPlanetSize(value: number): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.planetSize = createPlanetSize(Number(value));
    void this.commitWorld({ trade: true });
  }

  setPlanetAtmosphere(value: number): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.planetAtmosphere = createPlanetAtmosphere(Number(value));
    void this.commitWorld({ trade: true, ecosystem: true });
  }

  setPlanetHydrographics(value: number): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.planetHydrographics = createPlanetHydrographics(Number(value));
    void this.commitWorld({ trade: true, ecosystem: true });
  }

  setPlanetPopulation(value: number): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.planetPopulation = createPlanetPopulation(Number(value));
    void this.commitWorld({ trade: true });
  }

  setPlanetGovernment(value: number): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.planetGovernment = createPlanetGovernment(Number(value));
    void this.commitWorld({ trade: true });
  }

  setPlanetLaw(value: number): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.planetLawLevel = createPlanetLawLevel(Number(value));
    void this.commitWorld();
  }

  setTechLevel(value: number): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.planetTechLevel = Number(value);
    void this.commitWorld();
  }

  setBalkanGovernment(state: BalkanState, value: number): void {
    state.government = createPlanetGovernment(Number(value));
    void this.commitWorld();
  }

  setBalkanLaw(state: BalkanState, value: number): void {
    state.lawLevel = createPlanetLawLevel(Number(value));
    void this.commitWorld();
  }

  setNavalBase(value: boolean): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.hasNavalBase = value;
    void this.commitWorld();
  }

  setScoutBase(value: boolean): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.hasScoutBase = value;
    void this.commitWorld();
  }

  setPsionicInstitute(value: boolean): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.hasPsionicInstitute = value;
    void this.commitWorld();
  }

  setPsionicPunishment(value: PsionicPunishment): void {
    const world = this.selectedHex?.world;
    if (!world) {
      return;
    }
    world.psionicPunishment = value;
    void this.commitWorld();
  }

  setGasGiant(value: boolean): void {
    if (!this.selectedHex) {
      return;
    }
    this.selectedHex.hasGasGiant = value;
    this.subsectorManager.persistCurrentSubsector();
    this.drawSubsector();
  }

  commitText(): void {
    this.subsectorManager.persistCurrentSubsector();
    this.drawSubsector();
  }

  addRoute(index: number): void {
    const current = this.selectedHex;
    const target = this.subsectorData?.subsector.sectorHexes[Number(index)];
    if (!current?.world || !target?.world || target === current || Number(index) < 0) {
      this.routeTarget = -1;
      return;
    }
    if (!current.world.spaceLanes.includes(target)) {
      current.world.spaceLanes.push(target);
    }
    if (!target.world.spaceLanes.includes(current)) {
      target.world.spaceLanes.push(current);
    }
    this.routeTarget = -1;
    void this.commitWorld();
  }

  removeRoute(index: number): void {
    const current = this.selectedHex;
    const target = this.subsectorData?.subsector.sectorHexes[index];
    if (!current?.world || !target?.world) {
      return;
    }
    current.world.spaceLanes = current.world.spaceLanes.filter(hex => hex !== target);
    target.world.spaceLanes = target.world.spaceLanes.filter(hex => hex !== current);
    void this.commitWorld();
  }

  getTradeRouteDetails(world: World): { index: number; destination: string; distance: number }[] {
    if (!world.spaceLanes || !this.subsectorData) return [];
    const hexes = this.subsectorData.subsector.sectorHexes;
    const currentIndex = hexes.findIndex(hex => hex.world === world);

    return world.spaceLanes.map(connectedHex => {
      const connectedIndex = hexes.indexOf(connectedHex);
      if (currentIndex === -1 || connectedIndex === -1) {
        return { index: -1, destination: 'Unknown', distance: 0 };
      }
      return {
        index: connectedIndex,
        destination: this.getHexCoordinates(connectedIndex),
        distance: this.calculateJumpDistance(currentIndex, connectedIndex)
      };
    }).filter(route => route.index !== -1)
      .sort((a, b) => a.distance - b.distance || a.destination.localeCompare(b.destination));
  }

  getStarportDescription(starportType: StarportType): string {
    const descriptions = {
      [StarportType.A]: 'Excellent',
      [StarportType.B]: 'Good',
      [StarportType.C]: 'Routine',
      [StarportType.D]: 'Poor',
      [StarportType.E]: 'Frontier',
      [StarportType.X]: 'No Starport'
    };
    return descriptions[starportType] || 'Unknown';
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  copyCode(): void {
    if (this.subsectorData) {
      navigator.clipboard.writeText(this.subsectorData.id).then(() => {
        // Could add a toast notification here
        console.log('Code copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy code:', err);
      });
    }
  }

  shareUrl(): void {
    if (this.subsectorData) {
      const url = `${window.location.origin}/subsector/${this.subsectorData.id}`;
      navigator.clipboard.writeText(url).then(() => {
        // Could add a toast notification here
        console.log('URL copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy URL:', err);
      });
    }
  }
}

function numberKeys(min: number, max: number): number[] {
  const keys: number[] = [];
  for (let key = min; key <= max; key++) {
    keys.push(key);
  }
  return keys;
}
