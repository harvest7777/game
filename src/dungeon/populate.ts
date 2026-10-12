import { isSafe, kindAt, type DungeonMap, type DungeonRoom } from "./grid";
import { key, type Cell } from "./mask";
import { int, shuffled, weighted, type Range, type Rng } from "./rng";

// Stage 7: who starts in each room, and where. Enemies are only ids here;
// what an id means is up to whoever turns the dungeon into a level. A spawn
// group rolls its picks, then its placement finds a spot for each. Adding a
// way to place spawns is one entry in PLACEMENTS.

export type SpawnPlacement =
  // Anywhere on safe floor away from entrances, `spacing` tiles apart (2 if
  // unset).
  | { kind: "scatter"; spacing?: number }
  // As near the middle of the room as they fit, the first right on it.
  | { kind: "center" }
  // Evenly around the middle of the room, `radius` tiles out.
  | { kind: "ring"; radius: number }
  // Packed together around one random spot away from entrances, all within
  // `radius` tiles of it.
  | { kind: "cluster"; radius: number };

export type SpawnPlacementKind = SpawnPlacement["kind"];

export type SpawnPick = {
  enemy: string;
  weight: number;
  // How many come with each pick, 1 if unset.
  count?: Range;
};

export type SpawnGroup = {
  // How many times `pick` is rolled.
  rolls: Range;
  pick: SpawnPick[];
  placement: SpawnPlacement;
};

export type Spawn = { enemy: string; at: Cell; room: number };

// Where to put `count` spawns: up to `count` distinct cells from `open`,
// fewer if they don't fit.
type PlaceFn<S> = (
  rng: Rng,
  room: DungeonRoom,
  open: Cell[],
  count: number,
  spec: S,
) => Cell[];

// How far scattered spawns keep from entrances, so nothing camps a door.
const ENTRANCE_CLEARANCE = 3;

export const PLACEMENTS: {
  [K in SpawnPlacementKind]: PlaceFn<Extract<SpawnPlacement, { kind: K }>>;
} = {
  scatter: (rng, room, open, count, { spacing = 2 }) => {
    const chosen: Cell[] = [];
    for (const cell of shuffled(rng, open)) {
      if (chosen.length === count) break;
      if (distanceTo(room.entrances, cell) < ENTRANCE_CLEARANCE) continue;
      if (distanceTo(chosen, cell) < spacing) continue;
      chosen.push(cell);
    }
    return chosen;
  },

  center: (_rng, room, open, count) => {
    const middle = centroid(room.cells);
    return [...open]
      .sort((a, b) => distance(a, middle) - distance(b, middle))
      .slice(0, count);
  },

  ring: (_rng, room, open, count, { radius }) => {
    const middle = centroid(room.cells);
    const left = [...open];
    const chosen: Cell[] = [];
    for (let i = 0; i < count && left.length; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const spot = {
        x: middle.x + Math.cos(angle) * radius,
        y: middle.y + Math.sin(angle) * radius,
      };
      const nearest = left.reduce((best, c) =>
        distance(c, spot) < distance(best, spot) ? c : best,
      );
      chosen.push(nearest);
      left.splice(left.indexOf(nearest), 1);
    }
    return chosen;
  },

  cluster: (rng, room, open, count, { radius }) => {
    const anchors = open.filter(
      (c) => distanceTo(room.entrances, c) >= ENTRANCE_CLEARANCE,
    );
    if (!anchors.length) return [];
    const anchor = anchors[Math.floor(rng() * anchors.length)];
    return open
      .filter((c) => distance(c, anchor) <= radius)
      .sort((a, b) => distance(a, anchor) - distance(b, anchor))
      .slice(0, count);
  },
};

// Every spawn in a room, from each of its groups in order. Two spawns never
// share a cell, and none goes on a `reserved` one.
export function populateRoom(
  rng: Rng,
  map: DungeonMap,
  room: DungeonRoom,
  groups: readonly SpawnGroup[],
  reserved: readonly Cell[] = [],
): Spawn[] {
  const spawns: Spawn[] = [];
  const taken = new Set(reserved.map(key));
  for (const group of groups) {
    const enemies: string[] = [];
    const rolls = int(rng, group.rolls);
    for (let i = 0; i < rolls; i++) {
      const pick = weighted(rng, group.pick);
      const count = int(rng, pick.count ?? [1, 1]);
      for (let j = 0; j < count; j++) enemies.push(pick.enemy);
    }
    if (!enemies.length) continue;
    const open = room.cells.filter(
      (c) => isSafe(kindAt(map, c.x, c.y)) && !taken.has(key(c)),
    );
    const place = PLACEMENTS[group.placement.kind] as PlaceFn<SpawnPlacement>;
    const spots = place(rng, room, open, enemies.length, group.placement);
    spots.forEach((at, i) => {
      taken.add(key(at));
      spawns.push({ enemy: enemies[i], at, room: room.node.id });
    });
  }
  return spawns;
}

function centroid(cells: readonly Cell[]): { x: number; y: number } {
  const x = cells.reduce((sum, c) => sum + c.x, 0) / cells.length;
  const y = cells.reduce((sum, c) => sum + c.y, 0) / cells.length;
  return { x, y };
}

function distance(a: Cell, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Distance to the nearest of `cells`, or Infinity if there are none.
function distanceTo(cells: readonly Cell[], cell: Cell): number {
  return Math.min(...cells.map((c) => distance(c, cell)));
}
