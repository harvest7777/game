import { describe, expect, it } from "vitest";
import {
  attachPanel,
  createHudState,
  placePanel,
  restorePanels,
  uiPixel,
} from "./state";

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
    expect(uiPixel(1)).toBe(6);
    expect(uiPixel(2)).toBe(12);
    expect(uiPixel(1.25)).toBe(8);
  });
});

describe("attachPanel", () => {
  const to = { x: 100, y: 50, w: 54, h: 12 };

  it("puts a panel above, left edges lined up", () => {
    const at = attachPanel({ to: "equipment", side: "above", gap: 2 }, to, {
      w: 54,
      h: 9,
    });
    expect(at).toEqual({ x: 100, y: 50 - 2 - 9 });
  });

  it("puts a panel to the right, bottoms lined up", () => {
    const at = attachPanel({ to: "equipment", side: "right", gap: 2 }, to, {
      w: 54,
      h: 26,
    });
    expect(at).toEqual({ x: 100 + 54 + 2, y: 50 + 12 - 26 });
  });
});

describe("restorePanels", () => {
  const defaults = createHudState().panels;

  it("keeps valid saved placements", () => {
    const saved = { equipment: { corner: "topLeft", x: 3, y: 4 } };
    expect(restorePanels(saved)).toEqual({
      ...defaults,
      equipment: { corner: "topLeft", x: 3, y: 4 },
    });
  });

  it("falls back to the defaults for anything broken", () => {
    expect(restorePanels(null)).toEqual(defaults);
    expect(restorePanels("nonsense")).toEqual(defaults);
    expect(
      restorePanels({
        equipment: { corner: "middle", x: 1, y: 1 },
        inventory: { corner: "topLeft", x: "1", y: 1 },
      }),
    ).toEqual(defaults);
    expect(
      restorePanels({ equipment: { corner: "topLeft", x: -5, y: Infinity } }),
    ).toEqual(defaults);
  });

  it("rounds saved positions to whole UI pixels", () => {
    expect(
      restorePanels({ equipment: { corner: "topLeft", x: 40.75, y: 37.5 } })
        .equipment,
    ).toEqual({ corner: "topLeft", x: 41, y: 38 });
  });

  it("keeps attached panels attached, whatever a save says", () => {
    expect(
      restorePanels({ inventory: { corner: "topLeft", x: 1, y: 1 } }),
    ).toEqual(defaults);
  });

  it("ignores panels it doesn't know", () => {
    expect(
      restorePanels({ minimap: { corner: "topLeft", x: 1, y: 1 } }),
    ).toEqual(defaults);
  });
});
