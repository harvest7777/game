import type { Vec2 } from "./shared/physics/math";

// Grid of 1x1 tiles. Tile (x, y) covers [x, x + 1) x [y, y + 1), so its center
// is (x + 0.5, y + 0.5). Anything outside the grid counts as a wall so nothing
// can leave the map.
//
// `ground` holds each tile's ground type id, which only decides how the tile
// looks; what the ids mean is up to the renderer. 0 is the default ground.
export type Tiles = {
  width: number;
  height: number;
  walls: Uint8Array;
  ground: Uint16Array;
};

export type GroundType = number;

export function createTiles(width: number, height: number): Tiles {
  return {
    width,
    height,
    walls: new Uint8Array(width * height),
    ground: new Uint16Array(width * height),
  };
}

function inBounds(tiles: Tiles, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < tiles.width && y < tiles.height;
}

export function setWall(tiles: Tiles, x: number, y: number, wall = true) {
  if (!inBounds(tiles, x, y)) return;
  tiles.walls[y * tiles.width + x] = wall ? 1 : 0;
}

export function isWall(tiles: Tiles, x: number, y: number): boolean {
  if (!inBounds(tiles, x, y)) return true;
  return tiles.walls[y * tiles.width + x] === 1;
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
