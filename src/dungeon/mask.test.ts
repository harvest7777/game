import { describe, expect, it } from "vitest";
import {
  flood,
  fromCells,
  isOn,
  largestRegion,
  maskAscii,
  maskFromAscii,
} from "./mask";

describe("isOn", () => {
  it("is off outside the mask", () => {
    const mask = maskFromAscii(["..", ".."]);
    expect(isOn(mask, -1, 0)).toBe(false);
    expect(isOn(mask, 0, 2)).toBe(false);
  });
});

describe("maskAscii", () => {
  it("round trips through maskFromAscii", () => {
    const rows = [" . ", "...", " . "];
    expect(maskAscii(maskFromAscii(rows))).toEqual(rows);
  });
});

describe("flood", () => {
  it("reaches open cells in four directions but not diagonally", () => {
    const mask = maskFromAscii([".. ", "  .", "  ."]);

    const reached = flood({ x: 0, y: 0 }, (x, y) => isOn(mask, x, y));

    expect(reached).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });

  it("when starting on a closed cell, reaches nothing", () => {
    const mask = maskFromAscii([" ."]);
    expect(flood({ x: 0, y: 0 }, (x, y) => isOn(mask, x, y))).toEqual([]);
  });
});

describe("largestRegion", () => {
  it("keeps only the biggest group, cropped to fit", () => {
    const mask = maskFromAscii([".   ", "  ..", "  .."]);
    expect(maskAscii(largestRegion(mask)!)).toEqual(["..", ".."]);
  });

  it("when nothing is on, is null", () => {
    expect(largestRegion(maskFromAscii(["  "]))).toBeNull();
  });
});

describe("fromCells", () => {
  it("shifts cells to touch the top and left edges", () => {
    const mask = fromCells([
      { x: 5, y: 3 },
      { x: 6, y: 4 },
    ]);
    expect(maskAscii(mask)).toEqual([". ", " ."]);
  });
});
