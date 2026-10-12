import type { Graph, GraphNode } from "./graph";
import { isOn, key, NEIGHBORS_4, NEIGHBORS_8, type Cell } from "./mask";
import type { Placement } from "./place";
import type { Corridor } from "./route";

// Stage 5: rooms and corridors drawn onto one grid of what each cell is,
// still knowing nothing about the game. Rendering it into tiles is up to
// whoever uses it.

// `void` is solid rock nothing reaches, `wall` the rock next to anywhere
// walkable. `liquid` can be walked through but isn't safe; `accent` is
// floor that looks different.
export const CELL_KINDS = [
  "void",
  "wall",
  "floor",
  "corridor",
  "liquid",
  "accent",
] as const;
export type CellKind = (typeof CELL_KINDS)[number];

export type DungeonRoom = {
  node: GraphNode;
  // Its floor, in map coordinates.
  cells: Cell[];
  // Its floor cells a corridor comes into.
  entrances: Cell[];
};

export type DungeonMap = {
  width: number;
  height: number;
  // Row by row.
  kinds: CellKind[];
  // Which room each cell belongs to, or -1.
  roomAt: Int32Array;
  // Indexed by node id.
  rooms: DungeonRoom[];
};

// Tiles of rock kept around everything, so walls never touch the edge.
const PADDING = 2;

const ASCII: Record<CellKind, string> = {
  void: " ",
  wall: "#",
  floor: ".",
  corridor: ",",
  liquid: "~",
  accent: "*",
};

export function kindAt(map: DungeonMap, x: number, y: number): CellKind {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return "void";
  return map.kinds[y * map.width + x];
}

export function setKind(
  map: DungeonMap,
  x: number,
  y: number,
  kind: CellKind,
): void {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
  map.kinds[y * map.width + x] = kind;
}

// Whether something can stand there at all.
export function isWalkable(kind: CellKind): boolean {
  return kind !== "void" && kind !== "wall";
}

// Whether it can be walked without getting hurt.
export function isSafe(kind: CellKind): boolean {
  return isWalkable(kind) && kind !== "liquid";
}

export function rasterize(
  graph: Graph,
  placement: Placement,
  corridors: Corridor[],
): DungeonMap {
  const all = [
    ...placement.flatMap((room) => [
      { x: room.x, y: room.y },
      { x: room.x + room.mask.width - 1, y: room.y + room.mask.height - 1 },
    ]),
    ...corridors.flatMap((c) => c.cells),
  ];
  const left = Math.min(...all.map((c) => c.x)) - PADDING;
  const top = Math.min(...all.map((c) => c.y)) - PADDING;
  const width = Math.max(...all.map((c) => c.x)) - left + 1 + PADDING;
  const height = Math.max(...all.map((c) => c.y)) - top + 1 + PADDING;
  const map: DungeonMap = {
    width,
    height,
    kinds: new Array<CellKind>(width * height).fill("void"),
    roomAt: new Int32Array(width * height).fill(-1),
    rooms: [],
  };

  for (const corridor of corridors) {
    for (const { x, y } of corridor.cells) {
      setKind(map, x - left, y - top, "corridor");
    }
  }
  for (const room of placement) {
    const cells: Cell[] = [];
    for (let y = 0; y < room.mask.height; y++) {
      for (let x = 0; x < room.mask.width; x++) {
        if (!isOn(room.mask, x, y)) continue;
        const cell = { x: room.x + x - left, y: room.y + y - top };
        setKind(map, cell.x, cell.y, "floor");
        map.roomAt[cell.y * width + cell.x] = room.node;
        cells.push(cell);
      }
    }
    map.rooms[room.node] = {
      node: graph.nodes[room.node],
      cells,
      entrances: [],
    };
  }
  for (const room of map.rooms) {
    room.entrances = room.cells.filter((c) =>
      NEIGHBORS_4.some((d) => kindAt(map, c.x + d.x, c.y + d.y) === "corridor"),
    );
  }
  addWalls(map);
  return map;
}

// Turns rock next to anywhere walkable, diagonals included, into wall.
export function addWalls(map: DungeonMap): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (kindAt(map, x, y) !== "void") continue;
      const nearWalkable = NEIGHBORS_8.some((d) =>
        isWalkable(kindAt(map, x + d.x, y + d.y)),
      );
      if (nearWalkable) setKind(map, x, y, "wall");
    }
  }
}

// The cells reachable from `from` through cells `open` allows.
export function reachable(
  map: DungeonMap,
  from: Cell,
  open: (kind: CellKind) => boolean,
): Set<string> {
  const seen = new Set<string>();
  if (!open(kindAt(map, from.x, from.y))) return seen;
  const queue = [from];
  seen.add(key(from));
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    for (const d of NEIGHBORS_4) {
      const next = { x: cell.x + d.x, y: cell.y + d.y };
      if (seen.has(key(next)) || !open(kindAt(map, next.x, next.y))) continue;
      seen.add(key(next));
      queue.push(next);
    }
  }
  return seen;
}

// The map as text, one character per cell. For tests and failure messages.
export function dungeonAscii(map: DungeonMap): string[] {
  return Array.from({ length: map.height }, (_, y) =>
    Array.from({ length: map.width }, (_, x) => ASCII[kindAt(map, x, y)]).join(
      "",
    ),
  );
}
