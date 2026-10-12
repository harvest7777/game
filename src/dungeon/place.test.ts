import { describe, expect, it } from "vitest";
import { generateGraph, type GraphSpec } from "./graph";
import { boxOf, grow, overlaps, placeRooms, type PlacementSpec } from "./place";
import { seeded } from "./rng";
import { makeShape, type ShapeSpec } from "./shapes";

const GRAPH: GraphSpec = {
  mainPath: [5, 8],
  branches: [1, 3],
  branchLength: [1, 2],
};
const SHAPE: ShapeSpec = { kind: "ellipse", w: [6, 12], h: [6, 12] };
const SPEC: PlacementSpec = { kind: "grow", gap: [3, 6] };
const SEEDS = Array.from({ length: 200 }, (_, i) => i);

function attempt(seed: number) {
  const rng = seeded(seed);
  const graph = generateGraph(rng, GRAPH);
  const masks = graph.nodes.map(() => makeShape(rng, SHAPE)!);
  return { graph, placement: placeRooms(rng, graph, masks, SPEC) };
}

describe("grow", () => {
  it("when given the same seed, places rooms the same way", () => {
    expect(attempt(4)).toEqual(attempt(4));
  });

  it("places every room, starting with the start room at the origin", () => {
    for (const seed of SEEDS) {
      const { graph, placement } = attempt(seed);
      if (!placement) continue;
      expect(placement).toHaveLength(graph.nodes.length);
      expect(placement[0]).toMatchObject({ x: 0, y: 0 });
    }
  });

  it("leaves at least a tile between any two rooms", () => {
    for (const seed of SEEDS) {
      const { placement } = attempt(seed);
      if (!placement) continue;
      placement.forEach((a, i) =>
        placement.slice(i + 1).forEach((b) => {
          expect(overlaps(grow(boxOf(a), 1), boxOf(b))).toBe(false);
        }),
      );
    }
  });

  it("puts each room `gap` tiles off a side of the room it's reached from", () => {
    for (const seed of SEEDS) {
      const { graph, placement } = attempt(seed);
      if (!placement) continue;
      for (const node of graph.nodes.slice(1)) {
        const a = boxOf(placement[node.parent!]);
        const b = boxOf(placement[node.id]);
        const apart = Math.max(
          b.x - (a.x + a.w),
          a.x - (b.x + b.w),
          b.y - (a.y + a.h),
          a.y - (b.y + b.h),
        );
        expect(apart).toBeGreaterThanOrEqual(3);
        expect(apart).toBeLessThanOrEqual(6);
      }
    }
  });

  it("usually fits every room", () => {
    const placed = SEEDS.filter((seed) => attempt(seed).placement);
    expect(placed.length).toBeGreaterThan(SEEDS.length * 0.8);
  });
});
