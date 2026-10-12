import { groundAt, isWall, type Tiles } from "../ecs/tiles";
import { regionOf, type Art } from "./art";
import type { PackedRect } from "./atlas";
import type { QuadBuffer } from "./quads";
import { visibleWorldRect, worldToScreen, type Rect, type View } from "./view";

// How tall walls are drawn, in tiles. Walls are cubes: the top face is the
// tile raised this far up the screen, and side faces join it to the ground.
export const WALL_HEIGHT = 1;

// Ground tiles inside the map that are on screen. Tiles outside the map
// aren't drawn (they still block movement). Ground rotates with the camera.
export function pushGround(
  out: QuadBuffer,
  tiles: Tiles,
  view: View,
  art: Art,
): void {
  const { minX, minY, maxX, maxY } = clampToMap(visibleWorldRect(view), tiles);
  const basis = screenBasis(view);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const file = art.manifest.ground[groundAt(tiles, x, y)];
      if (file === undefined) {
        throw new Error(`no art for ground type ${groundAt(tiles, x, y)}`);
      }
      pushTile(out, basis, x, y, 0, regionOf(art, file));
    }
  }
}

// Raised walls on screen, drawn back to front (top of the screen first) so
// nearer walls cover farther ones. Each wall draws its visible side faces,
// then its top. A side face shows only if it faces the viewer after rotation
// and isn't against another wall.
export function pushWalls(
  out: QuadBuffer,
  tiles: Tiles,
  view: View,
  art: Art,
): void {
  // A wall just off screen can still reach into view once raised.
  const visible = visibleWorldRect(view);
  const { minX, minY, maxX, maxY } = clampToMap(
    {
      minX: visible.minX - WALL_HEIGHT,
      minY: visible.minY - WALL_HEIGHT,
      maxX: visible.maxX + WALL_HEIGHT,
      maxY: visible.maxY + WALL_HEIGHT,
    },
    tiles,
  );

  const walls: { x: number; y: number; depth: number }[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!isWall(tiles, x, y)) continue;
      const depth = worldToScreen(view, { x: x + 0.5, y: y + 0.5 }).y;
      walls.push({ x, y, depth });
    }
  }
  walls.sort((a, b) => a.depth - b.depth);

  const basis = screenBasis(view);
  const lift = WALL_HEIGHT * view.pixelsPerTile;
  const side = regionOf(art, art.manifest.walls.side);
  const top = regionOf(art, art.manifest.walls.top);

  for (const { x, y } of walls) {
    for (const edge of EDGES) {
      if (isWall(tiles, x + edge.normal.x, y + edge.normal.y)) continue;
      // Screen-space y of the edge's outward normal: positive means it points
      // down the screen, toward the viewer.
      const facing = -edge.normal.x * basis.sin + edge.normal.y * basis.cos;
      if (facing <= 1e-9) continue;

      const a = basis.at(x + edge.from.x, y + edge.from.y);
      const b = basis.at(x + edge.to.x, y + edge.to.y);
      const [left, right] = a.x <= b.x ? [a, b] : [b, a];
      out.push(
        left.x,
        left.y - lift,
        right.x,
        right.y - lift,
        right.x,
        right.y,
        left.x,
        left.y,
        side,
      );
    }
    pushTile(out, basis, x, y, lift, top);
  }
}

// Each tile edge: the neighbour across it (as the outward normal) and its two
// endpoints relative to the tile's top-left corner.
const EDGES = [
  { normal: { x: 0, y: -1 }, from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
  { normal: { x: 1, y: 0 }, from: { x: 1, y: 0 }, to: { x: 1, y: 1 } },
  { normal: { x: 0, y: 1 }, from: { x: 1, y: 1 }, to: { x: 0, y: 1 } },
  { normal: { x: -1, y: 0 }, from: { x: 0, y: 1 }, to: { x: 0, y: 0 } },
];

type Basis = {
  sin: number;
  cos: number;
  at(x: number, y: number): { x: number; y: number };
  originX: number;
  originY: number;
  ex: { x: number; y: number };
  ey: { x: number; y: number };
};

// Screen position of world (0, 0) plus the screen step for one tile along
// world x and y, so tile corners need no per-tile trig or allocation.
function screenBasis(view: View): Basis {
  const origin = worldToScreen(view, { x: 0, y: 0 });
  const alongX = worldToScreen(view, { x: 1, y: 0 });
  const alongY = worldToScreen(view, { x: 0, y: 1 });
  const ex = { x: alongX.x - origin.x, y: alongX.y - origin.y };
  const ey = { x: alongY.x - origin.x, y: alongY.y - origin.y };
  return {
    sin: Math.sin(view.angle),
    cos: Math.cos(view.angle),
    originX: origin.x,
    originY: origin.y,
    ex,
    ey,
    at: (x, y) => ({
      x: origin.x + x * ex.x + y * ey.x,
      y: origin.y + x * ex.y + y * ey.y,
    }),
  };
}

// The tile's square on screen, raised `lift` pixels, texture top-left at the
// tile's world top-left corner.
function pushTile(
  out: QuadBuffer,
  b: Basis,
  x: number,
  y: number,
  lift: number,
  region: PackedRect,
): void {
  const x0 = b.originX + x * b.ex.x + y * b.ey.x;
  const y0 = b.originY + x * b.ex.y + y * b.ey.y - lift;
  out.push(
    x0,
    y0,
    x0 + b.ex.x,
    y0 + b.ex.y,
    x0 + b.ex.x + b.ey.x,
    y0 + b.ex.y + b.ey.y,
    x0 + b.ey.x,
    y0 + b.ey.y,
    region,
  );
}

function clampToMap(rect: Rect, tiles: Tiles): Rect {
  return {
    minX: Math.max(0, Math.floor(rect.minX)),
    minY: Math.max(0, Math.floor(rect.minY)),
    maxX: Math.min(tiles.width - 1, Math.floor(rect.maxX)),
    maxY: Math.min(tiles.height - 1, Math.floor(rect.maxY)),
  };
}
