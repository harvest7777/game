import { describe, expect, it } from "vitest";
import { generateGraph, type Graph } from "./graph";
import { flood, isOn, key, maskFromAscii, onCells, type Cell } from "./mask";
import { boxOf, placeRooms, type Placement } from "./place";
import { seeded } from "./rng";
import { routeCorridors, widen, type Corridor } from "./route";
import { makeShape } from "./shapes";

// Two rooms joined by one edge.
const PAIR: Graph = {
  nodes: [
    { id: 0, tag: "start", depth: 0, parent: null },
    { id: 1, tag: "goal", depth: 1, parent: 0 },
  ],
  edges: [[0, 1]],
};

const square = maskFromAscii(["...", "...", "..."]);

const sorted = (cells: Cell[]) =>
  [...cells].sort((a, b) => a.x - b.x || a.y - b.y);

// Whether every room and corridor cell joins up, walking from room 0.
function connected(placement: Placement, corridors: Corridor[]): boolean {
  const open = new Set<string>();
  for (const room of placement) {
    for (let y = 0; y < room.mask.height; y++) {
      for (let x = 0; x < room.mask.width; x++) {
        if (isOn(room.mask, x, y))
          open.add(key({ x: x + room.x, y: y + room.y }));
      }
    }
  }
  for (const corridor of corridors) {
    for (const cell of corridor.cells) open.add(key(cell));
  }
  const [first] = onCells(placement[0].mask);
  const start = { x: first.x + placement[0].x, y: first.y + placement[0].y };
  return flood(start, (x, y) => open.has(key({ x, y }))).length === open.size;
}

describe("straight", () => {
  it("runs along a row both rooms share, covering only the gap", () => {
    // Room 1 sits 3 tiles east, one row lower: they share rows 1 and 2.
    const placement: Placement = [
      { node: 0, x: 0, y: 0, mask: square },
      { node: 1, x: 6, y: 1, mask: square },
    ];

    const [corridor] = routeCorridors(seeded(1), PAIR, placement, {
      routers: [{ kind: "straight" }],
      width: 1,
    })!;

    const row = corridor.cells[0].y;
    expect([1, 2]).toContain(row);
    expect(sorted(corridor.cells)).toEqual(
      [3, 4, 5].map((x) => ({ x, y: row })),
    );
  });

  it("when the rooms share no row or column, can't join them", () => {
    const placement: Placement = [
      { node: 0, x: 0, y: 0, mask: square },
      { node: 1, x: 6, y: 6, mask: square },
    ];
    const corridors = routeCorridors(seeded(1), PAIR, placement, {
      routers: [{ kind: "straight" }],
      width: 1,
    });
    expect(corridors).toBeNull();
  });
});

describe("L", () => {
  it("joins rooms that share no row or column with one bend", () => {
    const placement: Placement = [
      { node: 0, x: 0, y: 0, mask: square },
      { node: 1, x: 6, y: 6, mask: square },
    ];

    const corridors = routeCorridors(seeded(1), PAIR, placement, {
      routers: [{ kind: "straight" }, { kind: "L" }],
      width: 1,
    })!;

    expect(connected(placement, corridors)).toBe(true);
    // 13 cells from (1, 1) to (7, 7), 4 of them already room floor.
    expect(corridors[0].cells).toHaveLength(9);
  });
});

describe("widen", () => {
  it("covers `width` cells across, centered on the line", () => {
    expect(sorted(widen([{ x: 5, y: 5 }], 3))).toEqual(
      sorted([4, 5, 6].flatMap((x) => [4, 5, 6].map((y) => ({ x, y })))),
    );
  });
});

describe("routeCorridors", () => {
  const SEEDS = Array.from({ length: 200 }, (_, i) => i);

  function attempt(seed: number, width: number) {
    const rng = seeded(seed);
    const graph = generateGraph(rng, {
      mainPath: [5, 8],
      branches: [1, 3],
      branchLength: [1, 2],
    });
    const masks = graph.nodes.map(() =>
      makeShape(rng, { kind: "cave", w: [10, 14], h: [10, 14] }),
    );
    if (masks.some((m) => !m)) return null;
    const placement = placeRooms(
      rng,
      graph,
      masks.map((m) => m!),
      {
        kind: "grow",
        gap: [3, 6],
      },
    );
    if (!placement) return null;
    const corridors = routeCorridors(rng, graph, placement, {
      routers: [{ kind: "straight" }, { kind: "L" }],
      width,
    });
    return corridors && { graph, placement, corridors };
  }

  it("joins every room up", () => {
    for (const seed of SEEDS) {
      const result = attempt(seed, 2);
      if (!result) continue;
      expect(connected(result.placement, result.corridors)).toBe(true);
    }
  });

  it("never runs a corridor into a room it doesn't join", () => {
    for (const seed of SEEDS) {
      const result = attempt(seed, 3);
      if (!result) continue;
      for (const { rooms, cells } of result.corridors) {
        result.placement.forEach((room, i) => {
          if (rooms.includes(i)) return;
          const box = boxOf(room);
          for (const { x, y } of cells) {
            const inside =
              x >= box.x &&
              y >= box.y &&
              x < box.x + box.w &&
              y < box.y + box.h;
            expect(inside).toBe(false);
          }
        });
      }
    }
  });

  it("usually routes every corridor", () => {
    const routed = SEEDS.filter((seed) => attempt(seed, 2));
    expect(routed.length).toBeGreaterThan(SEEDS.length * 0.5);
  });
});
