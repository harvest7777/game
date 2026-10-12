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
});
