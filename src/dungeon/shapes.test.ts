import { describe, expect, it } from "vitest";
import { flood, isOn, maskAscii, onCells, type Mask } from "./mask";
import { seeded } from "./rng";
import { makeShape, SHAPES, type ShapeSpec } from "./shapes";

const SEEDS = Array.from({ length: 100 }, (_, i) => i);

function isConnected(mask: Mask): boolean {
  const cells = onCells(mask);
  return flood(cells[0], (x, y) => isOn(mask, x, y)).length === cells.length;
}

// Something on in the first and last row and column, so it's cropped.
function isCropped(mask: Mask): boolean {
  const cells = onCells(mask);
  return (
    cells.some((c) => c.x === 0) &&
    cells.some((c) => c.y === 0) &&
    cells.some((c) => c.x === mask.width - 1) &&
    cells.some((c) => c.y === mask.height - 1)
  );
}

describe("rect", () => {
  it("is all floor, within its size range", () => {
    const spec: ShapeSpec = { kind: "rect", w: [4, 6], h: [3, 3] };
    for (const seed of SEEDS) {
      const mask = makeShape(seeded(seed), spec)!;
      expect(mask.width).toBeGreaterThanOrEqual(4);
      expect(mask.width).toBeLessThanOrEqual(6);
      expect(mask.height).toBe(3);
      expect(onCells(mask)).toHaveLength(mask.width * mask.height);
    }
  });
});

describe("ellipse", () => {
  it("rounds off the corners of its box", () => {
    const spec: ShapeSpec = { kind: "ellipse", w: [7, 7], h: [7, 7] };
    expect(maskAscii(makeShape(seeded(1), spec)!)).toEqual([
      "  ...  ",
      " ..... ",
      ".......",
      ".......",
      ".......",
      " ..... ",
      "  ...  ",
    ]);
  });
});

describe("every shape", () => {
  const specs: ShapeSpec[] = [
    { kind: "rect", w: [3, 12], h: [3, 12] },
    { kind: "ellipse", w: [3, 14], h: [3, 14] },
    { kind: "cave", w: [10, 18], h: [10, 18] },
  ];

  for (const spec of specs) {
    it(`${spec.kind} is one connected piece, cropped to fit`, () => {
      for (const seed of SEEDS) {
        const mask = makeShape(seeded(seed), spec);
        if (!mask) continue;
        expect(isConnected(mask), maskAscii(mask).join("\n")).toBe(true);
        expect(isCropped(mask), maskAscii(mask).join("\n")).toBe(true);
      }
    });
  }

  it("cave comes out usable more often than not on one try", () => {
    const spec = { kind: "cave", w: [12, 16], h: [12, 16] } as const;
    const made = SEEDS.filter((seed) =>
      SHAPES.cave(seeded(seed), { ...spec, w: [...spec.w], h: [...spec.h] }),
    );
    expect(made.length).toBeGreaterThan(SEEDS.length / 2);
  });

  it("makeShape tries again until a cave comes out usable", () => {
    const spec: ShapeSpec = { kind: "cave", w: [12, 16], h: [12, 16] };
    for (const seed of SEEDS) {
      expect(makeShape(seeded(seed), spec)).not.toBeNull();
    }
  });
});
