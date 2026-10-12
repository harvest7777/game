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
  // Each pair of rooms a corridor joins, parent first.
  edges: [number, number][];
};

export type GraphSpec = {
  // Rooms on the main path, start and goal included. At least 2.
  mainPath: Range;
  // How many branches hang off the main path.
  branches: Range;
  // Rooms in each branch.
  branchLength: Range;
};

// No room joins more than this many others, so each can still find a side
// to put its corridors on.
export const MAX_DEGREE = 4;

// A tree of rooms. Branches hang off any main path room but the goal, and
// only where it still has room for another corridor; any that can't fit
// are dropped.
export function generateGraph(rng: Rng, spec: GraphSpec): Graph {
  const nodes: GraphNode[] = [];
  const edges: [number, number][] = [];
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

  return { nodes, edges };
}

// Every room's neighbors, by id.
export function neighbors(graph: Graph): number[][] {
  const result = graph.nodes.map((): number[] => []);
  for (const [a, b] of graph.edges) {
    result[a].push(b);
    result[b].push(a);
  }
  return result;
}
