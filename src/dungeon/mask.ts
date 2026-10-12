// A grid of on/off cells: the floor of one room, in its own frame with
// (0, 0) at the top-left. Every stage after shapes works with these.

export type Cell = { x: number; y: number };

export type Mask = {
  width: number;
  height: number;
  // 1 where there's floor, row by row.
  cells: Uint8Array;
};

export function createMask(width: number, height: number): Mask {
  return { width, height, cells: new Uint8Array(width * height) };
}

// Off outside the mask.
export function isOn(mask: Mask, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
  return mask.cells[y * mask.width + x] === 1;
}

export function setOn(mask: Mask, x: number, y: number, on = true): void {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return;
  mask.cells[y * mask.width + x] = on ? 1 : 0;
}

// Every cell that's on, row by row.
export function onCells(mask: Mask): Cell[] {
  const cells: Cell[] = [];
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (isOn(mask, x, y)) cells.push({ x, y });
    }
  }
  return cells;
}

export const NEIGHBORS_4: readonly Cell[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export const NEIGHBORS_8: readonly Cell[] = [
  ...NEIGHBORS_4,
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

// The cells reachable from `from` through cells `open` says can be walked,
// moving in four directions. `from` itself counts only if it's open.
export function flood(
  from: Cell,
  open: (x: number, y: number) => boolean,
): Cell[] {
  if (!open(from.x, from.y)) return [];
  const seen = new Set([key(from)]);
  const reached = [from];
  for (let i = 0; i < reached.length; i++) {
    const cell = reached[i];
    for (const step of NEIGHBORS_4) {
      const next = { x: cell.x + step.x, y: cell.y + step.y };
      if (seen.has(key(next)) || !open(next.x, next.y)) continue;
      seen.add(key(next));
      reached.push(next);
    }
  }
  return reached;
}

// A string key for using cells in sets and maps.
export function key({ x, y }: Cell): string {
  return `${x},${y}`;
}

// Just the largest group of connected cells, cropped to fit them, or null
// when nothing is on.
export function largestRegion(mask: Mask): Mask | null {
  const seen = new Set<string>();
  let best: Cell[] = [];
  for (const cell of onCells(mask)) {
    if (seen.has(key(cell))) continue;
    const region = flood(cell, (x, y) => isOn(mask, x, y));
    for (const c of region) seen.add(key(c));
    if (region.length > best.length) best = region;
  }
  return best.length ? fromCells(best) : null;
}

// A mask just big enough for `cells`, shifted so the nearest touch its top
// and left edges.
export function fromCells(cells: readonly Cell[]): Mask {
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const maxX = Math.max(...cells.map((c) => c.x));
  const maxY = Math.max(...cells.map((c) => c.y));
  const mask = createMask(maxX - minX + 1, maxY - minY + 1);
  for (const { x, y } of cells) setOn(mask, x - minX, y - minY);
  return mask;
}

// Draws a mask as text, `on` for floor and `off` for the rest. For tests and
// failure messages.
export function maskAscii(mask: Mask, on = ".", off = " "): string[] {
  return Array.from({ length: mask.height }, (_, y) =>
    Array.from({ length: mask.width }, (_, x) =>
      isOn(mask, x, y) ? on : off,
    ).join(""),
  );
}

// The reverse of maskAscii: any character but a space is floor.
export function maskFromAscii(rows: readonly string[]): Mask {
  const mask = createMask(rows[0]?.length ?? 0, rows.length);
  rows.forEach((row, y) =>
    [...row].forEach((char, x) => setOn(mask, x, y, char !== " ")),
  );
  return mask;
}
