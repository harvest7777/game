import type { Vec2 } from "./shared/physics/math";

// Grid of 1x1 tiles. Tile (x, y) covers [x, x + 1) x [y, y + 1), so its center
// is (x + 0.5, y + 0.5). Anything outside the grid counts as a wall so nothing
// can leave the map.
export type Tiles = {
  width: number;
  height: number;
  walls: Uint8Array;
};

export function createTiles(width: number, height: number): Tiles {
  return { width, height, walls: new Uint8Array(width * height) };
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
