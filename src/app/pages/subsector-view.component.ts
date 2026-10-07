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
          <button class="btn btn-back" (click)="goHome()">
            ← Back to Home
          </button>
          
          <div class="header-info">
            <h1>{{ subsectorData.name }}</h1>
            <div class="subsector-meta">
              <span class="subsector-code">Code: {{ subsectorData.id }}</span>
              <span class="subsector-date">Created: {{ subsectorData.createdAt | date:'short' }}</span>
              <button class="btn btn-copy" (click)="copyCode()">📋 Copy Code</button>
              <button class="btn btn-share" (click)="shareUrl()">🔗 Share URL</button>
            </div>
          </div>

          <div class="header-tools">
            <button
              type="button"
              class="edit-mode-toggle"
              [class.active]="editMode"
              [attr.aria-pressed]="editMode"
              (click)="editMode = !editMode"
            >Edit mode</button>
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
        </div>

        <!-- World Detail Panel -->
        <div class="world-detail-column" *ngIf="selectedHex && selectedHex.world">
          <div class="world-detail-panel">
            <div class="panel-header">
              <h3>{{ worldHeading }}</h3>
              <button class="btn btn-close" (click)="clearSelection()">×</button>
            </div>
            
            <div class="panel-content">
              <div class="detail-grid" *ngIf="editMode; else worldReadOnly">
                <ng-container *ngIf="selectedHex.world.isHabitableForAnimals()">
                  <div class="detail-item">
                    <label for="world-local-name">Local name:</label>
                    <input
                      id="world-local-name"
                      class="field-control"
                      [ngModel]="selectedHex.world.localName"
                      (ngModelChange)="selectedHex.world.localName = $event"
                      (change)="commitText()"
                    />
                  </div>
                  <div class="detail-item">
                    <label for="world-description">Description:</label>
                    <textarea
                      id="world-description"
                      class="field-control"
                      rows="3"
                      [ngModel]="selectedHex.world.description"
                      (ngModelChange)="selectedHex.world.description = $event"
                      (change)="commitText()"
                    ></textarea>
                  </div>
                </ng-container>

                <div class="detail-item">
                  <label for="world-starport">Starport:</label>
                  <select
                    id="world-starport"
                    class="field-control starport-{{ selectedHex.world.starportType }}"
                    [ngModel]="selectedHex.world.starportType"
                    (ngModelChange)="setStarport($event)"
                  >
                    <option *ngFor="let type of starportTypes" [ngValue]="type">
                      {{ type }} - {{ getStarportDescription(type) }}
                    </option>
                  </select>
                </div>

                <div class="detail-item">
                  <label for="world-size">Size:</label>
                  <select id="world-size" class="field-control" [ngModel]="selectedHex.world.planetSize.key" (ngModelChange)="setPlanetSize($event)">
                    <option *ngFor="let key of sizeKeys" [ngValue]="key">{{ key }}</option>
                  </select>
                  <span>{{ selectedHex.world.planetSize.label }}</span>
                </div>

                <div class="detail-item">
                  <label for="world-atmosphere">Atmosphere:</label>
                  <select id="world-atmosphere" class="field-control" [ngModel]="selectedHex.world.planetAtmosphere.key" (ngModelChange)="setPlanetAtmosphere($event)">
                    <option *ngFor="let key of atmosphereKeys" [ngValue]="key">{{ key }}</option>
                  </select>
                  <span>{{ selectedHex.world.planetAtmosphere.label }}</span>
                </div>

                <div class="detail-item">
                  <label for="world-hydrographics">Hydrographics:</label>
                  <select id="world-hydrographics" class="field-control" [ngModel]="selectedHex.world.planetHydrographics.key" (ngModelChange)="setPlanetHydrographics($event)">
                    <option *ngFor="let key of hydroKeys" [ngValue]="key">{{ key }}</option>
                  </select>
                  <span>{{ selectedHex.world.planetHydrographics.label }}</span>
                </div>

                <div class="detail-item">
                  <label for="world-population">Population:</label>
                  <select id="world-population" class="field-control" [ngModel]="selectedHex.world.planetPopulation.key" (ngModelChange)="setPlanetPopulation($event)">
                    <option *ngFor="let key of populationKeys" [ngValue]="key">{{ key }}</option>
                  </select>
                  <span>{{ selectedHex.world.planetPopulation.label }}</span>
                </div>

                <div class="detail-item">
                  <label for="world-government">Government:</label>
                  <select id="world-government" class="field-control" [ngModel]="selectedHex.world.planetGovernment.key" (ngModelChange)="setPlanetGovernment($event)">
                    <option *ngFor="let key of governmentKeys" [ngValue]="key">{{ key }}</option>
                  </select>
                  <span>{{ selectedHex.world.planetGovernment.label }}</span>
                </div>

                <div class="detail-item" *ngIf="selectedHex.world.planetGovernment.key === 7 && selectedHex.world.balkanStates?.length">
                  <label>Balkan states:</label>
                  <div class="balkan-states">
                    <div *ngFor="let state of selectedHex.world.balkanStates; let i = index" class="balkan-state">
                      <strong>{{ i === 0 ? 'Starport' : 'State ' + (i + 1) }}</strong>
                      <label [attr.for]="'balkan-gov-' + i">Government</label>
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
                    </div>
                  </div>
                </div>

                <div class="detail-item">
                  <label for="world-law">Law Level:</label>
                  <select id="world-law" class="field-control" [ngModel]="selectedHex.world.planetLawLevel.key" (ngModelChange)="setPlanetLaw($event)">
                    <option *ngFor="let key of lawKeys" [ngValue]="key">{{ key }}</option>
                  </select>
                  <span>{{ selectedHex.world.planetLawLevel.label }}</span>
                </div>

                <div class="detail-item">
                  <label for="world-tech">Tech Level:</label>
                  <select id="world-tech" class="field-control" [ngModel]="selectedHex.world.planetTechLevel" (ngModelChange)="setTechLevel($event)">
                    <option *ngFor="let key of techKeys" [ngValue]="key">{{ key }}</option>
                  </select>
                </div>

                <div class="detail-item">
                  <label>Trade classifications:</label>
                  <span *ngIf="selectedHex.world.getTradeClassLabels().length; else noTradeClasses">
                    {{ selectedHex.world.getTradeClassLabels().join(', ') }}
                  </span>
                  <ng-template #noTradeClasses><span>None</span></ng-template>
                </div>

                <div class="detail-item">
                  <label>Bases:</label>
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
                      Gas Giant
                    </label>
                    <label class="check" *ngIf="psionicsEnabled">
                      <input type="checkbox" [ngModel]="selectedHex.world.hasPsionicInstitute" (ngModelChange)="setPsionicInstitute($event)" />
                      Psionic Institute
                    </label>
                  </div>
                </div>

                <div class="detail-item" *ngIf="psionicsEnabled">
                  <label for="world-punishment">Psionic Punishment:</label>
                  <select
                    id="world-punishment"
                    class="field-control"
                    [ngModel]="selectedHex.world.psionicPunishment"
                    (ngModelChange)="setPsionicPunishment($event)"
                  >
                    <option *ngFor="let punishment of psionicPunishments" [ngValue]="punishment">{{ punishment }}</option>
                  </select>
                </div>

                <div class="detail-item">
                  <label>Trade Routes:</label>
                  <div class="trade-routes-list" *ngIf="getTradeRouteDetails(selectedHex.world).length">
                    <div *ngFor="let route of getTradeRouteDetails(selectedHex.world)" class="trade-route">
                      <span>{{ route.destination }} (Jump-{{ route.distance }})</span>
                      <button type="button" class="btn-inline" (click)="removeRoute(route.index)">Remove</button>
                    </div>
                  </div>
                  <span *ngIf="!getTradeRouteDetails(selectedHex.world).length">None</span>
                  <label for="world-add-route">Add route</label>
                  <select id="world-add-route" class="field-control" [ngModel]="routeTarget" (ngModelChange)="addRoute($event)">
                    <option [ngValue]="-1">Choose a world</option>
                    <option *ngFor="let candidate of routeCandidates" [ngValue]="candidate.index">{{ candidate.label }}</option>
                  </select>
                </div>
              </div>
              <ng-template #worldReadOnly>
                <div class="detail-grid">
                  <div class="detail-item" *ngIf="selectedHex.world.isHabitableForAnimals() && selectedHex.world.description?.trim()">
                    <label>Description:</label>
                    <span>{{ selectedHex.world.description }}</span>
                  </div>
                  <div class="detail-item">
                    <label>Starport:</label>
                    <span class="starport-{{ selectedHex.world.starportType }}">
                      {{ selectedHex.world.starportType }} - {{ getStarportDescription(selectedHex.world.starportType) }}
                    </span>
                  </div>
                  <div class="detail-item">
                    <label>Size:</label>
                    <span>{{ selectedHex.world.planetSize.key }} ({{ selectedHex.world.planetSize.label }})</span>
                  </div>
                  <div class="detail-item">
                    <label>Atmosphere:</label>
                    <span>{{ selectedHex.world.planetAtmosphere.key }} ({{ selectedHex.world.planetAtmosphere.label }})</span>
                  </div>
                  <div class="detail-item">
                    <label>Hydrographics:</label>
                    <span>{{ selectedHex.world.planetHydrographics.key }} ({{ selectedHex.world.planetHydrographics.label }})</span>
                  </div>
                  <div class="detail-item">
                    <label>Population:</label>
                    <span>{{ selectedHex.world.planetPopulation.key }} ({{ selectedHex.world.planetPopulation.label }})</span>
                  </div>
                  <div class="detail-item">
                    <label>Government:</label>
                    <span>{{ selectedHex.world.planetGovernment.key }} ({{ selectedHex.world.planetGovernment.label }})</span>
                  </div>
                  <div class="detail-item" *ngIf="autoRollBalkanization && selectedHex.world.balkanStates?.length">
                    <label>Balkan states:</label>
                    <div class="balkan-states">
                      <div *ngFor="let state of selectedHex.world.balkanStates; let i = index" class="balkan-state">
                        <strong>{{ i === 0 ? 'Starport' : 'State ' + (i + 1) }}:</strong>
                        Gov {{ state.government.key }} ({{ state.government.label }})
                        · Law {{ state.lawLevel.key }} ({{ state.lawLevel.label }})
                      </div>
                    </div>
                  </div>
                  <div class="detail-item">
                    <label>Law Level:</label>
                    <span>{{ selectedHex.world.planetLawLevel.key }} ({{ selectedHex.world.planetLawLevel.label }})</span>
                  </div>
                  <div class="detail-item">
                    <label>Tech Level:</label>
                    <span>{{ selectedHex.world.planetTechLevel }}</span>
                  </div>
                  <div class="detail-item" *ngIf="selectedHex.world.hasNavalBase || selectedHex.world.hasScoutBase || selectedHex.hasGasGiant">
                    <label>Bases:</label>
                    <span>
                      <span *ngIf="selectedHex.world.hasNavalBase" class="base-tag naval">Naval Base</span>
                      <span *ngIf="selectedHex.world.hasScoutBase" class="base-tag scout">Scout Base</span>
                      <span *ngIf="selectedHex.hasGasGiant" class="base-tag gas-giant">Gas Giant</span>
                    </span>
                  </div>
                  <div class="detail-item" *ngIf="psionicsEnabled && selectedHex.world.hasPsionicInstitute">
                    <label>Special:</label>
                    <span class="base-tag psionic">Psionic Institute</span>
                  </div>
                  <div class="detail-item" *ngIf="psionicsEnabled && selectedHex.world.psionicPunishment">
                    <label>Psionic Punishment:</label>
                    <span>{{ selectedHex.world.psionicPunishment }}</span>
                  </div>
                  <div class="detail-item" *ngIf="selectedHex.world.spaceLanes.length > 0">
                    <label>Trade Routes:</label>
                    <div class="trade-routes-list">
                      <div *ngFor="let route of getTradeRouteDetails(selectedHex.world)" class="trade-route">
                        {{ route.destination }} (Jump-{{ route.distance }})
                      </div>
                    </div>
                  </div>
                </div>
              </ng-template>
            </div>
          </div>
          <div class="world-actions">
            <button type="button" class="btn-market" (click)="openMarket()">Equipment &amp; Market</button>
            <button
              type="button"
              class="btn-market"
              *ngIf="selectedHex.world.allowsEncounterTables(generateAllEcosystems)"
              (click)="openEncounters()"
            >Encounter Tables</button>
          </div>
        </div>

        <div class="world-detail-column" *ngIf="selectedHex && !selectedHex.world && (editMode || selectedHex.hasGasGiant)">
          <div class="world-detail-panel">
            <div class="panel-header">
              <h3>{{ getHexCoordinates(selectedHexIndex) }} - System</h3>
              <button class="btn btn-close" (click)="clearSelection()">×</button>
            </div>
            <div class="panel-content">
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Mainworld:</label>
                  <span>None</span>
                </div>
                <div class="detail-item" *ngIf="editMode; else gasGiantReadOnly">
                  <label class="check">
                    <input type="checkbox" [ngModel]="selectedHex.hasGasGiant" (ngModelChange)="setGasGiant($event)" />
                    Gas Giant
                  </label>
                </div>
                <ng-template #gasGiantReadOnly>
                  <div class="detail-item">
                    <label>Bases:</label>
                    <span class="base-tag gas-giant">Gas Giant</span>
                  </div>
                </ng-template>
              </div>
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
        <h1>Subsector Not Found</h1>
        <p>The subsector you're looking for doesn't exist or has been deleted.</p>
        <button class="btn btn-primary" (click)="goHome()">Return to Home</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .subsector-container {
      min-height: 100vh;
      background: var(--bg-page);
    }

    .subsector-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem 1rem;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .header-info {
      flex: 1;
    }

    .header-tools {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-shrink: 0;
    }

    .edit-mode-toggle {
      height: 2.6rem;
      padding: 0 0.9rem;
      border-radius: 8px;
      border: 2px solid rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.18);
      color: white;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .edit-mode-toggle:hover,
    .edit-mode-toggle.active {
      background: rgba(255, 255, 255, 0.3);
    }

    .edit-mode-toggle.active {
      background: white;
      color: #4c3f91;
      border-color: white;
    }

    .btn-back {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.3);
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-back:hover {
      background: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .header-info h1 {
      margin: 0 0 1rem 0;
      font-size: 2.5rem;
    }

    .subsector-meta {
      display: flex;
      align-items: center;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .subsector-code {
      font-family: 'Courier New', monospace;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: bold;
    }

    .subsector-date {
      opacity: 0.8;
    }

    .btn-copy, .btn-share {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-copy:hover, .btn-share:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .hex-map-container {
      max-width: 1400px;
      margin: 2rem auto;
      padding: 0 1rem;
      display: flex;
      gap: 2rem;
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
      gap: 2rem;
    }

    .map-and-detail {
      display: flex;
      gap: 2rem;
      align-items: flex-start;
    }

    .encounter-column {
      width: min(1240px, calc(100vw - 28rem));
      min-width: 980px;
      flex-shrink: 0;
      height: calc(100vh - 12rem);
      max-height: calc(100vh - 12rem);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      overscroll-behavior: contain;
    }

    .hex-map {
      flex: 1;
      min-width: 24rem;
      background: var(--bg-card);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 20px var(--shadow);
      overflow: auto;
      max-height: calc(100vh - 12rem);
      overscroll-behavior: contain;
    }

    .hex-canvas {
      display: block;
      margin: 0 auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      background: var(--bg-canvas);
    }

    .world-detail-column {
      width: 400px;
      min-width: 400px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .world-detail-panel {
      background: var(--bg-card);
      border-radius: 12px;
      box-shadow: 0 4px 20px var(--shadow);
      max-height: 700px;
      overflow-y: auto;
    }

    .panel-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 12px 12px 0 0;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 1.2rem;
    }

    .btn-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }

    .btn-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .panel-content {
      padding: 1.5rem;
    }

    .detail-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item label {
      font-weight: bold;
      color: var(--text-primary);
      font-size: 0.9rem;
    }

    .detail-item span {
      color: var(--text-secondary);
      font-size: 0.95rem;
    }

    .field-control {
      width: 100%;
      box-sizing: border-box;
      padding: 0.4rem 0.5rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-card);
      color: var(--text-primary);
      font: inherit;
    }

    .check-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem 1rem;
    }

    .check {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .btn-inline {
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-primary);
      border-radius: 4px;
      padding: 0.15rem 0.45rem;
      cursor: pointer;
      font-size: 0.75rem;
    }

    .detail-item .base-tag {
      color: #fff;
    }

    .base-tag {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      margin-right: 0.5rem;
    }

    .base-tag.naval {
      background: #dc3545;
      color: white;
    }

    .base-tag.scout {
      background: #28a745;
      color: white;
    }

    .base-tag.gas-giant {
      background: #17a2b8;
      color: white;
    }

    .base-tag.psionic {
      background: #6f42c1;
      color: white;
    }

    .trade-routes-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .trade-route {
      background: var(--bg-muted);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      border-left: 3px solid var(--lane);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }

    .balkan-states {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .balkan-state {
      background: var(--bg-muted);
      padding: 0.45rem 0.6rem;
      border-radius: 6px;
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .btn-market {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.65rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      width: 100%;
    }

    .btn-market:hover {
      box-shadow: 0 6px 18px rgba(102, 126, 234, 0.35);
    }

    .world-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .starport-A { color: #28a745; font-weight: bold; }
    .starport-B { color: #17a2b8; font-weight: bold; }
    .starport-C { color: #ffc107; font-weight: bold; }
    .starport-D { color: #fd7e14; font-weight: bold; }
    .starport-E { color: #dc3545; font-weight: bold; }
    .starport-X { color: #6c757d; font-weight: bold; }

    .not-found {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }

    .not-found h1 {
      font-size: 3rem;
      color: var(--text-primary);
      margin-bottom: 1rem;
    }

    .not-found p {
      font-size: 1.2rem;
      color: var(--text-secondary);
      margin-bottom: 2rem;
    }

    .btn {
      padding: 1rem 2rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .subsector-meta {
        gap: 1rem;
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

      .hex-grid {
        gap: 2px;
      }

      .hex-content {
        font-size: 0.6rem;
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
      this.ctx.fillStyle = this.canvasColor('--hex-world-fill', '#e3f2fd');
      this.ctx.fill();
    } else {
      this.ctx.fillStyle = this.canvasColor('--hex-empty-fill', '#f8f9fa');
      this.ctx.globalAlpha = 0.35;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }
    
    // Stroke hexagon
    if (isSelected) {
      this.ctx.strokeStyle = this.canvasColor('--accent', '#667eea');
      this.ctx.lineWidth = 3;
    } else if (isHovered) {
      this.ctx.strokeStyle = this.canvasColor('--accent', '#667eea');
      this.ctx.lineWidth = 2;
    } else if (hasWorld) {
      this.ctx.strokeStyle = this.canvasColor('--hex-world-stroke', '#2196f3');
      this.ctx.lineWidth = 2;
    } else {
      this.ctx.strokeStyle = this.canvasColor('--hex-empty-stroke', '#e1e5e9');
      this.ctx.lineWidth = 1;
    }
    this.ctx.stroke();
    
    // Draw hex coordinates
    this.ctx.fillStyle = this.canvasColor('--hex-label', '#666');
    this.ctx.font = this.scaledFont(10);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    const coords = this.getHexCoordinates(index);
    this.ctx.fillText(coords, x, y - this.hexRadius + this.scaled(5));
    
    // Draw world info if present
    if (hasWorld) {
      this.drawWorldInfo(x, y, hex);
    } else if (hex.hasGasGiant) {
      this.drawMarkerStrip(x, y, [{ letter: 'G', color: '#17a2b8' }]);
    }
  }

  private drawWorldInfo(x: number, y: number, hex: SectorHex): void {
    if (!this.ctx || !hex.world) return;
    const world = hex.world;
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const localName = world.isHabitableForAnimals() ? world.localName?.trim() : '';
    if (localName) {
      this.ctx.fillStyle = this.canvasColor('--hex-label', '#666');
      this.ctx.font = this.scaledFont(7);
      this.ctx.fillText(this.fitCanvasText(localName, this.hexWidth * 0.85), x, y - this.scaled(18));
    }

    // Starport
    this.ctx.fillStyle = this.canvasColor('--hex-uwp', '#000');
    this.ctx.font = this.scaledFont(14, 'Arial', true);
    this.ctx.fillText(world.starportType, x, y - this.scaled(8));
    
    // UWP line 1
    this.ctx.font = this.scaledFont(8, 'Courier New');
    const uwp1 = `${this.formatHex(world.planetSize.key)}${this.formatHex(world.planetAtmosphere.key)}${this.formatHex(world.planetHydrographics.key)}`;
    this.ctx.fillText(uwp1, x, y + this.scaled(4));
    
    // UWP line 2
    const uwp2 = `${this.formatHex(world.planetPopulation.key)}${this.formatHex(world.planetGovernment.key)}${this.formatHex(world.planetLawLevel.key)}-${this.formatHex(world.planetTechLevel)}`;
    this.ctx.fillText(uwp2, x, y + this.scaled(14));
    
    const markers: { letter: string; color: string }[] = [];
    if (world.hasNavalBase) markers.push({ letter: 'N', color: '#dc3545' });
    if (world.hasScoutBase) markers.push({ letter: 'S', color: '#28a745' });
    if (hex.hasGasGiant) markers.push({ letter: 'G', color: '#17a2b8' });
    if (this.psionicsEnabled && world.hasPsionicInstitute) {
      markers.push({ letter: 'I', color: '#6f42c1' });
    }

    this.drawMarkerStrip(x, y + this.scaled(24), markers);
  }

  private drawMarkerStrip(x: number, y: number, markers: { letter: string; color: string }[]): void {
    if (!this.ctx || markers.length === 0) {
      return;
    }

    this.ctx.font = this.scaledFont(8, 'Arial', true);
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    const widths = markers.map(marker => this.ctx!.measureText(marker.letter).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    let cursor = x - totalWidth / 2;
    for (let i = 0; i < markers.length; i++) {
      this.ctx.fillStyle = markers[i].color;
      this.ctx.fillText(markers[i].letter, cursor, y);
      cursor += widths[i];
    }
    this.ctx.textAlign = 'center';
  }

  private drawTradeLanes(): void {
    if (!this.ctx || !this.subsectorData) return;
    
    const processedPairs = new Set<string>();
    
    this.ctx.strokeStyle = this.canvasColor('--lane', '#2196f3');
    this.ctx.lineWidth = Math.max(1, this.scaled(2));
    this.ctx.globalAlpha = 0.6;
    
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

  private scaledFont(size: number, family = 'Arial', bold = false): string {
    const px = Math.max(6, Math.round(size * this.mapScale));
    return `${bold ? 'bold ' : ''}${px}px ${family}`;
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
