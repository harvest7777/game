import { describe, expect, it } from "vitest";
import type { Graph } from "./graph";
import { dungeonAscii, rasterize, reachable, isWalkable } from "./grid";
import { maskFromAscii } from "./mask";
import type { Placement } from "./place";
import type { Corridor } from "./route";

const PAIR: Graph = {
  nodes: [
    { id: 0, tag: "start", depth: 0, parent: null },
    { id: 1, tag: "goal", depth: 1, parent: 0 },
  ],
  edges: [[0, 1]],
};

const square = maskFromAscii(["..", ".."]);

// Two 2x2 rooms, two tiles apart, joined along their top row.
const placement: Placement = [
  { node: 0, x: 0, y: 0, mask: square },
  { node: 1, x: 4, y: 0, mask: square },
];
const corridors: Corridor[] = [
  {
    rooms: [0, 1],
    cells: [
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ],
  },
];

describe("rasterize", () => {
  it("draws rooms and corridors walled in, with padding around", () => {
    expect(dungeonAscii(rasterize(PAIR, placement, corridors))).toEqual([
      "          ",
      " ######## ",
      " #..,,..# ",
      " #..##..# ",
      " ######## ",
      "          ",
    ]);
  });

  it("records each room's floor and where corridors come in", () => {
    const map = rasterize(PAIR, placement, corridors);

    // Shifted 2 right and 2 down by the padding.
    expect(map.rooms[0].cells).toHaveLength(4);
    expect(map.rooms[0].entrances).toEqual([{ x: 3, y: 2 }]);
    expect(map.rooms[1].entrances).toEqual([{ x: 6, y: 2 }]);
    expect(map.roomAt[2 * map.width + 6]).toBe(1);
    expect(map.roomAt[2 * map.width + 4]).toBe(-1);
  });
});

describe("reachable", () => {
  it("walks from one room through the corridor to the other", () => {
    const map = rasterize(PAIR, placement, corridors);
    const reached = reachable(map, { x: 2, y: 2 }, isWalkable);
    expect(reached.size).toBe(10);
  });
});
