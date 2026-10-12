import { describe, expect, it } from "vitest";
import { createTiles, setWall, type Tiles } from "../tiles";
import { flowField, nextWaypoint, stepsAt } from "./pathing";

// Draws walls from text: `#` is a wall, anything else open.
function tilesFrom(rows: string[]): Tiles {
  const tiles = createTiles(rows[0].length, rows.length);
  rows.forEach((row, y) =>
    [...row].forEach((char, x) => {
      if (char === "#") setWall(tiles, x, y);
    }),
  );
  return tiles;
}

// A wall down the middle with a gap at the bottom.
const GAP = tilesFrom([
  "..#..", //
  "..#..",
  "..#..",
  ".....",
]);

describe("flowField", () => {
  it("counts steps to the goal around walls", () => {
    // Goal top right; from top left the only way is down through the gap
    // and back up: (1,1) (1,2) (1,3) (2,3) (3,3) (4,2) (4,1) (4,0), the
    // diagonals past the wall's foot being corners it can't cut.
    const field = flowField(GAP, { x: 4.5, y: 0.5 }, 10);
    expect(stepsAt(field, 4, 0)).toBe(0);
    expect(stepsAt(field, 0, 0)).toBe(8);
  });

  it("never cuts a wall's corner", () => {
    // (1,3) (2,3) then straight to (3,2) would clip the wall's foot at
    // (2,2), so it goes round by (3,3).
    const field = flowField(GAP, { x: 3.5, y: 2.5 }, 10);
    expect(stepsAt(field, 1, 3)).toBe(3);
  });

  it("marks what it can't reach, and what's outside it", () => {
    const sealed = tilesFrom(["..#..", "..#..", "..#.."]);
    const field = flowField(sealed, { x: 4.5, y: 0.5 }, 2);
    expect(stepsAt(field, 0, 0)).toBe(-1);
    expect(stepsAt(field, 40, 40)).toBe(-1);
  });
});

describe("nextWaypoint", () => {
  it("heads for the gap when the goal's behind a wall", () => {
    const field = flowField(GAP, { x: 4.5, y: 0.5 }, 10);
    const waypoint = nextWaypoint(GAP, field, { x: 0.5, y: 0.5 })!;
    // Down toward the gap, as far as it can see.
    expect(waypoint.y).toBeGreaterThan(0.5);
    expect(waypoint.x).toBeLessThan(2);
  });

  it("is undefined on the goal's tile", () => {
    const field = flowField(GAP, { x: 4.5, y: 0.5 }, 10);
    expect(nextWaypoint(GAP, field, { x: 4.2, y: 0.7 })).toBeUndefined();
  });

  it("is undefined outside the field", () => {
    const tiles = createTiles(50, 50);
    const field = flowField(tiles, { x: 5.5, y: 5.5 }, 3);
    expect(nextWaypoint(tiles, field, { x: 40.5, y: 40.5 })).toBeUndefined();
  });
});
