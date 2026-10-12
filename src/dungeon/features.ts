import {
  isSafe,
  kindAt,
  setKind,
  type CellKind,
  type DungeonMap,
  type DungeonRoom,
} from "./grid";
import { flood, key, NEIGHBORS_4, NEIGHBORS_8, type Cell } from "./mask";
import { float, int, pick, type Range, type Rng } from "./rng";

// Stage 6: what's inside a room besides bare floor. A feature changes some
// of one room's floor cells. Whatever it does, the room's safe floor has to
// stay one connected piece that every entrance opens onto; a try that
// breaks that is undone and tried again, and dropped if it keeps failing.
// Adding a kind of feature is one entry in FEATURES.

export type FeatureSpec =
  // A blob of `cell` (liquid if unset) covering `coverage` of the room
  // (a share, 0 to 1), kept off its entrances.
  | { kind: "pool"; coverage: Range; cell?: CellKind }
  // Single-tile walls in a grid `spacing` tiles apart, only where they're
  // surrounded by floor.
  | { kind: "pillars"; spacing: number }
  // The room's edge, `width` tiles deep, turned to `cell` (accent if unset),
  // leaving a way in at each entrance.
  | { kind: "border"; width: number; cell?: CellKind };

export type FeatureKind = FeatureSpec["kind"];

type FeatureFn<S> = (
  rng: Rng,
  map: DungeonMap,
  room: DungeonRoom,
  spec: S,
) => void;

// Tries at a feature before leaving it out.
const FEATURE_TRIES = 5;

// How far, in tiles, features keep from an entrance.
const ENTRANCE_CLEARANCE = 2;

export const FEATURES: {
  [K in FeatureKind]: FeatureFn<Extract<FeatureSpec, { kind: K }>>;
} = {
  pool: (rng, map, room, { coverage, cell = "liquid" }) => {
    const open = room.cells.filter(
      (c) => kindAt(map, c.x, c.y) === "floor" && !nearEntrance(room, c),
    );
    if (!open.length) return;
    const allowed = new Set(open.map(key));
    const target = Math.round(float(rng, coverage) * room.cells.length);
    const pool = new Set<string>();
    const frontier = [pick(rng, open)];
    while (frontier.length && pool.size < target) {
      const [next] = frontier.splice(int(rng, [0, frontier.length - 1]), 1);
      if (pool.has(key(next)) || !allowed.has(key(next))) continue;
      pool.add(key(next));
      setKind(map, next.x, next.y, cell);
      for (const d of NEIGHBORS_4) {
        frontier.push({ x: next.x + d.x, y: next.y + d.y });
      }
    }
  },

  pillars: (rng, map, room, { spacing }) => {
    const offset = int(rng, [0, spacing - 1]);
    for (const c of room.cells) {
      if ((c.x + offset) % spacing || (c.y + offset) % spacing) continue;
      if (nearEntrance(room, c)) continue;
      const surrounded = NEIGHBORS_8.every((d) =>
        inRoomFloor(map, room, { x: c.x + d.x, y: c.y + d.y }),
      );
      if (surrounded) setKind(map, c.x, c.y, "wall");
    }
  },

  border: (_rng, map, room, { width, cell = "accent" }) => {
    const edge = room.cells.filter((c) => {
      if (kindAt(map, c.x, c.y) !== "floor" || nearEntrance(room, c)) {
        return false;
      }
      for (let dy = -width; dy <= width; dy++) {
        for (let dx = -width; dx <= width; dx++) {
          if (!inRoom(map, room, { x: c.x + dx, y: c.y + dy })) return true;
        }
      }
      return false;
    });
    for (const c of edge) setKind(map, c.x, c.y, cell);
  },
};

// Applies each feature to the room in order, undoing and retrying any that
// would cut the room up or block an entrance.
export function decorateRoom(
  rng: Rng,
  map: DungeonMap,
  room: DungeonRoom,
  features: readonly FeatureSpec[],
): void {
  for (const spec of features) {
    const feature = FEATURES[spec.kind] as FeatureFn<FeatureSpec>;
    for (let i = 0; i < FEATURE_TRIES; i++) {
      const before = room.cells.map((c) => kindAt(map, c.x, c.y));
      feature(rng, map, room, spec);
      if (isWhole(map, room)) break;
      room.cells.forEach((c, j) => setKind(map, c.x, c.y, before[j]));
    }
  }
}

// Whether all the room's safe floor is one connected piece, entrances
// included.
export function isWhole(map: DungeonMap, room: DungeonRoom): boolean {
  const safe = room.cells.filter((c) => isSafe(kindAt(map, c.x, c.y)));
  if (!safe.length) return false;
  if (room.entrances.some((c) => !isSafe(kindAt(map, c.x, c.y)))) return false;
  const reached = flood(safe[0], (x, y) => {
    const cell = { x, y };
    return inRoom(map, room, cell) && isSafe(kindAt(map, x, y));
  });
  return reached.length === safe.length;
}

function inRoom(map: DungeonMap, room: DungeonRoom, { x, y }: Cell): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  return map.roomAt[y * map.width + x] === room.node.id;
}

function inRoomFloor(map: DungeonMap, room: DungeonRoom, cell: Cell): boolean {
  return inRoom(map, room, cell) && kindAt(map, cell.x, cell.y) === "floor";
}

function nearEntrance(room: DungeonRoom, cell: Cell): boolean {
  return room.entrances.some(
    (e) =>
      Math.max(Math.abs(e.x - cell.x), Math.abs(e.y - cell.y)) <=
      ENTRANCE_CLEARANCE,
  );
}
