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
