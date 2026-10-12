import { describe, expect, it } from "vitest";
import { projectileDef } from "../ecs/projectile/definitions";
import {
  itemTooltip,
  placeTooltip,
  range,
  tooltipPanel,
  TOOLTIP_COLORS,
} from "./tooltip";

const texts = (id: Parameters<typeof itemTooltip>[0]) =>
  itemTooltip(id).map((l) => l.text);

describe("itemTooltip", () => {
  it("names the item and its kind first", () => {
    const [name, kind] = itemTooltip("apprenticeStaff");
    expect(name).toEqual({
      text: "Apprentice Staff",
      color: TOOLTIP_COLORS.name,
    });
    expect(kind.text).toBe("Weapon");
  });

  it("gives a weapon's damage, rate and range from its definitions", () => {
    // Bolt: 20-30 damage, 4 shots a second, 12 tiles/s for 0.6 s.
    expect(texts("apprenticeStaff")).toEqual([
      "Apprentice Staff",
      "Weapon",
      "Damage: 20-30",
      "Rate: 4/s",
      "Range: 7.2 tiles",
    ]);
  });

  it("counts the shots in a volley", () => {
    expect(texts("prejudiceStaff")).toContain("Damage: 25-40 x10");
  });

  it("lists what's special about its shots", () => {
    expect(texts("lance")).toContain("Pierces enemies");
    expect(texts("phantomStaff")).toContain("Passes through walls");
    expect(texts("boomerang")).toContain("Returns");
    expect(texts("serpentStaff")).toContain("Weaves");
    expect(texts("cometStaff")).toContain("Speeds up");
    expect(texts("mireStaff")).toContain("Slows down");
  });
});

describe("range", () => {
  it("is speed times lifetime for a straight shot", () => {
    expect(range(projectileDef("bolt"))).toBeCloseTo(12 * 0.6, 1);
  });

  it("is the turnaround point for a boomerang, not where it ends", () => {
    // 10 tiles/s out for half of 1.2 s.
    expect(range(projectileDef("boomerang"))).toBeCloseTo(6, 1);
  });

  it("follows a curving path", () => {
    // A spiral never gets farther than the circle it traces: 2 radii.
    const spiral = projectileDef("spiral");
    const radius = spiral.speed / spiral.turnRate!;
    expect(range(spiral)).toBeLessThanOrEqual(2 * radius + 1e-6);
  });
});

describe("tooltipPanel", () => {
  it("fits its widest line with a margin", () => {
    const panel = tooltipPanel(
      [
        { text: "abc", color: TOOLTIP_COLORS.stat },
        { text: "abcdef", color: TOOLTIP_COLORS.stat },
      ],
      (text) => text.length * 4,
    );
    expect(panel.w).toBe(24 + 6);
    const lines = panel.elements.filter((e) => e.kind === "text");
    expect(lines).toHaveLength(2);
  });
});

describe("placeTooltip", () => {
  const size = { w: 40, h: 20 };
  const screen = { w: 200, h: 120 };

  it("goes up and to the right of the pointer", () => {
    expect(placeTooltip(size, { x: 50, y: 60 }, screen)).toEqual({
      x: 54,
      y: 36,
    });
  });

  it("flips left near the right edge and below near the top", () => {
    expect(placeTooltip(size, { x: 190, y: 10 }, screen)).toEqual({
      x: 146,
      y: 14,
    });
  });
});
