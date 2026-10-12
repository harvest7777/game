import { int, pick, type Range, type Rng } from "./rng";

// Stage 1: which rooms there are and how they connect, before anything has
// a size or a place. A main path runs from the start room to the goal room,
// and branches hang off it, ending in dead ends.

// What part a room plays, which decides what kind of room it becomes.
export const ROOM_TAGS = ["start", "normal", "deadEnd", "goal"] as const;
export type RoomTag = (typeof ROOM_TAGS)[number];

export type GraphNode = {
  id: number;
  tag: RoomTag;
  // Rooms from the start room.
  depth: number;
  // The room it was reached from; null for the start room.
  parent: number | null;
};

export type Graph = {
  // Indexed by id. The start room is 0.
  nodes: GraphNode[];
  // Each pair of rooms a corridor joins, parent first: a tree, so every
  // room is reachable from the start.
  edges: [number, number][];
  // Extra corridors that close loops, earlier room first. Nice to have:
  // ones that can't be routed are left out.
  loops: [number, number][];
};

export type GraphSpec = {
  // Rooms on the main path, start and goal included. At least 2.
  mainPath: Range;
  // How many branches hang off the main path.
  branches: Range;
  // Rooms in each branch.
  branchLength: Range;
  // Extra ways around, added after the branches.
  loops?: LoopSpec[];
};

// A kind of loop, and how many of it to try for. `span` is how many rooms
// along the main path it skips; loops never reach the goal, so there's no
// way around its last room.
export type LoopSpec =
  // A corridor straight from one main path room to one `span` further on.
  | { kind: "shortcut"; count: Range; span: Range }
  // A side path of `length` rooms leaving one main path room and coming
  // back in `span` rooms further on: two routes to the same place.
  | { kind: "detour"; count: Range; span: Range; length: Range };

export type LoopKind = LoopSpec["kind"];

// No room joins more than this many others, so each can still find a side
// to put its corridors on.
export const MAX_DEGREE = 4;

// What a loop kind needs to add itself: the main path, a way to add rooms
// and loop edges, and whether a room can take another corridor.
type LoopContext = {
  rng: Rng;
  main: GraphNode[];
  add: (tag: RoomTag, parent: GraphNode) => GraphNode;
  join: (a: GraphNode, b: GraphNode) => void;
  hasRoom: (node: GraphNode) => boolean;
};

// Tries to add one loop, doing nothing if it can't find room for it.
type LoopFn<S> = (context: LoopContext, spec: S) => void;

// Main path rooms `span` apart, `from` earlier, both with room for another
// corridor and the later one short of the goal. Null if there aren't any.
function mainPair(
  { rng, main, hasRoom }: LoopContext,
  span: Range,
): [GraphNode, GraphNode] | null {
  const gap = Math.max(2, int(rng, span));
  const pairs = main
    .slice(0, -1)
    .map((from, i) => [from, main[i + gap]] as const)
    .filter(
      ([from, to]) => to && to.tag !== "goal" && hasRoom(from) && hasRoom(to),
    );
  return pairs.length ? [...pick(rng, pairs)] : null;
}

export const LOOPS: {
  [K in LoopKind]: LoopFn<Extract<LoopSpec, { kind: K }>>;
} = {
  shortcut: (context, { span }) => {
    const pair = mainPair(context, span);
    if (pair) context.join(...pair);
  },
  detour: (context, { span, length }) => {
    const pair = mainPair(context, span);
    if (!pair) return;
    const [from, to] = pair;
    let last = from;
    const rooms = Math.max(1, int(context.rng, length));
    for (let i = 0; i < rooms; i++) last = context.add("normal", last);
    context.join(to, last);
  },
};

// A tree of rooms, plus any loops. Branches hang off any main path room but
// the goal, and only where it still has room for another corridor; any
// that can't fit are dropped, and so are loops.
export function generateGraph(rng: Rng, spec: GraphSpec): Graph {
  const nodes: GraphNode[] = [];
  const edges: [number, number][] = [];
  const loops: [number, number][] = [];
  const degree: number[] = [];
  const add = (tag: RoomTag, parent: GraphNode | null): GraphNode => {
    const node: GraphNode = {
      id: nodes.length,
      tag,
      depth: parent ? parent.depth + 1 : 0,
      parent: parent?.id ?? null,
    };
    nodes.push(node);
    degree.push(0);
    if (parent) {
      edges.push([parent.id, node.id]);
      degree[parent.id]++;
      degree[node.id]++;
    }
    return node;
  };

  const length = Math.max(2, int(rng, spec.mainPath));
  const main = [add("start", null)];
  for (let i = 1; i < length; i++) {
    main.push(add(i === length - 1 ? "goal" : "normal", main[i - 1]));
  }

  const branches = int(rng, spec.branches);
  for (let b = 0; b < branches; b++) {
    const roots = main.filter(
      (node) => node.tag !== "goal" && degree[node.id] < MAX_DEGREE,
    );
    if (!roots.length) break;
    let parent = pick(rng, roots);
    const rooms = Math.max(1, int(rng, spec.branchLength));
    for (let i = 0; i < rooms; i++) {
      parent = add(i === rooms - 1 ? "deadEnd" : "normal", parent);
    }
  }

  const context: LoopContext = {
    rng,
    main,
    add,
    join: (a, b) => {
      loops.push(a.id < b.id ? [a.id, b.id] : [b.id, a.id]);
      degree[a.id]++;
      degree[b.id]++;
    },
    hasRoom: (node) => degree[node.id] < MAX_DEGREE,
  };
  for (const loop of spec.loops ?? []) {
    const addLoop = LOOPS[loop.kind] as LoopFn<LoopSpec>;
    const count = int(rng, loop.count);
    for (let i = 0; i < count; i++) addLoop(context, loop);
  }

  return { nodes, edges, loops };
}

// Every room's neighbors along the tree, by id.
export function neighbors(graph: Graph): number[][] {
  const result = graph.nodes.map((): number[] => []);
  for (const [a, b] of graph.edges) {
    result[a].push(b);
    result[b].push(a);
  }
  return result;
}
