import { describe, expect, it } from "vitest";
import type { Graph } from "./graph";
import { kindAt, rasterize, setKind, type DungeonMap } from "./grid";
import { key, maskFromAscii } from "./mask";
import { populateRoom, type SpawnGroup } from "./populate";
import { seeded } from "./rng";

const SOLO: Graph = {
  nodes: [{ id: 0, tag: "start", depth: 0, parent: null }],
  edges: [],
  loops: [],
};

const SEEDS = Array.from({ length: 50 }, (_, i) => i);

// One `size` by `size` room with no entrances, starting at (2, 2).
function room(size: number): DungeonMap {
  const mask = maskFromAscii(
    Array.from({ length: size }, () => ".".repeat(size)),
  );
  return rasterize(SOLO, [{ node: 0, x: 0, y: 0, mask }], []);
}

const imps = (placement: SpawnGroup["placement"], rolls = 4): SpawnGroup => ({
  rolls: [rolls, rolls],
  pick: [{ enemy: "imp", weight: 1 }],
  placement,
});

describe("populateRoom", () => {
  it("rolls each pick, bringing `count` along each time", () => {
    const map = room(9);
    const group: SpawnGroup = {
      rolls: [2, 2],
      pick: [{ enemy: "brute", weight: 1, count: [3, 3] }],
      placement: { kind: "scatter", spacing: 1 },
    };

    const spawns = populateRoom(seeded(1), map, map.rooms[0], [group]);

    expect(spawns.map((s) => s.enemy)).toEqual(Array(6).fill("brute"));
  });

  it("never puts two spawns on one cell, across groups", () => {
    for (const seed of SEEDS) {
      const map = room(5);
      const spawns = populateRoom(seeded(seed), map, map.rooms[0], [
        imps({ kind: "center" }, 5),
        imps({ kind: "center" }, 5),
      ]);
      expect(new Set(spawns.map((s) => key(s.at))).size).toBe(spawns.length);
    }
  });

  it("only places on safe floor", () => {
    for (const seed of SEEDS) {
      const map = room(7);
      // Lava over the left half.
      for (const c of map.rooms[0].cells) {
        if (c.x < 6) setKind(map, c.x, c.y, "liquid");
      }
      const spawns = populateRoom(seeded(seed), map, map.rooms[0], [
        imps({ kind: "scatter", spacing: 1 }, 8),
      ]);
      for (const { at } of spawns) {
        expect(kindAt(map, at.x, at.y)).toBe("floor");
      }
    }
  });

  it("leaves reserved cells empty", () => {
    const map = room(3);
    const middle = { x: 3, y: 3 };
    const spawns = populateRoom(
      seeded(1),
      map,
      map.rooms[0],
      [imps({ kind: "center" }, 1)],
      [middle],
    );
    expect(spawns[0].at).not.toEqual(middle);
  });

  it("when there isn't room for every spawn, places as many as fit", () => {
    const map = room(2);
    const spawns = populateRoom(seeded(1), map, map.rooms[0], [
      imps({ kind: "center" }, 10),
    ]);
    expect(spawns).toHaveLength(4);
  });
});

describe("scatter", () => {
  it("keeps spawns `spacing` tiles apart", () => {
    for (const seed of SEEDS) {
      const map = room(12);
      const spawns = populateRoom(seeded(seed), map, map.rooms[0], [
        imps({ kind: "scatter", spacing: 3 }, 6),
      ]);
      for (const a of spawns) {
        for (const b of spawns) {
          if (a === b) continue;
          const apart = Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y);
          expect(apart).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});

describe("center", () => {
  it("puts the first spawn in the middle of the room", () => {
    const map = room(5);
    const [boss] = populateRoom(seeded(1), map, map.rooms[0], [
      imps({ kind: "center" }, 1),
    ]);
    // The room's middle cell, shifted 2 by padding.
    expect(boss.at).toEqual({ x: 4, y: 4 });
  });
});

describe("ring", () => {
  it("spreads spawns around the middle, `radius` out", () => {
    const map = room(11);
    const spawns = populateRoom(seeded(1), map, map.rooms[0], [
      imps({ kind: "ring", radius: 4 }, 4),
    ]);
    // Middle cell (7, 7), so 4 out each way.
    expect(spawns.map((s) => s.at)).toEqual([
      { x: 11, y: 7 },
      { x: 7, y: 11 },
      { x: 3, y: 7 },
      { x: 7, y: 3 },
    ]);
  });
});

describe("cluster", () => {
  it("packs spawns within `radius` of one another's middle", () => {
    for (const seed of SEEDS) {
      const map = room(14);
      const spawns = populateRoom(seeded(seed), map, map.rooms[0], [
        imps({ kind: "cluster", radius: 2 }, 5),
      ]);
      expect(spawns).toHaveLength(5);
      for (const a of spawns) {
        for (const b of spawns) {
          // Both within 2 of the same spot, so within 4 of each other.
          expect(
            Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y),
          ).toBeLessThanOrEqual(4);
        }
      }
    }
  });
});
