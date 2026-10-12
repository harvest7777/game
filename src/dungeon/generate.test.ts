import { describe, expect, it } from "vitest";
import {
  generateDungeon,
  type DungeonSpec,
  type StageTimings,
} from "./generate";
import { dungeonAscii, isSafe, kindAt, reachable } from "./grid";
import { key } from "./mask";

const SPEC: DungeonSpec = {
  graph: {
    mainPath: [5, 8],
    branches: [1, 3],
    branchLength: [1, 2],
    loops: [
      { kind: "shortcut", count: [0, 1], span: [2, 3] },
      { kind: "detour", count: [0, 1], span: [2, 2], length: [1, 2] },
    ],
  },
  placement: { kind: "grow", gap: [3, 6] },
  corridors: {
    routers: [{ kind: "straight" }, { kind: "L" }, { kind: "astar" }],
    width: 2,
  },
  rooms: {
    start: [{ weight: 1, shape: { kind: "rect", w: [6, 8], h: [6, 8] } }],
    normal: [
      {
        weight: 2,
        shape: { kind: "cave", w: [12, 16], h: [12, 16] },
        features: [{ kind: "pool", coverage: [0.1, 0.25] }],
        spawns: [
          {
            rolls: [2, 4],
            pick: [{ enemy: "imp", weight: 1 }],
            placement: { kind: "scatter" },
          },
        ],
      },
      {
        weight: 1,
        shape: { kind: "ellipse", w: [9, 13], h: [9, 13] },
        features: [{ kind: "pillars", spacing: 3 }],
      },
    ],
    goal: [
      {
        weight: 1,
        shape: { kind: "ellipse", w: [15, 17], h: [15, 17] },
        features: [{ kind: "border", width: 1 }],
        spawns: [
          {
            rolls: [1, 1],
            pick: [{ enemy: "boss", weight: 1 }],
            placement: { kind: "center" },
          },
        ],
      },
    ],
  },
};

const SEEDS = Array.from({ length: 200 }, (_, i) => i);
const dungeons = SEEDS.map((seed) => generateDungeon(SPEC, seed));

const show = (d: (typeof dungeons)[number]) =>
  `seed ${d.seed}\n${dungeonAscii(d.map).join("\n")}`;

describe("generateDungeon", () => {
  it("when given the same seed, builds the same dungeon", () => {
    expect(generateDungeon(SPEC, 7)).toEqual(generateDungeon(SPEC, 7));
  });

  it("builds every seed tried", () => {
    expect(dungeons).toHaveLength(SEEDS.length);
  });

  it("can reach every room from the start without stepping in liquid", () => {
    for (const d of dungeons) {
      const reached = reachable(d.map, d.start, isSafe);
      for (const room of d.map.rooms) {
        const reachedRoom = room.cells.some((c) => reached.has(key(c)));
        expect(reachedRoom, show(d)).toBe(true);
      }
    }
  });

  it("starts characters on safe floor in the start room", () => {
    for (const d of dungeons) {
      const { x, y } = d.start;
      expect(isSafe(kindAt(d.map, x, y))).toBe(true);
      expect(d.map.roomAt[y * d.map.width + x]).toBe(0);
    }
  });

  it("builds start, goal and normal rooms from their own specs", () => {
    for (const d of dungeons) {
      d.map.rooms.forEach((room, i) => {
        const tag = room.node.tag === "deadEnd" ? "normal" : room.node.tag;
        expect(SPEC.rooms[tag]).toContain(d.roomSpecs[i]);
      });
    }
  });

  it("puts each spawn on safe floor in its own room", () => {
    for (const d of dungeons) {
      for (const { at, room } of d.spawns) {
        expect(isSafe(kindAt(d.map, at.x, at.y)), show(d)).toBe(true);
        expect(d.map.roomAt[at.y * d.map.width + at.x]).toBe(room);
      }
    }
  });

  it("puts the boss in the goal room", () => {
    for (const d of dungeons) {
      const bosses = d.spawns.filter((s) => s.enemy === "boss");
      expect(bosses).toHaveLength(1);
      expect(d.map.rooms[bosses[0].room].node.tag).toBe("goal");
    }
  });

  it("when nothing fits, says which stages failed", () => {
    const cramped: DungeonSpec = {
      ...SPEC,
      corridors: { routers: [{ kind: "straight" }], width: 30 },
    };
    expect(() => generateDungeon(cramped, 1, 3)).toThrow(
      /seed 1 in 3 attempts: \{.*"corridors":\d/,
    );
  });

  it("when given timings, records how long each stage took", () => {
    const timings: StageTimings = {};
    generateDungeon(SPEC, 1, undefined, timings);
    expect(Object.keys(timings).sort()).toEqual(
      [
        "corridors",
        "features",
        "graph",
        "placement",
        "populate",
        "rasterize",
        "reachability",
        "shapes",
      ].sort(),
    );
  });
});
