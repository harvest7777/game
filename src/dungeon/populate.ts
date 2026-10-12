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
  // Each roll's pick packed together around its own random spot away from
  // entrances, within `radius` tiles of it where there's room (nearest
  // first otherwise), the packs apart if they fit.
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

// Where to put a group's spawns: up to as many distinct cells from `open`
// as `packs` adds up to, fewer if they don't fit, in the same order. Each
// pack is what one roll brought, so placements that keep packs together can.
type PlaceFn<S> = (
  rng: Rng,
  room: DungeonRoom,
  open: Cell[],
  packs: number[],
  spec: S,
) => Cell[];

const total = (packs: number[]) => packs.reduce((sum, n) => sum + n, 0);

// How far scattered spawns keep from entrances, so nothing camps a door.
const ENTRANCE_CLEARANCE = 3;

export const PLACEMENTS: {
  [K in SpawnPlacementKind]: PlaceFn<Extract<SpawnPlacement, { kind: K }>>;
} = {
  scatter: (rng, room, open, packs, { spacing = 2 }) => {
    const count = total(packs);
    const chosen: Cell[] = [];
    for (const cell of shuffled(rng, open)) {
      if (chosen.length === count) break;
      if (distanceTo(room.entrances, cell) < ENTRANCE_CLEARANCE) continue;
      if (distanceTo(chosen, cell) < spacing) continue;
      chosen.push(cell);
    }
    return chosen;
  },

  center: (_rng, room, open, packs) => {
    const middle = centroid(room.cells);
    return [...open]
      .sort((a, b) => distance(a, middle) - distance(b, middle))
      .slice(0, total(packs));
  },

  ring: (_rng, room, open, packs, { radius }) => {
    const count = total(packs);
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

  cluster: (rng, room, open, packs, { radius }) => {
    const left = [...open];
    const anchors: Cell[] = [];
    const chosen: Cell[] = [];
    for (const size of packs) {
      const candidates = left.filter(
        (c) => distanceTo(room.entrances, c) >= ENTRANCE_CLEARANCE,
      );
      // Apart from the other packs if there's room, so they don't merge.
      const apart = candidates.filter(
        (c) => distanceTo(anchors, c) > radius * 2 + 1,
      );
      const pool = apart.length ? apart : candidates;
      if (!pool.length) break;
      const anchor = pool[Math.floor(rng() * pool.length)];
      anchors.push(anchor);
      // Nearest first, so a pack crowded by walls or lava spills just past
      // `radius` rather than leaving anyone out.
      const pack = [...left]
        .sort((a, b) => distance(a, anchor) - distance(b, anchor))
        .slice(0, size);
      for (const cell of pack) left.splice(left.indexOf(cell), 1);
      chosen.push(...pack);
    }
    return chosen;
  },
};

// Every spawn in a room, from each of its groups in order, and the enemies
// rolled that found nowhere to stand. Two spawns never share a cell, and
// none goes on a `reserved` one.
export function populateRoom(
  rng: Rng,
  map: DungeonMap,
  room: DungeonRoom,
  groups: readonly SpawnGroup[],
  reserved: readonly Cell[] = [],
): { spawns: Spawn[]; unplaced: string[] } {
  const spawns: Spawn[] = [];
  const unplaced: string[] = [];
  const taken = new Set(reserved.map(key));
  for (const group of groups) {
    const enemies: string[] = [];
    const packs: number[] = [];
    const rolls = int(rng, group.rolls);
    for (let i = 0; i < rolls; i++) {
      const pick = weighted(rng, group.pick);
      const count = int(rng, pick.count ?? [1, 1]);
      for (let j = 0; j < count; j++) enemies.push(pick.enemy);
      packs.push(count);
    }
    if (!enemies.length) continue;
    const open = room.cells.filter(
      (c) => isSafe(kindAt(map, c.x, c.y)) && !taken.has(key(c)),
    );
    const place = PLACEMENTS[group.placement.kind] as PlaceFn<SpawnPlacement>;
    const spots = place(rng, room, open, packs, group.placement);
    spots.forEach((at, i) => {
      taken.add(key(at));
      spawns.push({ enemy: enemies[i], at, room: room.node.id });
    });
    unplaced.push(...enemies.slice(spots.length));
  }
  return { spawns, unplaced };
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
