import { describe, expect, it } from "vitest";
import { testEnemy } from "../../testing/defs";
import { groundUnder, isWall } from "../tiles";
import type { LevelDef } from "./definitions";
import { levelTiles, loadLevel } from "./load";

const FLOOR = { art: "floor" };
const MUD = { art: "mud", speedScale: 0.5 };
const LEGEND: LevelDef["legend"] = {
  "#": { wall: true },
  ".": { ground: FLOOR },
  m: { ground: MUD },
  P: { ground: FLOOR, spawn: true },
};

const ROOM: LevelDef = {
  name: "room",
  legend: LEGEND,
  map: [
    "#####", //
    "#.m.#",
    "#.P.#",
    "#####",
  ],
};

describe("levelTiles", () => {
  it("makes a tile for each character, walls where the map says", () => {
    const { tiles } = levelTiles(ROOM);
    expect([tiles.width, tiles.height]).toEqual([5, 4]);
    expect(isWall(tiles, 0, 0)).toBe(true);
    expect(isWall(tiles, 1, 1)).toBe(false);
  });

  it("gives each tile its legend's ground", () => {
    const { tiles } = levelTiles(ROOM);
    expect(groundUnder(tiles, { x: 1.5, y: 1.5 })).toBe(FLOOR);
    expect(groundUnder(tiles, { x: 2.5, y: 1.5 })).toBe(MUD);
  });

  it("spawns at the center of the P tile, which is floor", () => {
    const { tiles, spawn } = levelTiles(ROOM);
    expect(spawn).toEqual({ x: 2.5, y: 2.5 });
    expect(isWall(tiles, 2, 2)).toBe(false);
  });

  it("refuses rows of different lengths", () => {
    const map = ["###", "#P", "###"];
    expect(() => levelTiles({ name: "ragged", legend: LEGEND, map })).toThrow(
      /row 1/,
    );
  });

  it("refuses unknown tiles", () => {
    const map = ["#?#", "#P#"];
    expect(() => levelTiles({ name: "odd", legend: LEGEND, map })).toThrow(
      /"\?"/,
    );
  });

  it("needs exactly one spawn", () => {
    expect(() =>
      levelTiles({ name: "none", legend: LEGEND, map: ["#.#"] }),
    ).toThrow();
    expect(() =>
      levelTiles({ name: "two", legend: LEGEND, map: ["PP"] }),
    ).toThrow();
  });
});

describe("loadLevel", () => {
  it("builds a world on the level's map, with its enemies placed", () => {
    const slime = testEnemy();
    const { world, spawn } = loadLevel({
      ...ROOM,
      enemies: [{ enemy: slime, at: { x: 1.5, y: 1.5 } }],
    });

    expect(world.tiles.width).toBe(5);
    expect(spawn).toEqual({ x: 2.5, y: 2.5 });
    const [[enemy, e]] = [...world.components.enemy];
    expect(e.def).toBe(slime);
    expect(world.components.position.get(enemy)).toEqual({ x: 1.5, y: 1.5 });
  });
});

describe("loadLevel portals", () => {
  it("places the level's portals", () => {
    const portal = {
      label: "Out",
      to: "nexus",
      sprite: { art: { kind: "static", file: "portal" } },
    } as const;
    const { world } = loadLevel({
      ...ROOM,
      portals: [{ portal, at: { x: 1.5, y: 1.5 } }],
    });
    const [[entity, { def }]] = [...world.components.portal];
    expect(def).toBe(portal);
    expect(world.components.position.get(entity)).toEqual({ x: 1.5, y: 1.5 });
  });
});
