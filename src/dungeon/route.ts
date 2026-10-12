import type { Graph } from "./graph";
import { isOn, key, NEIGHBORS_4, onCells, type Cell } from "./mask";
import {
  boxOf,
  grow,
  type Box,
  type PlacedRoom,
  type Placement,
} from "./place";
import { shuffled, type Rng } from "./rng";

// Stage 4: the corridors joining rooms. A router draws one corridor's
// center line, from a floor cell of one room to a floor cell of the other,
// in canvas coordinates; routing then widens it and keeps whatever isn't
// already room floor. Adding a way to draw corridors is one entry in
// ROUTERS. They're tried in the order a dungeon lists them, so a dungeon
// can prefer straight corridors and fall back to bent or freeform ones.

export type RouterSpec =
  // A straight line, across a row (or column) both rooms have floor in.
  | { kind: "straight" }
  // One bend, between the two rooms' middles.
  | { kind: "L" }
  // Any path between the rooms' middles that keeps clear of other rooms,
  // found by A*. `wiggle` (0 if unset) makes some tiles costlier at random,
  // so the corridor wanders; `turnCost` (2 if unset) is what each bend
  // costs in tiles, so higher makes longer, straighter runs.
  | { kind: "astar"; wiggle?: number; turnCost?: number };

export type RouterKind = RouterSpec["kind"];

export type CorridorSpec = {
  // Tried in order for each corridor until one fits.
  routers: RouterSpec[];
  // Tiles across.
  width: number;
};

export type RouteContext = {
  rng: Rng;
  from: PlacedRoom;
  to: PlacedRoom;
  width: number;
  // Cells a corridor can't cover, widened: anywhere near another room.
  blocked: (x: number, y: number) => boolean;
};

// The center line, or null if this router can't join these rooms.
type RouteFn<S> = (context: RouteContext, spec: S) => Cell[] | null;

export type Corridor = {
  // The two rooms it joins, by node id.
  rooms: [number, number];
  // Every cell it covers that isn't either room's floor.
  cells: Cell[];
};

export const ROUTERS: {
  [K in RouterKind]: RouteFn<Extract<RouterSpec, { kind: K }>>;
} = {
  straight: (context) => {
    const { rng, from, to } = context;
    const a = boxOf(from);
    const b = boxOf(to);
    const across = a.x + a.w <= b.x || b.x + b.w <= a.x;
    // Turn a vertical corridor into a horizontal one by swapping axes.
    const flip = (c: Cell): Cell => (across ? c : { x: c.y, y: c.x });
    const [fa, fb] = across ? [a, b] : [swap(a), swap(b)];
    const floorIn = (room: PlacedRoom, row: number): number[] =>
      onCells(room.mask)
        .map((c) => flip({ x: c.x + room.x, y: c.y + room.y }))
        .filter((c) => c.y === row)
        .map((c) => c.x);
    const rows = range(
      Math.max(fa.y, fb.y),
      Math.min(fa.y + fa.h, fb.y + fb.h),
    );
    for (const row of shuffled(rng, rows)) {
      const fromXs = floorIn(from, row);
      const toXs = floorIn(to, row);
      if (!fromXs.length || !toXs.length) continue;
      const east = fa.x < fb.x;
      const start = east ? Math.max(...fromXs) : Math.min(...fromXs);
      const end = east ? Math.min(...toXs) : Math.max(...toXs);
      const line = range(Math.min(start, end), Math.max(start, end) + 1).map(
        (x) => flip({ x, y: row }),
      );
      if (fits(context, line)) return line;
    }
    return null;
  },

  L: (context) => {
    const { rng, from, to } = context;
    const a = middleFloor(from);
    const b = middleFloor(to);
    const bends = [
      { x: b.x, y: a.y },
      { x: a.x, y: b.y },
    ];
    for (const bend of shuffled(rng, bends)) {
      const line = [...segment(a, bend), ...segment(bend, b).slice(1)];
      if (fits(context, line)) return line;
    }
    return null;
  },

  astar: (context, { wiggle = 0, turnCost = 2 }) => {
    const { rng, from, to } = context;
    const start = middleFloor(from);
    const goal = middleFloor(to);
    const bounds = grow(union(boxOf(from), boxOf(to)), ASTAR_REACH);
    const salt = Math.floor(rng() * 2 ** 32);
    const open = (x: number, y: number) =>
      inBox(bounds, x, y) && fits(context, [{ x, y }]);
    const extra = (x: number, y: number) => wiggle * noise(x, y, salt);
    return findPath(start, goal, open, extra, turnCost);
  },
};

// How far past the two rooms' boxes A* looks for a way around.
const ASTAR_REACH = 12;

// A corridor for every edge in the graph, or null if one couldn't be drawn.
export function routeCorridors(
  rng: Rng,
  graph: Graph,
  placement: Placement,
  spec: CorridorSpec,
): Corridor[] | null {
  const boxes = placement.map((room) => grow(boxOf(room), 1));
  const corridors: Corridor[] = [];
  for (const [a, b] of graph.edges) {
    const blocked = (x: number, y: number) =>
      boxes.some((box, i) => i !== a && i !== b && inBox(box, x, y));
    const context: RouteContext = {
      rng,
      from: placement[a],
      to: placement[b],
      width: spec.width,
      blocked,
    };
    const line = firstRoute(context, spec.routers);
    if (!line) return null;
    corridors.push({
      rooms: [a, b],
      cells: widen(line, spec.width).filter(
        (c) => !onFloor(placement[a], c) && !onFloor(placement[b], c),
      ),
    });
  }
  return corridors;
}

function firstRoute(
  context: RouteContext,
  routers: RouterSpec[],
): Cell[] | null {
  for (const spec of routers) {
    const route = ROUTERS[spec.kind] as RouteFn<RouterSpec>;
    const line = route(context, spec);
    if (line) return line;
  }
  return null;
}

// Every cell a `width`-wide brush covers moving along `line`, once each.
export function widen(line: readonly Cell[], width: number): Cell[] {
  const low = -Math.floor((width - 1) / 2);
  const seen = new Map<string, Cell>();
  for (const { x, y } of line) {
    for (let dy = low; dy < low + width; dy++) {
      for (let dx = low; dx < low + width; dx++) {
        const cell = { x: x + dx, y: y + dy };
        seen.set(key(cell), cell);
      }
    }
  }
  return [...seen.values()];
}

// Whether a center line, widened, stays out of every blocked cell.
function fits(context: RouteContext, line: Cell[]): boolean {
  return widen(line, context.width).every(({ x, y }) => !context.blocked(x, y));
}

function onFloor(room: PlacedRoom, { x, y }: Cell): boolean {
  return isOn(room.mask, x - room.x, y - room.y);
}

// The room's floor cell nearest the middle of its box, in canvas
// coordinates.
function middleFloor(room: PlacedRoom): Cell {
  const mx = (room.mask.width - 1) / 2;
  const my = (room.mask.height - 1) / 2;
  const nearest = onCells(room.mask).reduce((best, c) =>
    Math.hypot(c.x - mx, c.y - my) < Math.hypot(best.x - mx, best.y - my)
      ? c
      : best,
  );
  return { x: nearest.x + room.x, y: nearest.y + room.y };
}

// Cells from `a` to `b` along a row or column, both ends included.
function segment(a: Cell, b: Cell): Cell[] {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  return Array.from({ length: steps + 1 }, (_, i) => ({
    x: a.x + Math.sign(b.x - a.x) * i,
    y: a.y + Math.sign(b.y - a.y) * i,
  }));
}

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
}

function swap(box: Box): Box {
  return { x: box.y, y: box.x, w: box.h, h: box.w };
}

function inBox(box: Box, x: number, y: number): boolean {
  return x >= box.x && y >= box.y && x < box.x + box.w && y < box.y + box.h;
}

function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

// A number in [0, 1) that's the same every time for the same cell and salt.
function noise(x: number, y: number, salt: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ salt;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// The cheapest path from `start` to `goal` through `open` cells, moving in
// four directions: each step costs 1 plus the cell's `extra`, and each
// change of direction `turnCost` more. Null if there's none.
export function findPath(
  start: Cell,
  goal: Cell,
  open: (x: number, y: number) => boolean,
  extra: (x: number, y: number) => number,
  turnCost: number,
): Cell[] | null {
  // A state is a cell and the direction it was entered from (4 for the
  // start, entered from nowhere).
  const id = (x: number, y: number, dir: number) => `${x},${y},${dir}`;
  const cost = new Map<string, number>();
  const came = new Map<string, { x: number; y: number; dir: number }>();
  const heap = new Heap<{ x: number; y: number; dir: number }>();
  const guess = (x: number, y: number) =>
    Math.abs(goal.x - x) + Math.abs(goal.y - y);

  cost.set(id(start.x, start.y, 4), 0);
  heap.push({ ...start, dir: 4 }, guess(start.x, start.y));
  while (heap.size) {
    const state = heap.pop()!;
    const here = id(state.x, state.y, state.dir);
    if (state.x === goal.x && state.y === goal.y) {
      const path: Cell[] = [];
      for (let s: typeof state | undefined = state; s;) {
        path.push({ x: s.x, y: s.y });
        s = came.get(id(s.x, s.y, s.dir));
      }
      return path.reverse();
    }
    const spent = cost.get(here)!;
    NEIGHBORS_4.forEach((d, dir) => {
      const x = state.x + d.x;
      const y = state.y + d.y;
      if (!open(x, y)) return;
      const turn = state.dir !== 4 && state.dir !== dir ? turnCost : 0;
      const next = spent + 1 + extra(x, y) + turn;
      const there = id(x, y, dir);
      if (next >= (cost.get(there) ?? Infinity)) return;
      cost.set(there, next);
      came.set(there, state);
      heap.push({ x, y, dir }, next + guess(x, y));
    });
  }
  return null;
}

// A binary min-heap of items by priority.
class Heap<T> {
  private items: { item: T; priority: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: T, priority: number): void {
    const items = this.items;
    items.push({ item, priority });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].priority <= items[i].priority) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length && last) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let least = i;
        if (l < items.length && items[l].priority < items[least].priority)
          least = l;
        if (r < items.length && items[r].priority < items[least].priority)
          least = r;
        if (least === i) break;
        [items[least], items[i]] = [items[i], items[least]];
        i = least;
      }
    }
    return top?.item;
  }
}
