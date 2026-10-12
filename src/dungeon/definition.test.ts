import { describe, expect, it } from "vitest";
import { dungeonDef, LIMITS, parseDungeonDef } from "./definition";

// The smallest valid dungeon, as JSON would give it.
function minimal(): Record<string, unknown> {
  const room = { weight: 1, shape: { kind: "rect", w: [5, 5], h: [5, 5] } };
  return {
    name: "Test Dungeon",
    theme: { floor: "stone", corridor: "stone" },
    graph: { mainPath: [3, 3], branches: [0, 0], branchLength: [1, 1] },
    placement: { kind: "grow", gap: [3, 4] },
    corridors: { routers: [{ kind: "L" }], width: 2 },
    rooms: { start: [room], normal: [room], goal: [room] },
  };
}

const errorsOf = (value: unknown, known = {}) => {
  const result = parseDungeonDef(value, known);
  return result.ok ? [] : result.errors;
};

describe("parseDungeonDef", () => {
  it("accepts a valid dungeon as it is", () => {
    const value = minimal();
    expect(parseDungeonDef(value)).toEqual({ ok: true, def: value });
  });

  it("accepts every optional field", () => {
    const value = minimal();
    value.theme = {
      floor: "a",
      corridor: "b",
      liquid: "c",
      accent: "d",
      wall: "e",
    };
    value.rooms = {
      ...(value.rooms as object),
      deadEnd: [
        {
          weight: 2,
          shape: {
            kind: "cave",
            w: [10, 12],
            h: [10, 12],
            fill: 0.6,
            smoothing: 3,
          },
          features: [
            { kind: "pool", coverage: [0.1, 0.2], cell: "liquid" },
            { kind: "pillars", spacing: 3 },
            { kind: "border", width: 1, cell: "accent" },
          ],
          spawns: [
            {
              rolls: [1, 2],
              pick: [{ enemy: "imp", weight: 1, count: [2, 3] }],
              placement: { kind: "ring", radius: 3 },
            },
          ],
        },
      ],
    };
    expect(errorsOf(value)).toEqual([]);
  });

  it("accepts loops", () => {
    const value = minimal();
    value.graph = {
      mainPath: [6, 6],
      branches: [0, 0],
      branchLength: [1, 1],
      loops: [
        { kind: "shortcut", count: [1, 1], span: [2, 3] },
        { kind: "detour", count: [0, 1], span: [2, 2], length: [1, 2] },
      ],
    };
    expect(errorsOf(value)).toEqual([]);
  });

  it("won't take a loop that skips nothing", () => {
    const value = minimal();
    value.graph = {
      mainPath: [6, 6],
      branches: [0, 0],
      branchLength: [1, 1],
      loops: [{ kind: "shortcut", count: [1, 1], span: [1, 2] }],
    };
    expect(errorsOf(value)).toEqual([
      "graph.loops[0].span[0]: should be at least 2",
    ]);
  });

  it("when it isn't an object, says so", () => {
    expect(errorsOf("dungeon")).toEqual(["dungeon: should be an object"]);
  });

  it("names missing and unknown fields", () => {
    const value = minimal();
    delete value.name;
    value.colour = "red";
    expect(errorsOf(value)).toEqual([
      'dungeon: is missing "name"',
      'dungeon: has unknown field "colour"',
    ]);
  });

  it("points at the exact field that's wrong", () => {
    const value = minimal();
    (value.rooms as { normal: unknown[] }).normal.push({
      weight: 1,
      shape: { kind: "ellipse", w: [9, 4], h: [3, 3.5] },
    });
    expect(errorsOf(value)).toEqual([
      "rooms.normal[1].shape.w: min is more than max",
      "rooms.normal[1].shape.h[1]: should be a whole number",
    ]);
  });

  it("names the kinds it knows when given one it doesn't", () => {
    const value = minimal();
    value.placement = { kind: "scatter" };
    expect(errorsOf(value)).toEqual(["placement.kind: should be one of grow"]);
  });

  it("refuses numbers big enough to hang the game", () => {
    const value = minimal();
    value.graph = {
      mainPath: [3, 500],
      branches: [0, 0],
      branchLength: [1, 1],
    };
    (value.rooms as { start: unknown[] }).start = [
      { weight: 1, shape: { kind: "cave", w: [10, 1000], h: [10, 10] } },
    ];
    expect(errorsOf(value)).toEqual([
      `graph.mainPath[1]: should be at most ${LIMITS.mainPath}`,
      `rooms.start[0].shape.w[1]: should be at most ${LIMITS.roomSize}`,
    ]);
  });

  it("checks each kind's own fields", () => {
    const value = minimal();
    value.corridors = { routers: [{ kind: "straight", wiggle: 2 }], width: 0 };
    expect(errorsOf(value)).toEqual([
      'corridors.routers[0]: has unknown field "wiggle"',
      "corridors.width: should be at least 1",
    ]);
  });

  it("when given known ids, rejects ids that aren't among them", () => {
    const value = minimal();
    (value.rooms as { goal: unknown[] }).goal = [
      {
        weight: 1,
        shape: { kind: "rect", w: [5, 5], h: [5, 5] },
        spawns: [
          {
            rolls: [1, 1],
            pick: [{ enemy: "malphas", weight: 1 }],
            placement: { kind: "center" },
          },
        ],
      },
    ];
    expect(errorsOf(value, { enemies: ["imp"], grounds: ["stone"] })).toEqual([
      'rooms.goal[0].spawns[0].pick[0].enemy: unknown id "malphas"',
    ]);
  });

  it("checks the theme's wall against known walls, not grounds", () => {
    const value = minimal();
    value.theme = { floor: "stone", corridor: "stone", wall: "brick" };
    expect(
      errorsOf(value, { grounds: ["stone", "brick"], walls: ["marble"] }),
    ).toEqual(['theme.wall: unknown id "brick"']);
  });

  it("only lets features paint cells something can stand on", () => {
    const value = minimal();
    (value.rooms as { start: unknown[] }).start = [
      {
        weight: 1,
        shape: { kind: "rect", w: [5, 5], h: [5, 5] },
        features: [{ kind: "pool", coverage: [0.1, 0.1], cell: "void" }],
      },
    ];
    expect(errorsOf(value)).toEqual([
      "rooms.start[0].features[0].cell: should be one of floor, corridor, liquid, accent",
    ]);
  });
});

describe("dungeonDef", () => {
  it("throws listing every error", () => {
    const value = minimal();
    delete value.graph;
    delete value.corridors;
    expect(() => dungeonDef(value)).toThrow(
      'invalid dungeon:\n  dungeon: is missing "graph"\n  dungeon: is missing "corridors"',
    );
  });
});
