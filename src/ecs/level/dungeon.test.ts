import { describe, expect, it } from "vitest";
import type { DungeonDef } from "../../dungeon/definition";
import { testEnemy } from "../../testing/defs";
import { groundUnder, isWall } from "../tiles";
import { dungeonLevel, type DungeonRegistries } from "./dungeon";
import { levelTiles, loadLevel } from "./load";

const STONE = { art: "stone" };
const PLANKS = { art: "planks" };
const LAVA = { art: "lava", hazard: { damage: 10, every: 1 } };
const IMP = testEnemy();
const BOSS = testEnemy();

const BRICK = { top: "brick-top", side: "brick-side" };

const REGISTRIES: DungeonRegistries = {
  enemies: { imp: IMP, boss: BOSS },
  grounds: { stone: STONE, planks: PLANKS, lava: LAVA },
  walls: { brick: BRICK },
};

const DEF: DungeonDef = {
  name: "Test Dungeon",
  theme: { floor: "stone", corridor: "planks", liquid: "lava" },
  graph: { mainPath: [3, 4], branches: [0, 1], branchLength: [1, 1] },
  placement: { kind: "grow", gap: [3, 5] },
  corridors: { routers: [{ kind: "straight" }, { kind: "L" }], width: 2 },
  rooms: {
    start: [{ weight: 1, shape: { kind: "rect", w: [5, 6], h: [5, 6] } }],
    normal: [
      {
        weight: 1,
        shape: { kind: "ellipse", w: [9, 11], h: [9, 11] },
        features: [{ kind: "pool", coverage: [0.2, 0.2] }],
        spawns: [
          {
            rolls: [2, 2],
            pick: [{ enemy: "imp", weight: 1 }],
            placement: { kind: "scatter" },
          },
        ],
      },
    ],
    goal: [
      {
        weight: 1,
        shape: { kind: "rect", w: [9, 9], h: [9, 9] },
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

const SEEDS = Array.from({ length: 30 }, (_, i) => i);

describe("dungeonLevel", () => {
  it("builds a level the loader accepts", () => {
    for (const seed of SEEDS) {
      expect(() =>
        levelTiles(dungeonLevel(DEF, seed, REGISTRIES)),
      ).not.toThrow();
    }
  });

  it("names the level after the dungeon and its seed", () => {
    expect(dungeonLevel(DEF, 4, REGISTRIES).name).toBe("Test Dungeon (seed 4)");
  });

  it("draws each kind of cell as its theme's ground", () => {
    const level = dungeonLevel(DEF, 1, REGISTRIES);
    expect(level.legend["."]).toEqual({ ground: STONE });
    expect(level.legend[","]).toEqual({ ground: PLANKS });
    expect(level.legend["~"]).toEqual({ ground: LAVA });
  });

  it("when the theme has no accent, draws accent cells as floor", () => {
    expect(dungeonLevel(DEF, 1, REGISTRIES).legend["*"]).toEqual({
      ground: STONE,
    });
  });

  it("places the dungeon's enemies, as definitions, in the middle of their tiles", () => {
    for (const seed of SEEDS) {
      const level = dungeonLevel(DEF, seed, REGISTRIES);
      const { tiles } = levelTiles(level);
      expect(level.enemies!.filter((e) => e.enemy === BOSS)).toHaveLength(1);
      for (const { enemy, at } of level.enemies!) {
        expect([IMP, BOSS]).toContain(enemy);
        expect(at.x % 1).toBe(0.5);
        expect(isWall(tiles, Math.floor(at.x), Math.floor(at.y))).toBe(false);
      }
    }
  });

  it("loads into a world with characters arriving on the start room's floor", () => {
    const { world, spawn } = loadLevel(dungeonLevel(DEF, 2, REGISTRIES));
    expect(groundUnder(world.tiles, spawn)).toBe(STONE);
    expect(world.components.enemy.size).toBeGreaterThan(0);
  });

  it("fills the rock around the dungeon with void, not wall", () => {
    const level = dungeonLevel(DEF, 1, REGISTRIES);
    expect(level.legend[" "]).toEqual({ void: true });
    expect(level.map[0].trim()).toBe("");
  });

  it("without a themed wall, raises the default wall", () => {
    expect(dungeonLevel(DEF, 1, REGISTRIES).legend["#"]).toEqual({
      wall: true,
    });
  });

  it("raises the theme's wall", () => {
    const def = { ...DEF, theme: { ...DEF.theme, wall: "brick" } };
    expect(dungeonLevel(def, 1, REGISTRIES).legend["#"]).toEqual({
      wall: true,
      style: BRICK,
    });
  });

  it("throws on an id the registries don't have", () => {
    const registries = { ...REGISTRIES, enemies: { imp: IMP } };
    expect(() => dungeonLevel(DEF, 1, registries)).toThrow(
      'dungeon names unknown enemy "boss"',
    );
  });
});
