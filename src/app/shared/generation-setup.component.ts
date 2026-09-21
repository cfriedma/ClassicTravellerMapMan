import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CLASSIC_COLUMNS,
  CLASSIC_ROWS,
  GRID_COLUMNS_MAX,
  GRID_COLUMNS_MIN,
  GRID_ROWS_MAX,
  GRID_ROWS_MIN,
  GenerationOptions,
  HexCellType,
  MAX_CELL_TYPES,
  OFF_MAP_TYPE_ID,
  WORLD_OCCURRENCE_STEPS,
  clampGridColumns,
  clampGridRows,
  cloneGenerationOptions,
  countOnMapHexes,
  createCellType,
  createDefaultGenerationOptions,
  hasOnMapHex,
  occurrenceDisplay,
  occurrenceFromIndex,
  occurrenceIndex,
  resizeHexTypeIds
} from '../models/generation-options';
import {
  hexCanvasPosition,
  hexCanvasSize,
  hexCoordinates,
  hexIndexAtPosition
} from './hex-grid';

@Component({
  selector: 'app-generation-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="splash" role="dialog" aria-modal="true" aria-label="Subsector generation setup">
      <div class="splash-card">
        <header class="splash-header">
          <div>
            <h1>Configure Subsector</h1>
            <p>Paint hex types, set world occurrence, then generate.</p>
          </div>
          <button type="button" class="btn btn-ghost" (click)="cancel()">Cancel</button>
        </header>

        <div class="splash-body">
          <div class="controls">
            <div class="input-group">
              <label for="setupName">Subsector Name (optional)</label>
              <input
                id="setupName"
                type="text"
                [(ngModel)]="name"
                maxlength="50"
                placeholder="Enter a name for your subsector..."
              >
            </div>

            <div class="size-row">
              <label>
                Columns
                <input
                  type="number"
                  [min]="columnsMin"
                  [max]="columnsMax"
                  [ngModel]="options.columns"
                  (ngModelChange)="setColumns($event)"
                >
              </label>
              <label>
                Rows
                <input
                  type="number"
                  [min]="rowsMin"
                  [max]="rowsMax"
                  [ngModel]="options.rows"
                  (ngModelChange)="setRows($event)"
                >
              </label>
            </div>

            <div class="section-head">
              <h2>Cell types</h2>
              <button
                type="button"
                class="btn btn-small"
                (click)="addType()"
                [disabled]="options.cellTypes.length >= maxTypes"
              >Add type</button>
            </div>

            <div
              class="type-card"
              *ngFor="let type of options.cellTypes; trackBy: trackType"
              [class.selected]="selectedBrushId === type.id"
              (click)="selectBrush(type.id)"
            >
              <div class="type-top">
                <input
                  type="color"
                  [ngModel]="type.color"
                  (ngModelChange)="setTypeColor(type, $event)"
                  (click)="$event.stopPropagation()"
                  [attr.aria-label]="'Color for ' + type.name"
                >
                <input
                  type="text"
                  class="type-name"
                  [(ngModel)]="type.name"
                  (click)="$event.stopPropagation()"
                  maxlength="24"
                >
                <button
                  type="button"
                  class="btn btn-small btn-danger"
                  (click)="deleteType(type); $event.stopPropagation()"
                  [disabled]="options.cellTypes.length <= 1"
                >Delete</button>
              </div>
              <label class="slider-block" (click)="$event.stopPropagation()">
                <span>
                  <strong>World occurrence</strong>
                  <small>{{ occurrenceDisplay(type.occurrence) }}</small>
                </span>
                <input
                  type="range"
                  min="0"
                  [max]="occurrenceMax"
                  step="1"
                  [ngModel]="occurrenceIndex(type.occurrence)"
                  (ngModelChange)="setOccurrence(type, $event)"
                >
              </label>
            </div>

            <button
              type="button"
              class="type-card off-map"
              [class.selected]="selectedBrushId === offMapId"
              (click)="selectBrush(offMapId)"
            >
              <strong>Off map</strong>
              <small>Paint hexes to omit them from the generated map. No occurrence roll.</small>
            </button>

            <div class="paint-actions">
              <button type="button" class="btn btn-small" (click)="fillSelected()">Fill with selected</button>
              <button type="button" class="btn btn-small" (click)="resetClassic()">Reset to Classic 8×10</button>
            </div>

            <label class="toggle-row">
              <input type="checkbox" [ngModel]="options.psionicsEnabled" (ngModelChange)="setPsionics($event)">
              <span>
                <strong>Enable psionics</strong>
                <small>Hide institutes, punishments, and psi drugs when off.</small>
              </span>
            </label>

            <label class="toggle-row nested" *ngIf="options.psionicsEnabled">
              <input type="checkbox" [(ngModel)]="options.guaranteePsionicInstitute">
              <span>
                <strong>Guarantee a psionic institute</strong>
                <small>Place an institute on one world if none appear from the usual rolls.</small>
              </span>
            </label>

            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="options.autoRollBalkanization">
              <span>
                <strong>Auto-roll balkanization</strong>
                <small>Show extra states on government 7 worlds. Rolls them at generation.</small>
              </span>
            </label>

            <label class="toggle-row">
              <input type="checkbox" [(ngModel)]="options.generateAllEcosystems">
              <span>
                <strong>Generate all ecosystems</strong>
                <small>Skip UWP biome filtering and build an encounter table for every Book 3 terrain on every world, including those that would otherwise have no animal encounters.</small>
              </span>
            </label>
          </div>

          <div class="preview-pane">
            <div class="preview-meta">
              <span>{{ options.columns }}×{{ options.rows }}</span>
              <span>{{ onMapCount }} on map</span>
              <span>{{ selectedBrushLabel }}</span>
            </div>
            <div class="preview-scroll">
              <canvas
                #previewCanvas
                class="preview-canvas"
                [width]="canvasWidth"
                [height]="canvasHeight"
                (pointerdown)="onPointerDown($event)"
                (pointermove)="onPointerMove($event)"
                (pointerup)="onPointerUp($event)"
                (pointerleave)="onPointerUp($event)"
                (pointercancel)="onPointerUp($event)"
              ></canvas>
            </div>
          </div>
        </div>

        <footer class="splash-footer">
          <p class="hint" *ngIf="!canGenerate">Paint at least one on-map hex to generate.</p>
          <button type="button" class="btn btn-ghost" (click)="cancel()">Cancel</button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="confirm()"
            [disabled]="!canGenerate"
          >
            Generate Subsector
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .splash {
      position: fixed;
      inset: 0;
      z-index: 80;
      background: rgba(12, 16, 32, 0.62);
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 1rem;
      overflow: auto;
    }

    .splash-card {
      width: min(1180px, 100%);
      margin: auto;
      background: var(--bg-card, #fff);
      color: var(--text-primary, #222);
      border-radius: 16px;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 2rem);
    }

    .splash-header,
    .splash-footer {
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .splash-header {
      border-bottom: 1px solid var(--border, #e1e5e9);
      justify-content: space-between;
    }

    .splash-header h1 {
      margin: 0 0 0.25rem;
      font-size: 1.45rem;
    }

    .splash-header p,
    .hint {
      margin: 0;
      color: var(--text-secondary, #666);
      font-size: 0.92rem;
    }

    .splash-body {
      display: grid;
      grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
      gap: 1.25rem;
      padding: 1.25rem 1.5rem;
      min-height: 0;
      overflow: hidden;
    }

    .controls {
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      padding-right: 0.25rem;
      position: relative;
      z-index: 1;
    }

    .input-group label,
    .size-row label,
    .slider-block strong,
    .toggle-row strong {
      display: block;
      font-weight: 700;
      font-size: 0.85rem;
      margin-bottom: 0.35rem;
    }

    .input-group input,
    .size-row input,
    .type-name {
      width: 100%;
      padding: 0.7rem 0.8rem;
      border: 2px solid var(--border, #e1e5e9);
      border-radius: 8px;
      font-size: 0.95rem;
      background: var(--bg-card, #fff);
      color: inherit;
    }

    .size-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-head h2 {
      margin: 0;
      font-size: 1rem;
    }

    .type-card {
      border: 2px solid var(--border, #e1e5e9);
      border-radius: 10px;
      padding: 0.75rem;
      cursor: pointer;
      text-align: left;
      background: var(--bg-muted, #f6f7fb);
    }

    .type-card.selected {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.18);
    }

    .type-top {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.55rem;
    }

    .type-top input[type="color"] {
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
    }

    .off-map small,
    .toggle-row small,
    .slider-block small {
      display: block;
      color: var(--text-secondary, #666);
      font-weight: 400;
      font-size: 0.75rem;
      line-height: 1.35;
    }

    .slider-block,
    .toggle-row {
      display: flex;
      gap: 0.55rem;
      cursor: pointer;
    }

    .toggle-row.nested {
      margin-left: 1.5rem;
    }

    .slider-block {
      flex-direction: column;
    }

    .slider-block span,
    .preview-meta {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      align-items: baseline;
    }

    .paint-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .preview-pane {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .preview-meta {
      font-size: 0.8rem;
      color: var(--text-secondary, #666);
    }

    .preview-scroll {
      overflow: auto;
      background: var(--bg-canvas, #f8f9fb);
      border: 1px solid var(--border, #e1e5e9);
      border-radius: 10px;
      flex: 1;
      min-height: 280px;
      min-width: 0;
    }

    .preview-canvas {
      display: block;
      cursor: crosshair;
      touch-action: none;
      max-width: 100%;
      height: auto;
    }

    .splash-footer {
      border-top: 1px solid var(--border, #e1e5e9);
      justify-content: flex-end;
    }

    .splash-footer .hint {
      margin-right: auto;
    }

    .btn {
      border: none;
      border-radius: 8px;
      padding: 0.7rem 1rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-ghost {
      background: transparent;
      border: 2px solid var(--border, #d5d8e0);
      color: inherit;
    }

    .btn-small {
      padding: 0.4rem 0.7rem;
      font-size: 0.8rem;
      background: #667eea;
      color: white;
    }

    .btn-danger {
      background: #dc3545;
    }

    @media (max-width: 1100px) {
      .splash-body {
        grid-template-columns: 1fr;
        overflow: auto;
      }
    }
  `]
})
export class GenerationSetupComponent implements AfterViewChecked, AfterViewInit, OnChanges {

  @Input() initialName = '';
  @Input() initialOptions: GenerationOptions | null = null;
  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<{ name: string; options: GenerationOptions }>();
  @ViewChild('previewCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly columnsMin = GRID_COLUMNS_MIN;
  readonly columnsMax = GRID_COLUMNS_MAX;
  readonly rowsMin = GRID_ROWS_MIN;
  readonly rowsMax = GRID_ROWS_MAX;
  readonly maxTypes = MAX_CELL_TYPES;
  readonly offMapId = OFF_MAP_TYPE_ID;
  readonly occurrenceMax = WORLD_OCCURRENCE_STEPS.length - 1;
  readonly occurrenceIndex = occurrenceIndex;
  readonly occurrenceDisplay = occurrenceDisplay;

  name = '';
  options = createDefaultGenerationOptions();
  selectedBrushId = this.options.cellTypes[0].id;

  private ctx: CanvasRenderingContext2D | null = null;
  private painting = false;
  private previewScale = 0.55;
  private hexRadius = 18;
  private needsDraw = true;

  get canvasWidth(): number {
    return hexCanvasSize(this.options.columns, this.options.rows, this.hexWidth, this.hexHeight, this.previewScale).width;
  }

  get canvasHeight(): number {
    return hexCanvasSize(this.options.columns, this.options.rows, this.hexWidth, this.hexHeight, this.previewScale).height;
  }

  get hexWidth(): number {
    return this.hexRadius * Math.sqrt(3);
  }

  get hexHeight(): number {
    return this.hexRadius * 2;
  }

  get canGenerate(): boolean {
    return hasOnMapHex(this.options);
  }

  get onMapCount(): number {
    return countOnMapHexes(this.options);
  }

  get selectedBrushLabel(): string {
    if (this.selectedBrushId === OFF_MAP_TYPE_ID) {
      return 'Brush: Off map';
    }
    const type = this.options.cellTypes.find(item => item.id === this.selectedBrushId);
    return `Brush: ${type?.name || 'Type'}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialName'] && this.initialName != null) {
      this.name = this.initialName;
    }
    if (changes['initialOptions']) {
      this.options = cloneGenerationOptions(this.initialOptions ?? createDefaultGenerationOptions());
      this.selectedBrushId = this.options.cellTypes[0]?.id ?? OFF_MAP_TYPE_ID;
      this.scheduleDraw();
    }
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef?.nativeElement.getContext('2d') ?? null;
    this.scheduleDraw();
  }

  ngAfterViewChecked(): void {
    if (!this.needsDraw) {
      return;
    }
    this.needsDraw = false;
    this.drawPreview();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel();
  }

  trackType(_index: number, type: HexCellType): string {
    return type.id;
  }

  cancel(): void {
    this.cancelled.emit();
  }

  confirm(): void {
    if (!this.canGenerate) {
      return;
    }
    this.confirmed.emit({
      name: this.name,
      options: cloneGenerationOptions(this.options)
    });
  }

  selectBrush(id: string): void {
    this.selectedBrushId = id;
    this.scheduleDraw();
  }

  setColumns(value: number): void {
    this.resizeGrid(clampGridColumns(value), this.options.rows);
  }

  setRows(value: number): void {
    this.resizeGrid(this.options.columns, clampGridRows(value));
  }

  addType(): void {
    if (this.options.cellTypes.length >= MAX_CELL_TYPES) {
      return;
    }
    const type = createCellType(this.options.cellTypes);
    this.options.cellTypes.push(type);
    this.selectedBrushId = type.id;
    this.scheduleDraw();
  }

  deleteType(type: HexCellType): void {
    if (this.options.cellTypes.length <= 1) {
      return;
    }
    this.options.cellTypes = this.options.cellTypes.filter(item => item.id !== type.id);
    const replacement = this.options.cellTypes[0].id;
    this.options.hexTypeIds = this.options.hexTypeIds.map(id => id === type.id ? replacement : id);
    if (this.selectedBrushId === type.id) {
      this.selectedBrushId = replacement;
    }
    this.scheduleDraw();
  }

  setTypeColor(type: HexCellType, color: string): void {
    type.color = color;
    this.scheduleDraw();
  }

  setOccurrence(type: HexCellType, index: number): void {
    type.occurrence = occurrenceFromIndex(index);
  }

  fillSelected(): void {
    this.options.hexTypeIds = this.options.hexTypeIds.map(() => this.selectedBrushId);
    this.scheduleDraw();
  }

  resetClassic(): void {
    const psionicsEnabled = this.options.psionicsEnabled;
    const guaranteePsionicInstitute = this.options.guaranteePsionicInstitute;
    const autoRollBalkanization = this.options.autoRollBalkanization;
    const generateAllEcosystems = this.options.generateAllEcosystems;
    this.options = createDefaultGenerationOptions();
    this.options.columns = CLASSIC_COLUMNS;
    this.options.rows = CLASSIC_ROWS;
    this.options.psionicsEnabled = psionicsEnabled;
    this.options.guaranteePsionicInstitute = psionicsEnabled && guaranteePsionicInstitute;
    this.options.autoRollBalkanization = autoRollBalkanization;
    this.options.generateAllEcosystems = generateAllEcosystems;
    this.selectedBrushId = this.options.cellTypes[0].id;
    this.scheduleDraw();
  }

  setPsionics(value: boolean): void {
    this.options.psionicsEnabled = value;
    if (!value) {
      this.options.guaranteePsionicInstitute = false;
    }
  }

  onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.canvasRef?.nativeElement.setPointerCapture(event.pointerId);
    this.painting = true;
    this.paintAtEvent(event);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.painting) {
      return;
    }
    this.paintAtEvent(event);
  }

  onPointerUp(event: PointerEvent): void {
    if (this.canvasRef?.nativeElement.hasPointerCapture(event.pointerId)) {
      this.canvasRef.nativeElement.releasePointerCapture(event.pointerId);
    }
    this.painting = false;
  }

  private fillIdForResize(): string {
    if (this.selectedBrushId === OFF_MAP_TYPE_ID) {
      return this.options.cellTypes[0].id;
    }
    return this.selectedBrushId;
  }

  private resizeGrid(columns: number, rows: number): void {
    if (columns === this.options.columns && rows === this.options.rows) {
      return;
    }
    this.options.hexTypeIds = resizeHexTypeIds(
      this.options.hexTypeIds,
      this.options.columns,
      this.options.rows,
      columns,
      rows,
      this.fillIdForResize()
    );
    this.options.columns = columns;
    this.options.rows = rows;
    this.scheduleDraw();
  }

  private paintAtEvent(event: PointerEvent): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const index = hexIndexAtPosition(
      x,
      y,
      this.options.hexTypeIds.length,
      this.options.columns,
      this.hexWidth,
      this.hexHeight,
      this.hexRadius,
      this.previewScale
    );
    if (index === -1) {
      return;
    }
    if (this.options.hexTypeIds[index] !== this.selectedBrushId) {
      this.options.hexTypeIds[index] = this.selectedBrushId;
      this.scheduleDraw();
    }
  }

  private scheduleDraw(): void {
    this.needsDraw = true;
  }

  private drawPreview(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      return;
    }

    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < this.options.hexTypeIds.length; i++) {
      const typeId = this.options.hexTypeIds[i];
      const pos = hexCanvasPosition(i, this.options.columns, this.hexWidth, this.hexHeight, this.previewScale);
      const isOffMap = typeId === OFF_MAP_TYPE_ID;
      const type = this.options.cellTypes.find(item => item.id === typeId);
      this.drawHex(
        pos.x,
        pos.y,
        isOffMap ? '#d9dce3' : (type?.color ?? '#667eea'),
        isOffMap,
        typeId === this.selectedBrushId,
        hexCoordinates(i, this.options.columns)
      );
    }
  }

  private drawHex(
    x: number,
    y: number,
    color: string,
    isOffMap: boolean,
    isSelectedType: boolean,
    label: string
  ): void {
    if (!this.ctx) {
      return;
    }
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
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
    this.ctx.globalAlpha = isOffMap ? 0.28 : 0.92;
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = isSelectedType ? '#222' : (isOffMap ? '#9aa0ab' : '#ffffff');
    this.ctx.lineWidth = isSelectedType ? 2.5 : 1;
    if (isOffMap) {
      this.ctx.setLineDash([4, 3]);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.fillStyle = isOffMap ? '#777' : '#111';
    this.ctx.font = `${Math.max(8, Math.round(9 * this.previewScale / 0.55))}px Courier New`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x, y);
  }
}
