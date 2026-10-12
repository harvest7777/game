import type { Graph } from "./graph";
import type { Mask } from "./mask";
import { int, shuffled, type Range, type Rng } from "./rng";

// Stage 3: where each room goes. Rooms get a top-left corner on one big
// canvas (which can run negative; rasterizing shifts it), far enough apart
// that walls fit between them and corridors have somewhere to run. Adding a
// way to place rooms is one entry in PLACERS.

export type PlacedRoom = { node: number; x: number; y: number; mask: Mask };

// Each room, indexed by node id.
export type Placement = PlacedRoom[];

export type PlacementSpec =
  // Each room grows out of the room it's reached from, `gap` tiles away
  // (the room for its corridor) on a random side, keeping `margin` tiles
  // (2 if unset) clear of every other room and corridor.
  { kind: "grow"; gap: Range; margin?: number };

export type PlacementKind = PlacementSpec["kind"];

type PlaceFn<S> = (
  rng: Rng,
  graph: Graph,
  masks: Mask[],
  spec: S,
) => Placement | null;

// Tries per side before giving up on a room.
const TRIES_PER_SIDE = 8;

export type Box = { x: number; y: number; w: number; h: number };

// Space a room or corridor has claimed, and the rooms it belongs to.
type Taken = { box: Box; rooms: number[] };

const SIDES = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
] as const;

export const PLACERS: {
  [K in PlacementKind]: PlaceFn<Extract<PlacementSpec, { kind: K }>>;
} = {
  grow: (rng, graph, masks, { gap, margin = 2 }) => {
    const placed: Placement = [];
    // Every room and corridor so far, and which rooms each belongs to.
    const taken: Taken[] = [];
    placed[0] = { node: 0, x: 0, y: 0, mask: masks[0] };
    taken.push({ box: boxOf(placed[0]), rooms: [0] });

    // Parents always come before their children in graph order.
    for (const node of graph.nodes.slice(1)) {
      const parent = placed[node.parent!];
      const mask = masks[node.id];
      const spot = findSpot(rng, parent, mask, gap, margin, taken);
      if (!spot) return null;
      placed[node.id] = { node: node.id, ...spot.at, mask };
      taken.push(
        { box: spot.room, rooms: [node.id] },
        { box: spot.corridor, rooms: [parent.node, node.id] },
      );
    }
    return placed;
  },
};

export function placeRooms(
  rng: Rng,
  graph: Graph,
  masks: Mask[],
  spec: PlacementSpec,
): Placement | null {
  const place = PLACERS[spec.kind] as PlaceFn<PlacementSpec>;
  return place(rng, graph, masks, spec);
}

// The bounding box a placed room covers.
export function boxOf({ x, y, mask }: PlacedRoom): Box {
  return { x, y, w: mask.width, h: mask.height };
}

function findSpot(
  rng: Rng,
  parent: PlacedRoom,
  mask: Mask,
  gap: Range,
  margin: number,
  taken: Taken[],
): { at: { x: number; y: number }; room: Box; corridor: Box } | null {
  const from = boxOf(parent);
  const isParent = (t: Taken) =>
    t.rooms.length === 1 && t.rooms[0] === parent.node;
  for (const side of shuffled(rng, SIDES)) {
    for (let i = 0; i < TRIES_PER_SIDE; i++) {
      const distance = int(rng, gap);
      const at = besideBox(rng, from, mask, side, distance);
      const room = { x: at.x, y: at.y, w: mask.width, h: mask.height };
      const corridor = between(from, room);
      // The parent is `gap` away by design, so only needs a tile of wall.
      const roomClear = taken.every(
        (t) => !overlaps(grow(room, isParent(t) ? 1 : margin), t.box),
      );
      // The corridor starts inside its parent and may run alongside the
      // parent's other corridors; it only has to keep clear of the rest.
      const corridorClear = taken.every(
        (t) =>
          t.rooms.includes(parent.node) ||
          !overlaps(grow(corridor, margin), t.box),
      );
      if (roomClear && corridorClear) return { at, room, corridor };
    }
  }
  return null;
}

// Where a `mask`-sized room goes `distance` tiles off `side` of `from`,
// slid along that side so the two still face each other: the new room's
// middle stays within `from`'s span.
function besideBox(
  rng: Rng,
  from: Box,
  mask: Mask,
  side: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  if (side.x !== 0) {
    const x =
      side.x > 0 ? from.x + from.w + distance : from.x - distance - mask.width;
    const middle = int(rng, [from.y, from.y + from.h - 1]);
    return { x, y: middle - Math.floor(mask.height / 2) };
  }
  const y =
    side.y > 0 ? from.y + from.h + distance : from.y - distance - mask.height;
  const middle = int(rng, [from.x, from.x + from.w - 1]);
  return { x: middle - Math.floor(mask.width / 2), y };
}

// The box between two rooms' middles, where their corridor runs whichever
// way it bends: a child's middle is always within its parent's span, so a
// straight corridor fits inside it too.
export function between(a: Box, b: Box): Box {
  const ax = a.x + Math.floor(a.w / 2);
  const ay = a.y + Math.floor(a.h / 2);
  const bx = b.x + Math.floor(b.w / 2);
  const by = b.y + Math.floor(b.h / 2);
  const x = Math.min(ax, bx);
  const y = Math.min(ay, by);
  return { x, y, w: Math.abs(ax - bx) + 1, h: Math.abs(ay - by) + 1 };
}

export function grow(box: Box, by: number): Box {
  return { x: box.x - by, y: box.y - by, w: box.w + 2 * by, h: box.h + 2 * by };
}

export function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}
