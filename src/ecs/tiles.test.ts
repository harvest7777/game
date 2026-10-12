import { describe, expect, it } from "vitest";
import {
  createTiles,
  groundAt,
  groundSpeedScale,
  isWall,
  setGround,
  setVoid,
  setWall,
  isVoid,
  wallStyleAt,
  wallsInBox,
} from "./tiles";

describe("isWall", () => {
  it("is false for an open tile", () => {
    const tiles = createTiles(3, 3);
    expect(isWall(tiles, 1, 1)).toBe(false);
  });

  it("is true for a tile set as a wall", () => {
    const tiles = createTiles(3, 3);
    setWall(tiles, 1, 2);
    expect(isWall(tiles, 1, 2)).toBe(true);
  });

  it("is true outside the map", () => {
    const tiles = createTiles(3, 3);
    expect(isWall(tiles, -1, 0)).toBe(true);
    expect(isWall(tiles, 0, 3)).toBe(true);
  });
});

describe("wallsInBox", () => {
  it("yields only walls whose tile overlaps the box", () => {
    const tiles = createTiles(5, 5);
    setWall(tiles, 1, 1);
    setWall(tiles, 3, 3);

    const walls = [...wallsInBox(tiles, 0.5, 0.5, 2.5, 2.5)];

    expect(walls).toEqual([{ x: 1, y: 1 }]);
  });

  it("includes tiles past the map edge as walls", () => {
    const tiles = createTiles(2, 2);

    const walls = [...wallsInBox(tiles, -0.5, 0.5, 0.5, 0.5)];

    expect(walls).toEqual([{ x: -1, y: 0 }]);
  });
});

describe("groundAt", () => {
  it("is the default ground for a fresh map", () => {
    const tiles = createTiles(3, 3);
    expect(groundAt(tiles, 1, 1)).toBe(0);
  });

  it("returns the type that was set", () => {
    const tiles = createTiles(3, 3);
    const lava = 7;
    setGround(tiles, 2, 1, lava);
    expect(groundAt(tiles, 2, 1)).toBe(lava);
    expect(groundAt(tiles, 1, 2)).toBe(0);
  });

  it("is the default ground outside the map", () => {
    const tiles = createTiles(3, 3);
    setGround(tiles, -1, 0, 7);
    expect(groundAt(tiles, -1, 0)).toBe(0);
  });
});

describe("groundSpeedScale", () => {
  it("is the ground's own scale, or 1 when it doesn't say", () => {
    const tiles = createTiles(2, 1, [
      { art: "grass" },
      { art: "water", speedScale: 0.8 },
    ]);
    setGround(tiles, 1, 0, 1);
    expect(groundSpeedScale(tiles, { x: 0.5, y: 0.5 })).toBe(1);
    expect(groundSpeedScale(tiles, { x: 1.9, y: 0.2 })).toBe(0.8);
  });
});

describe("void", () => {
  it("blocks like a wall but isn't a raised wall", () => {
    const tiles = createTiles(3, 3);
    setVoid(tiles, 1, 1);
    expect(isWall(tiles, 1, 1)).toBe(true);
    expect(isVoid(tiles, 1, 1)).toBe(true);
    expect(wallStyleAt(tiles, 1, 1)).toBe(-1);
  });

  it("doesn't count off the map, which isn't drawn at all", () => {
    expect(isVoid(createTiles(3, 3), -1, 0)).toBe(false);
  });
});

describe("wallStyleAt", () => {
  it("is the style a wall was raised with", () => {
    const tiles = createTiles(3, 3);
    setWall(tiles, 0, 0);
    setWall(tiles, 1, 0, true, 2);
    expect(wallStyleAt(tiles, 0, 0)).toBe(0);
    expect(wallStyleAt(tiles, 1, 0)).toBe(2);
    expect(wallStyleAt(tiles, 2, 0)).toBe(-1);
  });
});
