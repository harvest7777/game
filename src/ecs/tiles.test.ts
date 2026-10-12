import { describe, expect, it } from "vitest";
import {
  createTiles,
  groundAt,
  groundSpeedScale,
  isWall,
  setGround,
  clearLine,
  nearestSafeSpot,
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

describe("clearLine", () => {
  it("is clear across open floor", () => {
    const tiles = createTiles(10, 10);
    expect(clearLine(tiles, { x: 0.5, y: 0.5 }, { x: 8.5, y: 6.5 })).toBe(true);
  });

  it("is blocked by a wall in the way", () => {
    const tiles = createTiles(10, 10);
    setWall(tiles, 4, 2);
    expect(clearLine(tiles, { x: 0.5, y: 2.5 }, { x: 8.5, y: 2.5 })).toBe(
      false,
    );
  });

  it("is blocked by void too", () => {
    const tiles = createTiles(10, 10);
    setVoid(tiles, 2, 4);
    expect(clearLine(tiles, { x: 2.5, y: 0.5 }, { x: 2.5, y: 8.5 })).toBe(
      false,
    );
  });

  it("isn't blocked by a wall beside the line", () => {
    const tiles = createTiles(10, 10);
    setWall(tiles, 4, 3);
    expect(clearLine(tiles, { x: 0.5, y: 2.5 }, { x: 8.5, y: 2.5 })).toBe(true);
  });

  it("is clear within one tile", () => {
    const tiles = createTiles(3, 3);
    expect(clearLine(tiles, { x: 1.2, y: 1.2 }, { x: 1.8, y: 1.7 })).toBe(true);
  });

  it("catches a wall a steep diagonal clips", () => {
    const tiles = createTiles(10, 10);
    // From (0.5, 0.5) to (2.5, 6.5) the line crosses x = 1 at y = 2, so it
    // passes through tile (1, 3).
    setWall(tiles, 1, 3);
    expect(clearLine(tiles, { x: 0.5, y: 0.5 }, { x: 2.5, y: 6.5 })).toBe(
      false,
    );
  });
});

describe("nearestSafeSpot", () => {
  const FLOOR = { art: "floor" };
  const LAVA = { art: "lava", hazard: { damage: 10, every: 1 } };

  // A 9x9 map of floor with a lava pool covering x 2..6, y 2..6.
  function pool() {
    const tiles = createTiles(9, 9, [FLOOR, LAVA]);
    for (let y = 2; y <= 6; y++) {
      for (let x = 2; x <= 6; x++) setGround(tiles, x, y, 1);
    }
    return tiles;
  }

  it("keeps a spot that's already safe", () => {
    expect(nearestSafeSpot(pool(), { x: 0.3, y: 0.7 })).toEqual({
      x: 0.3,
      y: 0.7,
    });
  });

  it("moves off lava to the nearest safe tile", () => {
    // Near the pool's right edge: tile (7, 4) is the closest floor.
    expect(nearestSafeSpot(pool(), { x: 6.2, y: 4.5 })).toEqual({
      x: 7.5,
      y: 4.5,
    });
  });

  it("won't go through a wall to get there", () => {
    const tiles = pool();
    for (let y = 0; y < 9; y++) setWall(tiles, 7, y);
    // Floor at x 8 is behind the wall, so it's out of the pool's top
    // instead (the bottom is as close; the first found wins).
    const spot = nearestSafeSpot(tiles, { x: 6.2, y: 4.5 });
    expect(spot).toEqual({ x: 6.5, y: 1.5 });
  });
});
