import { describe, expect, it } from "vitest";
import { placePanel, uiPixel } from "./state";

const size = { w: 20, h: 10 };
const screen = { w: 300, h: 200 };

describe("placePanel", () => {
  it("measures from the top-left", () => {
    expect(placePanel({ corner: "topLeft", x: 5, y: 7 }, size, screen)).toEqual(
      {
        x: 5,
        y: 7,
      },
    );
  });

  it("measures a bottom-right panel to its own bottom-right corner", () => {
    expect(
      placePanel({ corner: "bottomRight", x: 5, y: 7 }, size, screen),
    ).toEqual({ x: 300 - 5 - 20, y: 200 - 7 - 10 });
  });

  it("mixes axes for the other corners", () => {
    expect(
      placePanel({ corner: "topRight", x: 5, y: 7 }, size, screen),
    ).toEqual({ x: 275, y: 7 });
    expect(
      placePanel({ corner: "bottomLeft", x: 5, y: 7 }, size, screen),
    ).toEqual({ x: 5, y: 183 });
  });

  it("keeps its distance from its corner when the screen resizes", () => {
    const placement = { corner: "bottomRight" as const, x: 5, y: 7 };
    const small = placePanel(placement, size, screen);
    const big = placePanel(placement, size, { w: 500, h: 400 });
    expect(500 - (big.x + size.w)).toBe(300 - (small.x + size.w));
  });
});

describe("uiPixel", () => {
  it("is a whole number of device pixels", () => {
    expect(uiPixel(1)).toBe(4);
    expect(uiPixel(2)).toBe(8);
    expect(uiPixel(1.25)).toBe(5);
  });
});
