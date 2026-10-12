import { describe, expect, it } from "vitest";
import { decorateRoom, isWhole } from "./features";
import type { Graph } from "./graph";
import { dungeonAscii, kindAt, rasterize, type DungeonMap } from "./grid";
import { maskFromAscii, type Mask } from "./mask";
import { seeded } from "./rng";

const PAIR: Graph = {
  nodes: [
    { id: 0, tag: "start", depth: 0, parent: null },
    { id: 1, tag: "goal", depth: 1, parent: 0 },
  ],
  edges: [[0, 1]],
  loops: [],
};

const SEEDS = Array.from({ length: 100 }, (_, i) => i);

// A `width` by `height` room 1, with a 1-tile room 0 two tiles off its
// left, joined by a corridor into room 1's middle row.
function roomWithDoor(width: number, height: number): DungeonMap {
  const big: Mask = maskFromAscii(
    Array.from({ length: height }, () => ".".repeat(width)),
  );
  const middle = Math.floor(height / 2);
  return rasterize(
    PAIR,
    [
      { node: 0, x: 0, y: middle, mask: maskFromAscii(["."]) },
      { node: 1, x: 3, y: 0, mask: big },
    ],
    [
      {
        rooms: [0, 1],
        cells: [
          { x: 1, y: middle },
          { x: 2, y: middle },
        ],
      },
    ],
  );
}

const count = (map: DungeonMap, kind: string) =>
  map.rooms[1].cells.filter((c) => kindAt(map, c.x, c.y) === kind).length;

describe("pool", () => {
  it("covers about the share of the room asked for", () => {
    const map = roomWithDoor(10, 10);

    decorateRoom(seeded(1), map, map.rooms[1], [
      { kind: "pool", coverage: [0.2, 0.2] },
    ]);

    // A fifth of 100 cells.
    expect(count(map, "liquid")).toBe(20);
  });

  it("keeps 2 tiles clear around entrances", () => {
    for (const seed of SEEDS) {
      const map = roomWithDoor(10, 10);
      const room = map.rooms[1];

      decorateRoom(seeded(seed), map, room, [
        { kind: "pool", coverage: [0.6, 0.6] },
      ]);

      const [door] = room.entrances;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = 0; dx <= 2; dx++) {
          expect(kindAt(map, door.x + dx, door.y + dy)).not.toBe("liquid");
        }
      }
    }
  });

  it("can paint another kind of cell", () => {
    const map = roomWithDoor(8, 8);
    decorateRoom(seeded(2), map, map.rooms[1], [
      { kind: "pool", coverage: [0.1, 0.1], cell: "accent" },
    ]);
    expect(count(map, "accent")).toBeGreaterThan(0);
    expect(count(map, "liquid")).toBe(0);
  });
});

describe("pillars", () => {
  it("stands walls in a grid, only where floor surrounds them", () => {
    const map = roomWithDoor(9, 9);

    decorateRoom(seeded(3), map, map.rooms[1], [
      { kind: "pillars", spacing: 3 },
    ]);

    const pillars = map.rooms[1].cells.filter(
      (c) => kindAt(map, c.x, c.y) === "wall",
    );
    expect(pillars.length).toBeGreaterThan(0);
    for (const a of pillars) {
      for (const b of pillars) {
        expect(Math.abs(a.x - b.x) % 3).toBe(0);
        expect(Math.abs(a.y - b.y) % 3).toBe(0);
      }
    }
  });
});

describe("border", () => {
  it("turns the room's edge to accent, leaving the middle", () => {
    const map = roomWithDoor(5, 5);

    decorateRoom(seeded(1), map, map.rooms[1], [{ kind: "border", width: 1 }]);

    // Rows of the room (x 5 to 9 after padding). The corridor comes into
    // the middle of the left edge, which stays clear for 2 tiles around.
    const rows = dungeonAscii(map)
      .slice(2, 7)
      .map((row) => row.slice(5, 10));
    expect(rows).toEqual(["...**", "....*", "....*", "....*", "...**"]);
  });

  it("can be liquid without ever blocking a way in", () => {
    for (const seed of SEEDS) {
      const map = roomWithDoor(9, 9);
      const room = map.rooms[1];

      decorateRoom(seeded(seed), map, room, [
        { kind: "border", width: 2, cell: "liquid" },
      ]);

      expect(count(map, "liquid")).toBeGreaterThan(0);
      expect(isWhole(map, room)).toBe(true);
    }
  });
});

describe("decorateRoom", () => {
  it("never cuts a room in two or blocks its entrances", () => {
    for (const seed of SEEDS) {
      // A long thin room, easy to cut across.
      const map = roomWithDoor(16, 3);
      const room = map.rooms[1];

      decorateRoom(seeded(seed), map, room, [
        { kind: "pool", coverage: [0.3, 0.5] },
        { kind: "pillars", spacing: 2 },
      ]);

      expect(isWhole(map, room), dungeonAscii(map).join("\n")).toBe(true);
    }
  });
});
