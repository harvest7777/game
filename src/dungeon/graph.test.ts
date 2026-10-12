import { describe, expect, it } from "vitest";
import {
  generateGraph,
  MAX_DEGREE,
  neighbors,
  type Graph,
  type GraphSpec,
} from "./graph";
import { seeded } from "./rng";

const SPEC: GraphSpec = {
  mainPath: [5, 8],
  branches: [1, 4],
  branchLength: [1, 3],
};

const SEEDS = Array.from({ length: 200 }, (_, i) => i);

// Rooms from start to goal, following parents back from the goal.
function mainPath(graph: Graph): number[] {
  const goal = graph.nodes.find((node) => node.tag === "goal")!;
  const path = [goal.id];
  while (graph.nodes[path[0]].parent !== null) {
    path.unshift(graph.nodes[path[0]].parent!);
  }
  return path;
}

describe("generateGraph", () => {
  it("when given the same seed, builds the same graph", () => {
    expect(generateGraph(seeded(1), SPEC)).toEqual(
      generateGraph(seeded(1), SPEC),
    );
  });

  it("has one start, at depth 0, and one goal", () => {
    for (const seed of SEEDS) {
      const { nodes } = generateGraph(seeded(seed), SPEC);
      expect(nodes.filter((n) => n.tag === "start")).toEqual([
        { id: 0, tag: "start", depth: 0, parent: null },
      ]);
      expect(nodes.filter((n) => n.tag === "goal")).toHaveLength(1);
    }
  });

  it("runs a main path from start to goal as long as the spec says", () => {
    for (const seed of SEEDS) {
      const path = mainPath(generateGraph(seeded(seed), SPEC));
      expect(path[0]).toBe(0);
      expect(path.length).toBeGreaterThanOrEqual(SPEC.mainPath[0]);
      expect(path.length).toBeLessThanOrEqual(SPEC.mainPath[1]);
    }
  });

  it("is a tree: one edge into every room but the start", () => {
    for (const seed of SEEDS) {
      const graph = generateGraph(seeded(seed), SPEC);
      expect(graph.edges).toHaveLength(graph.nodes.length - 1);
      for (const [parent, child] of graph.edges) {
        expect(graph.nodes[child].parent).toBe(parent);
        expect(graph.nodes[child].depth).toBe(graph.nodes[parent].depth + 1);
      }
    }
  });

  it("ends every branch in a dead end, and nothing else", () => {
    for (const seed of SEEDS) {
      const graph = generateGraph(seeded(seed), SPEC);
      const around = neighbors(graph);
      for (const node of graph.nodes) {
        const isLeaf = node.tag !== "start" && around[node.id].length === 1;
        expect(node.tag === "deadEnd" || node.tag === "goal").toBe(isLeaf);
      }
    }
  });

  it("never joins a room to more than MAX_DEGREE others", () => {
    const crowded: GraphSpec = {
      mainPath: [2, 2],
      branches: [20, 20],
      branchLength: [1, 1],
    };
    const graph = generateGraph(seeded(3), crowded);
    for (const around of neighbors(graph)) {
      expect(around.length).toBeLessThanOrEqual(MAX_DEGREE);
    }
  });

  it("when the main path is too short, still has a start and a goal", () => {
    const tiny: GraphSpec = {
      mainPath: [1, 1],
      branches: [0, 0],
      branchLength: [1, 1],
    };
    const { nodes } = generateGraph(seeded(1), tiny);
    expect(nodes.map((n) => n.tag)).toEqual(["start", "goal"]);
  });

  it("keeps loops out of the tree", () => {
    const graph = generateGraph(seeded(1), {
      ...SPEC,
      loops: [{ kind: "shortcut", count: [2, 2], span: [2, 2] }],
    });
    expect(graph.edges).toHaveLength(graph.nodes.length - 1);
  });
});

describe("loops", () => {
  const LONG: GraphSpec = {
    mainPath: [9, 9],
    branches: [0, 0],
    branchLength: [1, 1],
  };
  const mainIds = (graph: Graph) => mainPath(graph);
  const degrees = (graph: Graph) => {
    const degree = graph.nodes.map(() => 0);
    for (const [a, b] of [...graph.edges, ...graph.loops]) {
      degree[a]++;
      degree[b]++;
    }
    return degree;
  };

  it("a shortcut joins main path rooms `span` apart, never the goal", () => {
    for (const seed of SEEDS) {
      const graph = generateGraph(seeded(seed), {
        ...LONG,
        loops: [{ kind: "shortcut", count: [1, 2], span: [2, 3] }],
      });
      const main = mainIds(graph);
      expect(graph.loops.length).toBeGreaterThan(0);
      for (const [a, b] of graph.loops) {
        const apart = main.indexOf(b) - main.indexOf(a);
        expect(apart).toBeGreaterThanOrEqual(2);
        expect(apart).toBeLessThanOrEqual(3);
        expect(graph.nodes[b].tag).not.toBe("goal");
      }
    }
  });

  it("a detour leaves the main path and rejoins it `span` rooms on", () => {
    for (const seed of SEEDS) {
      const graph = generateGraph(seeded(seed), {
        ...LONG,
        loops: [
          { kind: "detour", count: [1, 1], span: [3, 3], length: [2, 2] },
        ],
      });
      const main = mainIds(graph);
      const [[a, b]] = graph.loops;
      // One end is on the main path, the other the detour's last room.
      const [onMain, last] = main.includes(a) ? [a, b] : [b, a];
      const first = graph.nodes[last].parent!;
      const leftFrom = graph.nodes[first].parent!;
      expect(main.indexOf(onMain) - main.indexOf(leftFrom)).toBe(3);
      expect(graph.nodes.length).toBe(9 + 2);
    }
  });

  it("never joins a room to more than MAX_DEGREE others, loops included", () => {
    for (const seed of SEEDS) {
      const graph = generateGraph(seeded(seed), {
        ...LONG,
        branches: [6, 6],
        loops: [
          { kind: "shortcut", count: [4, 4], span: [2, 2] },
          { kind: "detour", count: [4, 4], span: [2, 3], length: [1, 1] },
        ],
      });
      for (const degree of degrees(graph)) {
        expect(degree).toBeLessThanOrEqual(MAX_DEGREE);
      }
    }
  });
});
