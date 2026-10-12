import { decorateRoom, type FeatureKind, type FeatureSpec } from "./features";
import { generateGraph, type GraphSpec, type RoomTag } from "./graph";
import {
  isSafe,
  kindAt,
  rasterize,
  reachable,
  type DungeonMap,
  type DungeonRoom,
} from "./grid";
import { key, type Cell } from "./mask";
import { placeRooms, type PlacementSpec } from "./place";
import { populateRoom, type Spawn, type SpawnGroup } from "./populate";
import { routeCorridors, type CorridorSpec } from "./route";
import { deriveSeed, seeded, weighted } from "./rng";
import { makeShape, type ShapeSpec } from "./shapes";

// Runs every stage in order, from a spec and a seed to a finished map with
// its spawns. A stage that can't satisfy its spec fails the attempt, and the
// next attempt starts over on a seed derived from the first, so a seed
// always builds the same dungeon.

// One kind of room a tag can become.
export type RoomSpec = {
  weight: number;
  shape: ShapeSpec;
  features?: FeatureSpec[];
  spawns?: SpawnGroup[];
};

export type DungeonSpec = {
  graph: GraphSpec;
  placement: PlacementSpec;
  corridors: CorridorSpec;
  // What each tag can become. Dead ends are normal rooms unless listed.
  rooms: { [T in Exclude<RoomTag, "deadEnd">]: RoomSpec[] } & {
    deadEnd?: RoomSpec[];
  };
};

export type Dungeon = {
  // The seed it was asked for, and which attempt built it.
  seed: number;
  attempt: number;
  map: DungeonMap;
  // The room spec each room was built from, by node id.
  roomSpecs: RoomSpec[];
  spawns: Spawn[];
  // Where characters arrive: the safe cell nearest the start room's middle.
  start: Cell;
  // What the spec asked for that didn't fit: features left out of a room,
  // and rolled enemies with nowhere to stand. Empty when everything fit.
  report: {
    droppedFeatures: { room: number; kind: FeatureKind }[];
    unplacedSpawns: { room: number; enemy: string }[];
  };
};

export const DEFAULT_ATTEMPTS = 50;

// Which stage an attempt failed at, for the error when all of them do.
type Failure = "shape" | "placement" | "corridors" | "unreachable";

export function generateDungeon(
  spec: DungeonSpec,
  seed: number,
  attempts = DEFAULT_ATTEMPTS,
): Dungeon {
  const failures: Failure[] = [];
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = tryGenerate(spec, seed, attempt);
    if (typeof result !== "string") return result;
    failures.push(result);
  }
  const counts = failures.reduce<Record<string, number>>((all, f) => {
    all[f] = (all[f] ?? 0) + 1;
    return all;
  }, {});
  throw new Error(
    `no dungeon from seed ${seed} in ${attempts} attempts: ${JSON.stringify(counts)}`,
  );
}

function tryGenerate(
  spec: DungeonSpec,
  seed: number,
  attempt: number,
): Dungeon | Failure {
  const rng = seeded(deriveSeed(seed, attempt));
  const graph = generateGraph(rng, spec.graph);
  const roomSpecs = graph.nodes.map((node) =>
    weighted(rng, roomsFor(spec, node.tag)),
  );

  const masks = [];
  for (const room of roomSpecs) {
    const mask = makeShape(rng, room.shape);
    if (!mask) return "shape";
    masks.push(mask);
  }
  const placement = placeRooms(rng, graph, masks, spec.placement);
  if (!placement) return "placement";
  const corridors = routeCorridors(rng, graph, placement, spec.corridors);
  if (!corridors) return "corridors";

  const map = rasterize(graph, placement, corridors);
  const droppedFeatures = map.rooms.flatMap((room, i) =>
    decorateRoom(rng, map, room, roomSpecs[i].features ?? []).map((kind) => ({
      room: i,
      kind,
    })),
  );
  const start = middleOf(map, map.rooms[0]);
  if (!start || !allReachable(map, start)) return "unreachable";

  const spawns = [];
  const unplacedSpawns = [];
  for (const [i, room] of map.rooms.entries()) {
    const placed = populateRoom(rng, map, room, roomSpecs[i].spawns ?? [], [
      start,
    ]);
    spawns.push(...placed.spawns);
    unplacedSpawns.push(
      ...placed.unplaced.map((enemy) => ({ room: i, enemy })),
    );
  }
  return {
    seed,
    attempt,
    map,
    roomSpecs,
    spawns,
    start,
    report: { droppedFeatures, unplacedSpawns },
  };
}

function roomsFor(spec: DungeonSpec, tag: RoomTag): RoomSpec[] {
  if (tag === "deadEnd") return spec.rooms.deadEnd ?? spec.rooms.normal;
  return spec.rooms[tag];
}

// The room's safe cell nearest the middle of its floor.
export function middleOf(map: DungeonMap, room: DungeonRoom): Cell | null {
  const safe = room.cells.filter((c) => isSafe(kindAt(map, c.x, c.y)));
  if (!safe.length) return null;
  const mx = room.cells.reduce((sum, c) => sum + c.x, 0) / room.cells.length;
  const my = room.cells.reduce((sum, c) => sum + c.y, 0) / room.cells.length;
  return safe.reduce((best, c) =>
    Math.hypot(c.x - mx, c.y - my) < Math.hypot(best.x - mx, best.y - my)
      ? c
      : best,
  );
}

// Whether every room can be reached from `start` without stepping in
// anything unsafe.
function allReachable(map: DungeonMap, start: Cell): boolean {
  const reached = reachable(map, start, isSafe);
  return map.rooms.every((room) => room.cells.some((c) => reached.has(key(c))));
}
