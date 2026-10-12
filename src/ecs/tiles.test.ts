import { describe, expect, it } from "vitest";
import { createTiles, isWall, setWall, wallsInBox } from "./tiles";

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
