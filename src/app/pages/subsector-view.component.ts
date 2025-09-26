import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SubsectorManagerService, SubsectorData } from '../services/subsector-manager.service';
import { SectorHex } from '../models/sectorhex';
import { World, StarportType } from '../models/world';

@Component({
  selector: 'app-subsector-view',
  standalone: true,
  imports: [CommonModule],
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
        </div>
      </header>

      <!-- Statistics Panel -->
      <div class="stats-panel">
        <div class="stat-item">
          <div class="stat-number">{{ worldCount }}</div>
          <div class="stat-label">Worlds</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ starportStats.A + starportStats.B }}</div>
          <div class="stat-label">Major Ports</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ spaceLaneCount }}</div>
          <div class="stat-label">Trade Routes</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">{{ navalBases + scoutBases }}</div>
          <div class="stat-label">Bases</div>
        </div>
      </div>

      <!-- Hex Map -->
      <div class="hex-map-container">
        <div class="hex-map">
          <div class="hex-grid">
            <div 
              *ngFor="let row of getHexRows()" 
              class="hex-row"
            >
              <div 
                *ngFor="let hexData of row.hexes; let colIndex = index"
                class="hex-cell"
                [class.has-world]="hexData.hex.world"
                [class.selected]="selectedHexIndex === hexData.index"
                (click)="selectHex(hexData.index)"
              >
                <div class="hex-content">
                  <div class="hex-coordinates">{{ getHexCoordinates(hexData.index) }}</div>
                  <div *ngIf="hexData.hex.world" class="world-info">
                    <div class="starport">{{ hexData.hex.world.starportType }}</div>
                    <div class="world-stats">
                      {{ hexData.hex.world.planetSize.key }}{{ hexData.hex.world.planetAtmosphere.key }}{{ hexData.hex.world.planetHydrographics.key }}
                    </div>
                    <div class="world-gov">
                      {{ hexData.hex.world.planetPopulation.key }}{{ hexData.hex.world.planetGovernment.key }}{{ hexData.hex.world.planetLawLevel.key }}-{{ hexData.hex.world.planetTechLevel }}
                    </div>
                    <div class="bases" *ngIf="hexData.hex.world.hasNavalBase || hexData.hex.world.hasScoutBase">
                      <span *ngIf="hexData.hex.world.hasNavalBase" class="naval-base">N</span>
                      <span *ngIf="hexData.hex.world.hasScoutBase" class="scout-base">S</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- World Detail Panel -->
        <div class="world-detail-panel" *ngIf="selectedHex && selectedHex.world">
          <div class="panel-header">
            <h3>{{ getHexCoordinates(selectedHexIndex) }} - World Details</h3>
            <button class="btn btn-close" (click)="clearSelection()">×</button>
          </div>
          
          <div class="panel-content">
            <div class="detail-grid">
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
              
              <div class="detail-item">
                <label>Law Level:</label>
                <span>{{ selectedHex.world.planetLawLevel.key }} ({{ selectedHex.world.planetLawLevel.label }})</span>
              </div>
              
              <div class="detail-item">
                <label>Tech Level:</label>
                <span>{{ selectedHex.world.planetTechLevel }}</span>
              </div>
              
              <div class="detail-item" *ngIf="selectedHex.world.hasNavalBase || selectedHex.world.hasScoutBase">
                <label>Bases:</label>
                <span>
                  <span *ngIf="selectedHex.world.hasNavalBase" class="base-tag naval">Naval Base</span>
                  <span *ngIf="selectedHex.world.hasScoutBase" class="base-tag scout">Scout Base</span>
                </span>
              </div>
              
              <div class="detail-item" *ngIf="selectedHex.world.hasPsionicInstitute">
                <label>Special:</label>
                <span class="base-tag psionic">Psionic Institute</span>
              </div>
              
              <div class="detail-item" *ngIf="selectedHex.world.spaceLanes.length > 0">
                <label>Trade Routes:</label>
                <span>{{ selectedHex.world.spaceLanes.length }} connections</span>
              </div>
            </div>
          </div>
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
      background: #f5f7fa;
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

    .stats-panel {
      background: white;
      padding: 2rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .stat-item {
      text-align: center;
    }

    .stat-number {
      font-size: 3rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: #666;
      font-size: 1.1rem;
    }

    .hex-map-container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1rem;
      display: flex;
      gap: 2rem;
    }

    .hex-map {
      flex: 1;
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .hex-grid {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: -5px;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    .hex-row {
      display: flex;
      gap: 2px;
    }

    .hex-row:nth-child(even) {
      margin-left: 40px;
    }

    .hex-cell {
      width: 70px;
      height: 70px;
      position: relative;
      cursor: pointer;
      transition: all 0.3s ease;
      margin: 2px;
    }

    .hex-cell::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #f8f9fa;
      border: 2px solid #e1e5e9;
      clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
      transition: all 0.3s ease;
    }

    .hex-cell:hover::before {
      border-color: #667eea;
      transform: scale(1.05);
    }

    .hex-cell.has-world::before {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-color: #2196f3;
    }

    .hex-cell.selected::before {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
      transform: scale(1.05);
    }

    .hex-content {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 8px;
      font-size: 0.6rem;
      z-index: 1;
      text-align: center;
    }

    .hex-coordinates {
      font-weight: bold;
      color: #666;
      font-size: 0.6rem;
    }

    .world-info {
      text-align: center;
    }

    .starport {
      font-weight: bold;
      font-size: 1rem;
      margin-bottom: 0.2rem;
    }

    .world-stats, .world-gov {
      font-family: 'Courier New', monospace;
      font-size: 0.6rem;
      line-height: 1.2;
    }

    .bases {
      display: flex;
      justify-content: center;
      gap: 0.2rem;
      margin-top: 0.2rem;
    }

    .naval-base, .scout-base {
      background: #dc3545;
      color: white;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
      font-size: 0.5rem;
      font-weight: bold;
    }

    .scout-base {
      background: #28a745;
    }

    .world-detail-panel {
      width: 400px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      max-height: 600px;
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
      color: #333;
      font-size: 0.9rem;
    }

    .detail-item span {
      color: #666;
      font-size: 0.95rem;
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

    .base-tag.psionic {
      background: #6f42c1;
      color: white;
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
      color: #333;
      margin-bottom: 1rem;
    }

    .not-found p {
      font-size: 1.2rem;
      color: #666;
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

      .hex-map-container {
        flex-direction: column;
      }

      .world-detail-panel {
        width: 100%;
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
export class SubsectorViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  subsectorData: SubsectorData | null = null;
  selectedHexIndex = -1;
  selectedHex: SectorHex | null = null;
  
  // Statistics
  worldCount = 0;
  starportStats = { A: 0, B: 0, C: 0, D: 0, E: 0, X: 0 };
  spaceLaneCount = 0;
  navalBases = 0;
  scoutBases = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subsectorManager: SubsectorManagerService
  ) {}

  ngOnInit(): void {
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

  private loadSubsector(id: string): void {
    this.subsectorData = this.subsectorManager.getSubsector(id);
    if (this.subsectorData) {
      this.calculateStatistics();
    }
  }

  private calculateStatistics(): void {
    if (!this.subsectorData) return;

    this.worldCount = 0;
    this.starportStats = { A: 0, B: 0, C: 0, D: 0, E: 0, X: 0 };
    this.spaceLaneCount = 0;
    this.navalBases = 0;
    this.scoutBases = 0;

    const processedSpaceLanes = new Set<string>();

    for (const hex of this.subsectorData.subsector.sectorHexes) {
      if (hex.world) {
        this.worldCount++;
        
        // Count starports
        const starportKey = StarportType[hex.world.starportType] as keyof typeof this.starportStats;
        this.starportStats[starportKey]++;
        
        // Count bases
        if (hex.world.hasNavalBase) this.navalBases++;
        if (hex.world.hasScoutBase) this.scoutBases++;
        
        // Count unique space lanes
        for (const connectedHex of hex.world.spaceLanes) {
          const hexIndex = this.subsectorData.subsector.sectorHexes.indexOf(hex);
          const connectedIndex = this.subsectorData.subsector.sectorHexes.indexOf(connectedHex);
          const laneKey = hexIndex < connectedIndex ? `${hexIndex}-${connectedIndex}` : `${connectedIndex}-${hexIndex}`;
          
          if (!processedSpaceLanes.has(laneKey)) {
            processedSpaceLanes.add(laneKey);
            this.spaceLaneCount++;
          }
        }
      }
    }
  }

  selectHex(index: number): void {
    this.selectedHexIndex = index;
    this.selectedHex = this.subsectorData?.subsector.sectorHexes[index] || null;
  }

  clearSelection(): void {
    this.selectedHexIndex = -1;
    this.selectedHex = null;
  }

  getHexColumn(index: number): number {
    return (index % 10) + 1;
  }

  getHexRow(index: number): number {
    return Math.floor(index / 10) + 1;
  }

  getHexRows(): { hexes: { hex: any, index: number }[] }[] {
    if (!this.subsectorData) return [];
    
    const rows: { hexes: { hex: any, index: number }[] }[] = [];
    
    for (let row = 0; row < 8; row++) {
      const hexes: { hex: any, index: number }[] = [];
      for (let col = 0; col < 10; col++) {
        const index = row * 10 + col;
        hexes.push({
          hex: this.subsectorData.subsector.sectorHexes[index],
          index: index
        });
      }
      rows.push({ hexes });
    }
    
    return rows;
  }

  getHexCoordinates(index: number): string {
    const col = (index % 10) + 1;
    const row = Math.floor(index / 10) + 1;
    return `${col.toString().padStart(2, '0')}${row.toString().padStart(2, '0')}`;
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
