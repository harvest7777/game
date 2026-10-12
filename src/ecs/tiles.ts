import type { Vec2 } from "./shared/physics/math";
import type { SpriteFile } from "./sprite/art";

// What a kind of ground is: how it looks, how fast things walk on it, and
// whether it hurts to stand on.
export type GroundDef = {
  art: SpriteFile;
  // Multiplies walking speed on it. Defaults to 1.
  speedScale?: number;
  hazard?: Hazard;
};

// Ground that burns characters standing on it: `damage` every `every`
// seconds, ignoring defense, counting from when they step on.
export type Hazard = { damage: number; every: number };

// How a kind of wall looks: its raised top and its sides.
export type WallDef = { top: SpriteFile; side: SpriteFile };

// Grid of 1x1 tiles. Tile (x, y) covers [x, x + 1) x [y, y + 1), so its center
// is (x + 0.5, y + 0.5). Anything outside the grid counts as a wall so nothing
// can leave the map.
//
// `ground` holds each tile's ground type, an index into `grounds`. 0 is the
// default ground.
//
// `walls` says what blocks each tile: 0 nothing, VOID for empty darkness
// (blocking, but drawn flat and black, not raised), and anything else a
// raised wall drawn as `wallDefs[value - 1]`, or the renderer's default
// wall where that's undefined.
export type Tiles = {
  width: number;
  height: number;
  walls: Uint8Array;
  ground: Uint16Array;
  grounds: GroundDef[];
  wallDefs: (WallDef | undefined)[];
};

// The `walls` value of a void tile.
export const VOID = 255;

export type GroundType = number;

export function createTiles(
  width: number,
  height: number,
  grounds: GroundDef[] = [],
  wallDefs: (WallDef | undefined)[] = [],
): Tiles {
  return {
    width,
    height,
    walls: new Uint8Array(width * height),
    ground: new Uint16Array(width * height),
    grounds,
    wallDefs,
  };
}

function inBounds(tiles: Tiles, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < tiles.width && y < tiles.height;
}

// Raises a wall drawn as `wallDefs[style]`, or clears one with `wall`
// false.
export function setWall(
  tiles: Tiles,
  x: number,
  y: number,
  wall = true,
  style = 0,
) {
  if (!inBounds(tiles, x, y)) return;
  tiles.walls[y * tiles.width + x] = wall ? style + 1 : 0;
}

export function setVoid(tiles: Tiles, x: number, y: number) {
  if (!inBounds(tiles, x, y)) return;
  tiles.walls[y * tiles.width + x] = VOID;
}

// Whether nothing can walk there: a wall, void, or off the map.
export function isWall(tiles: Tiles, x: number, y: number): boolean {
  if (!inBounds(tiles, x, y)) return true;
  return tiles.walls[y * tiles.width + x] !== 0;
}

export function isVoid(tiles: Tiles, x: number, y: number): boolean {
  if (!inBounds(tiles, x, y)) return false;
  return tiles.walls[y * tiles.width + x] === VOID;
}

// The style of the raised wall on a tile in the map, or -1 if there isn't
// one.
export function wallStyleAt(tiles: Tiles, x: number, y: number): number {
  if (!inBounds(tiles, x, y)) return -1;
  const value = tiles.walls[y * tiles.width + x];
  return value === 0 || value === VOID ? -1 : value - 1;
}

export function setGround(
  tiles: Tiles,
  x: number,
  y: number,
  type: GroundType,
): void {
  if (!inBounds(tiles, x, y)) return;
  tiles.ground[y * tiles.width + x] = type;
}

// Ground type at a tile; outside the map is the default ground.
export function groundAt(tiles: Tiles, x: number, y: number): GroundType {
  if (!inBounds(tiles, x, y)) return 0;
  return tiles.ground[y * tiles.width + x];
}

// The ground under a point, if its type is defined.
export function groundUnder(tiles: Tiles, at: Vec2): GroundDef | undefined {
  return tiles.grounds[groundAt(tiles, Math.floor(at.x), Math.floor(at.y))];
}

// How much the ground under a point scales walking speed: 1 unless the
// ground says otherwise.
export function groundSpeedScale(tiles: Tiles, at: Vec2): number {
  return groundUnder(tiles, at)?.speedScale ?? 1;
}

// Tile coordinates of every wall whose square overlaps the given box.
export function* wallsInBox(
  tiles: Tiles,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Generator<Vec2> {
  for (let y = Math.floor(minY); y <= Math.floor(maxY); y++) {
    for (let x = Math.floor(minX); x <= Math.floor(maxX); x++) {
      if (isWall(tiles, x, y)) yield { x, y };
    }
  }
}

// Whether nothing blocks the straight line from `a` to `b`: no wall or void
// on any tile it passes through, walking tile to tile along it. A line
// through the exact corner between two diagonal walls slips past.
export function clearLine(tiles: Tiles, a: Vec2, b: Vec2): boolean {
  let x = Math.floor(a.x);
  let y = Math.floor(a.y);
  const endX = Math.floor(b.x);
  const endY = Math.floor(b.y);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  // How far along the line (0 to 1) each tile step takes, and where the
  // next one in each direction is.
  const deltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const deltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  let nextX =
    dx === 0 ? Infinity : (stepX > 0 ? x + 1 - a.x : a.x - x) * deltaX;
  let nextY =
    dy === 0 ? Infinity : (stepY > 0 ? y + 1 - a.y : a.y - y) * deltaY;
  const steps = Math.abs(endX - x) + Math.abs(endY - y);
  for (let i = 0; i < steps; i++) {
    if (nextX < nextY) {
      x += stepX;
      nextX += deltaX;
    } else {
      y += stepY;
      nextY += deltaY;
    }
    if (isWall(tiles, x, y)) return false;
  }
  return true;
}

// Whether something can stand on the tile under `at` without getting hurt.
export function isSafeGround(tiles: Tiles, at: Vec2): boolean {
  const x = Math.floor(at.x);
  const y = Math.floor(at.y);
  return !isWall(tiles, x, y) && !groundUnder(tiles, at)?.hazard;
}

// `at` if it's safe ground, otherwise the middle of the nearest safe tile
// within `reach` tiles that a straight line from `at` reaches, or `at` if
// there's none.
export function nearestSafeSpot(tiles: Tiles, at: Vec2, reach = 6): Vec2 {
  if (isSafeGround(tiles, at)) return { x: at.x, y: at.y };
  let best: Vec2 | undefined;
  let bestDistance = Infinity;
  const cx = Math.floor(at.x);
  const cy = Math.floor(at.y);
  for (let y = cy - reach; y <= cy + reach; y++) {
    for (let x = cx - reach; x <= cx + reach; x++) {
      const spot = { x: x + 0.5, y: y + 0.5 };
      const distance = Math.hypot(spot.x - at.x, spot.y - at.y);
      if (distance > reach || distance >= bestDistance) continue;
      if (!isSafeGround(tiles, spot) || !clearLine(tiles, at, spot)) continue;
      best = spot;
      bestDistance = distance;
    }
  }
  return best ?? { x: at.x, y: at.y };
}
