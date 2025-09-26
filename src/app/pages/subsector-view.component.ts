import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .hex-canvas {
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      cursor: pointer;
      background: #fafafa;
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
export class SubsectorViewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('hexCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private destroy$ = new Subject<void>();
  private ctx!: CanvasRenderingContext2D;
  
  subsectorData: SubsectorData | null = null;
  selectedHexIndex = -1;
  selectedHex: SectorHex | null = null;
  
  // Canvas properties
  canvasWidth = 1200;
  canvasHeight = 800;
  private hexRadius = 32;
  private hoveredHexIndex = -1;
  
  // Calculated properties - use getters to ensure they update
  get hexWidth(): number {
    return this.hexRadius * Math.sqrt(3); // Width for flat-top hex
  }
  
  get hexHeight(): number {
    return this.hexRadius * 2; // Height for flat-top hex
  }
  
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

  ngAfterViewInit(): void {
    if (this.canvasRef?.nativeElement) {
      this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
      console.log('Canvas context initialized, forcing redraw');
      // Force immediate redraw
      setTimeout(() => this.drawSubsector(), 0);
      setTimeout(() => this.drawSubsector(), 100);
    }
  }

  private loadSubsector(id: string): void {
    this.subsectorData = this.subsectorManager.getSubsector(id);
    if (this.subsectorData) {
      this.calculateStatistics();
      if (this.ctx) {
        this.drawSubsector();
      }
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
    this.drawSubsector(); // Redraw to show selection
  }

  clearSelection(): void {
    this.selectedHexIndex = -1;
    this.selectedHex = null;
    this.drawSubsector(); // Redraw to clear selection
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
    
    // Debug: log to console to verify this is being called
    console.log('Drawing subsector with hexRadius:', this.hexRadius, 'hexWidth:', this.hexWidth, 'hexHeight:', this.hexHeight);
    
    // Draw trade lanes first (behind hexes)
    this.drawTradeLanes();
    
    // Draw all hexes
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 10; col++) {
        const index = row * 10 + col;
        const hex = this.subsectorData.subsector.sectorHexes[index];
        const position = this.getCanvasHexPosition(index);
        
        this.drawHex(position.x, position.y, index, hex);
      }
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
      this.ctx.fillStyle = '#e3f2fd';
    } else {
      this.ctx.fillStyle = '#f8f9fa';
    }
    this.ctx.fill();
    
    // Stroke hexagon
    if (isSelected) {
      this.ctx.strokeStyle = '#667eea';
      this.ctx.lineWidth = 3;
    } else if (isHovered) {
      this.ctx.strokeStyle = '#667eea';
      this.ctx.lineWidth = 2;
    } else if (hasWorld) {
      this.ctx.strokeStyle = '#2196f3';
      this.ctx.lineWidth = 2;
    } else {
      this.ctx.strokeStyle = '#e1e5e9';
      this.ctx.lineWidth = 1;
    }
    this.ctx.stroke();
    
    // Draw hex coordinates
    this.ctx.fillStyle = '#666';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    const coords = this.getHexCoordinates(index);
    this.ctx.fillText(coords, x, y - this.hexRadius + 5);
    
    // Draw world info if present
    if (hasWorld) {
      this.drawWorldInfo(x, y, hex.world);
    }
  }

  private drawWorldInfo(x: number, y: number, world: any): void {
    if (!this.ctx) return;
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Starport
    this.ctx.fillStyle = '#000';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.fillText(world.starportType, x, y - 8);
    
    // UWP line 1
    this.ctx.font = '8px Courier New';
    const uwp1 = `${this.formatHex(world.planetSize.key)}${this.formatHex(world.planetAtmosphere.key)}${this.formatHex(world.planetHydrographics.key)}`;
    this.ctx.fillText(uwp1, x, y + 4);
    
    // UWP line 2
    const uwp2 = `${this.formatHex(world.planetPopulation.key)}${this.formatHex(world.planetGovernment.key)}${this.formatHex(world.planetLawLevel.key)}-${this.formatHex(world.planetTechLevel)}`;
    this.ctx.fillText(uwp2, x, y + 14);
    
    // Bases
    if (world.hasNavalBase || world.hasScoutBase) {
      let baseText = '';
      if (world.hasNavalBase) baseText += 'N';
      if (world.hasScoutBase) baseText += 'S';
      
      this.ctx.font = 'bold 8px Arial';
      this.ctx.fillStyle = world.hasNavalBase ? '#dc3545' : '#28a745';
      this.ctx.fillText(baseText, x, y + 24);
    }
  }

  private drawTradeLanes(): void {
    if (!this.ctx || !this.subsectorData) return;
    
    const processedPairs = new Set<string>();
    
    this.ctx.strokeStyle = '#2196f3';
    this.ctx.lineWidth = 2;
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
              
              const jumpDistance = this.calculateJumpDistance(i, j);
              if (jumpDistance > 1) {
                this.ctx.setLineDash([5, 5]);
              } else {
                this.ctx.setLineDash([]);
              }
              
              this.ctx.beginPath();
              this.ctx.moveTo(pos1.x, pos1.y);
              this.ctx.lineTo(pos2.x, pos2.y);
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
    const col = index % 10;
    const row = Math.floor(index / 10);
    
    const offsetX = 80; // Left margin
    const offsetY = 80; // Top margin
    
    // Correct hex grid calculations for flat-top hexagons
    // For flat-top hexes arranged in rows and columns:
    // - Horizontal spacing: exact distance to avoid overlap
    // - Vertical spacing: exact distance for edge-to-edge contact
    // - Every other row is offset horizontally by half the horizontal spacing
    
    const horizontalSpacing = this.hexWidth + 20; // MUCH larger gap - should be very obvious
    const verticalSpacing = this.hexHeight + 10; // MUCH larger vertical gap too
    
    const x = offsetX + col * horizontalSpacing + (row % 2) * (horizontalSpacing / 2);
    const y = offsetY + row * verticalSpacing;
    
    return { x, y };
  }

  private getHexAtPosition(canvasX: number, canvasY: number): number {
    if (!this.subsectorData) return -1;
    
    // Check each hex to see if the point is inside
    for (let i = 0; i < 80; i++) {
      const pos = this.getCanvasHexPosition(i);
      const distance = Math.sqrt(Math.pow(canvasX - pos.x, 2) + Math.pow(canvasY - pos.y, 2));
      
      if (distance <= this.hexRadius) {
        return i;
      }
    }
    
    return -1;
  }

  getHexColumn(index: number): number {
    return (index % 10) + 1;
  }

  getHexRow(index: number): number {
    return Math.floor(index / 10) + 1;
  }

  private calculateJumpDistance(index1: number, index2: number): number {
    const col1 = index1 % 10;
    const row1 = Math.floor(index1 / 10);
    const col2 = index2 % 10;
    const row2 = Math.floor(index2 / 10);
    
    // Simple distance calculation (could be more sophisticated for hex grids)
    const dx = Math.abs(col2 - col1);
    const dy = Math.abs(row2 - row1);
    return Math.max(dx, dy);
  }

  getHexCoordinates(index: number): string {
    const col = (index % 10) + 1;
    const row = Math.floor(index / 10) + 1;
    return `${col.toString().padStart(2, '0')}${row.toString().padStart(2, '0')}`;
  }

  formatHex(value: number): string {
    // Convert values 10+ to hex digits (A, B, C, etc.) for compact display
    if (value >= 10) {
      return (value - 10 + 10).toString(16).toUpperCase();
    }
    return value.toString();
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
