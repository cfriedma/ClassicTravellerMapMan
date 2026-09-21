export const OFF_MAP_TYPE_ID = 'off-map';
export const STANDARD_CELL_TYPE_ID = 'standard';

export const CLASSIC_COLUMNS = 8;
export const CLASSIC_ROWS = 10;
export const LEGACY_COLUMNS = 10;
export const LEGACY_ROWS = 8;

export const GRID_COLUMNS_MIN = 1;
export const GRID_COLUMNS_MAX = 16;
export const GRID_ROWS_MIN = 1;
export const GRID_ROWS_MAX = 20;

export const MAX_CELL_TYPES = 12;

export type WorldOccurrence = 'always' | 1 | 2 | 3 | 4 | 5 | 6 | 'never';

export const WORLD_OCCURRENCE_STEPS: WorldOccurrence[] = [
  'always',
  1,
  2,
  3,
  4,
  5,
  6,
  'never'
];

export const CELL_TYPE_COLORS = [
  '#667eea',
  '#e07a5f',
  '#81b29a',
  '#f2cc8f',
  '#3d5a80',
  '#ee6c4d',
  '#9b5de5',
  '#00bbf9',
  '#c1121f',
  '#2a9d8f',
  '#e9c46a',
  '#6d597a'
];

export interface HexCellType {
  id: string;
  name: string;
  color: string;
  occurrence: WorldOccurrence;
}

export interface GenerationOptions {
  columns: number;
  rows: number;
  cellTypes: HexCellType[];
  hexTypeIds: string[];
  psionicsEnabled: boolean;
  autoRollBalkanization: boolean;
}

export function createDefaultGenerationOptions(): GenerationOptions {
  const standard = createStandardCellType();
  const columns = CLASSIC_COLUMNS;
  const rows = CLASSIC_ROWS;
  return {
    columns,
    rows,
    cellTypes: [standard],
    hexTypeIds: Array(columns * rows).fill(standard.id),
    psionicsEnabled: true,
    autoRollBalkanization: false
  };
}

export function createStandardCellType(): HexCellType {
  return {
    id: STANDARD_CELL_TYPE_ID,
    name: 'Standard',
    color: CELL_TYPE_COLORS[0],
    occurrence: 4
  };
}

export function cloneGenerationOptions(options: GenerationOptions): GenerationOptions {
  return {
    columns: options.columns,
    rows: options.rows,
    cellTypes: options.cellTypes.map(type => ({ ...type })),
    hexTypeIds: [...options.hexTypeIds],
    psionicsEnabled: options.psionicsEnabled,
    autoRollBalkanization: options.autoRollBalkanization
  };
}

export function newCellTypeId(): string {
  return `t-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function createCellType(existing: HexCellType[], name = 'New type'): HexCellType {
  const used = new Set(existing.map(type => type.color.toLowerCase()));
  const color = CELL_TYPE_COLORS.find(candidate => !used.has(candidate.toLowerCase()))
    ?? CELL_TYPE_COLORS[existing.length % CELL_TYPE_COLORS.length];
  return {
    id: newCellTypeId(),
    name,
    color,
    occurrence: 4
  };
}

export function occurrenceIndex(value: WorldOccurrence): number {
  const index = WORLD_OCCURRENCE_STEPS.indexOf(value);
  return index >= 0 ? index : WORLD_OCCURRENCE_STEPS.indexOf(4);
}

export function occurrenceFromIndex(index: number): WorldOccurrence {
  const clamped = Math.min(WORLD_OCCURRENCE_STEPS.length - 1, Math.max(0, Math.round(Number(index) || 0)));
  return WORLD_OCCURRENCE_STEPS[clamped];
}

export function occurrenceLabel(value: WorldOccurrence): string {
  if (value === 'always') {
    return 'Guaranteed world';
  }
  if (value === 'never') {
    return 'Guaranteed empty';
  }
  return `${value}+`;
}

export function occurrenceChancePercent(value: WorldOccurrence): number {
  if (value === 'always') {
    return 100;
  }
  if (value === 'never') {
    return 0;
  }
  return Math.round(((7 - value) / 6) * 100);
}

export function occurrenceDisplay(value: WorldOccurrence): string {
  if (value === 'always' || value === 'never') {
    return `${occurrenceLabel(value)} (${occurrenceChancePercent(value)}%)`;
  }
  return `${occurrenceLabel(value)} (~${occurrenceChancePercent(value)}%)`;
}

export function parseOccurrence(value: unknown): WorldOccurrence {
  if (value === 'always' || value === 'never') {
    return value;
  }
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    return value;
  }
  if (typeof value === 'string' && /^[1-6]$/.test(value)) {
    return Number(value) as 1 | 2 | 3 | 4 | 5 | 6;
  }
  return 4;
}

export function clampGridColumns(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) {
    return CLASSIC_COLUMNS;
  }
  return Math.min(GRID_COLUMNS_MAX, Math.max(GRID_COLUMNS_MIN, n));
}

export function clampGridRows(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) {
    return CLASSIC_ROWS;
  }
  return Math.min(GRID_ROWS_MAX, Math.max(GRID_ROWS_MIN, n));
}

export function resizeHexTypeIds(
  oldIds: string[],
  oldColumns: number,
  oldRows: number,
  newColumns: number,
  newRows: number,
  fillTypeId: string
): string[] {
  const next = Array(newColumns * newRows).fill(fillTypeId);
  const copyColumns = Math.min(oldColumns, newColumns);
  const copyRows = Math.min(oldRows, newRows);
  for (let row = 0; row < copyRows; row++) {
    for (let col = 0; col < copyColumns; col++) {
      const oldIndex = row * oldColumns + col;
      const newIndex = row * newColumns + col;
      if (oldIndex < oldIds.length) {
        next[newIndex] = oldIds[oldIndex];
      }
    }
  }
  return next;
}

export function hasOnMapHex(options: GenerationOptions): boolean {
  return options.hexTypeIds.some(id => id !== OFF_MAP_TYPE_ID);
}

export function countOnMapHexes(options: GenerationOptions): number {
  return options.hexTypeIds.filter(id => id !== OFF_MAP_TYPE_ID).length;
}

export function typeById(options: GenerationOptions, typeId: string): HexCellType | undefined {
  return options.cellTypes.find(type => type.id === typeId);
}

export function occurrenceForHex(options: GenerationOptions, index: number): WorldOccurrence | typeof OFF_MAP_TYPE_ID {
  const typeId = options.hexTypeIds[index];
  if (!typeId || typeId === OFF_MAP_TYPE_ID) {
    return OFF_MAP_TYPE_ID;
  }
  return typeById(options, typeId)?.occurrence ?? 4;
}

export function normalizeGenerationOptions(raw: Partial<GenerationOptions> | null | undefined): GenerationOptions {
  const fallback = createDefaultGenerationOptions();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const columns = clampGridColumns(raw.columns ?? fallback.columns);
  const rows = clampGridRows(raw.rows ?? fallback.rows);
  const cellTypes = normalizeCellTypes(raw.cellTypes);
  const knownIds = new Set(cellTypes.map(type => type.id));
  knownIds.add(OFF_MAP_TYPE_ID);
  const fillId = cellTypes[0].id;

  let hexTypeIds: string[];
  if (Array.isArray(raw.hexTypeIds) && raw.hexTypeIds.length === columns * rows) {
    hexTypeIds = raw.hexTypeIds.map(id => {
      const value = String(id ?? fillId);
      return knownIds.has(value) ? value : fillId;
    });
  } else if (Array.isArray(raw.hexTypeIds) && raw.hexTypeIds.length > 0) {
    const oldLength = raw.hexTypeIds.length;
    const oldColumns = Number.isInteger(raw.columns) ? clampGridColumns(raw.columns) : columns;
    const oldRows = oldColumns > 0 ? Math.max(1, Math.round(oldLength / oldColumns)) : rows;
    hexTypeIds = resizeHexTypeIds(
      raw.hexTypeIds.map(id => {
        const value = String(id ?? fillId);
        return knownIds.has(value) ? value : fillId;
      }),
      oldColumns,
      oldRows,
      columns,
      rows,
      fillId
    );
  } else {
    hexTypeIds = Array(columns * rows).fill(fillId);
  }

  return {
    columns,
    rows,
    cellTypes,
    hexTypeIds,
    psionicsEnabled: raw.psionicsEnabled !== false,
    autoRollBalkanization: raw.autoRollBalkanization === true
  };
}

function normalizeCellTypes(raw: unknown): HexCellType[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [createStandardCellType()];
  }

  const seen = new Set<string>();
  const types: HexCellType[] = [];
  for (const entry of raw.slice(0, MAX_CELL_TYPES)) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const item = entry as Partial<HexCellType>;
    let id = typeof item.id === 'string' && item.id && item.id !== OFF_MAP_TYPE_ID
      ? item.id
      : newCellTypeId();
    if (seen.has(id)) {
      id = newCellTypeId();
    }
    seen.add(id);
    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Type';
    const color = typeof item.color === 'string' && /^#?[0-9a-fA-F]{6}$/.test(item.color)
      ? (item.color.startsWith('#') ? item.color : `#${item.color}`)
      : CELL_TYPE_COLORS[types.length % CELL_TYPE_COLORS.length];
    types.push({
      id,
      name,
      color,
      occurrence: parseOccurrence(item.occurrence)
    });
  }

  return types.length > 0 ? types : [createStandardCellType()];
}
