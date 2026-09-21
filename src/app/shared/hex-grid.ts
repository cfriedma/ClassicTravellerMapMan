export function hexIndex(col: number, row: number, columns: number): number {
  return row * columns + col;
}

export function hexColumn(index: number, columns: number): number {
  return index % columns;
}

export function hexRow(index: number, columns: number): number {
  return Math.floor(index / columns);
}

export function hexCoordinates(index: number, columns: number): string {
  const col = hexColumn(index, columns) + 1;
  const row = hexRow(index, columns) + 1;
  return `${col.toString().padStart(2, '0')}${row.toString().padStart(2, '0')}`;
}

export function hexCanvasPosition(
  index: number,
  columns: number,
  hexWidth: number,
  hexHeight: number,
  scale = 1
): { x: number; y: number } {
  const col = hexColumn(index, columns);
  const row = hexRow(index, columns);
  const offsetX = 80 * scale;
  const offsetY = 80 * scale;
  const horizontalSpacing = hexWidth + 15 * scale;
  const verticalSpacing = hexHeight * 0.9;
  return {
    x: offsetX + col * horizontalSpacing + (row % 2) * (horizontalSpacing / 2),
    y: offsetY + row * verticalSpacing
  };
}

export function hexCanvasSize(
  columns: number,
  rows: number,
  hexWidth: number,
  hexHeight: number,
  scale = 1
): { width: number; height: number } {
  const offsetX = 80 * scale;
  const offsetY = 80 * scale;
  const horizontalSpacing = hexWidth + 15 * scale;
  const verticalSpacing = hexHeight * 0.9;
  return {
    width: Math.ceil(offsetX * 2 + Math.max(0, columns - 1) * horizontalSpacing + hexWidth + horizontalSpacing / 2),
    height: Math.ceil(offsetY * 2 + Math.max(0, rows - 1) * verticalSpacing + hexHeight)
  };
}

export function hexIndexAtPosition(
  x: number,
  y: number,
  count: number,
  columns: number,
  hexWidth: number,
  hexHeight: number,
  hexRadius: number,
  scale = 1,
  includeIndex?: (index: number) => boolean
): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < count; i++) {
    if (includeIndex && !includeIndex(i)) {
      continue;
    }
    const pos = hexCanvasPosition(i, columns, hexWidth, hexHeight, scale);
    const distance = Math.hypot(x - pos.x, y - pos.y);
    if (distance <= hexRadius && distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}
