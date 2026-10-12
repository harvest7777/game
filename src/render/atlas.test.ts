import { describe, expect, it } from "vitest";
import { packAtlas, type PackedRect, type Size } from "./atlas";

// Gap between two rects along the axis where they're separated, or a negative
// number if they overlap.
function gap(a: PackedRect, b: PackedRect): number {
  return Math.max(
    b.x - (a.x + a.w),
    a.x - (b.x + b.w),
    b.y - (a.y + a.h),
    a.y - (b.y + b.h),
  );
}

const mixed: Size[] = [
  { w: 8, h: 8 },
  { w: 16, h: 4 },
  { w: 8, h: 12 },
  { w: 30, h: 8 },
  { w: 8, h: 8 },
  { w: 2, h: 2 },
];

describe("packAtlas", () => {
  it("keeps every image's size and order", () => {
    const { rects } = packAtlas(mixed, 1, 40);
    expect(rects.map(({ w, h }) => ({ w, h }))).toEqual(mixed);
  });

  it("leaves at least `padding` pixels between every pair of images", () => {
    const padding = 2;
    const { rects } = packAtlas(mixed, padding, 40);
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(gap(rects[i], rects[j])).toBeGreaterThanOrEqual(padding);
      }
    }
  });

  it("leaves at least `padding` pixels to the atlas edge", () => {
    const padding = 2;
    const { width, height, rects } = packAtlas(mixed, padding, 40);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(padding);
      expect(r.y).toBeGreaterThanOrEqual(padding);
      expect(r.x + r.w + padding).toBeLessThanOrEqual(width);
      expect(r.y + r.h + padding).toBeLessThanOrEqual(height);
    }
  });

  it("stays within the max width by wrapping into rows", () => {
    const sizes = Array.from({ length: 20 }, () => ({ w: 8, h: 8 }));
    const { width, height } = packAtlas(sizes, 1, 40);
    expect(width).toBeLessThanOrEqual(40);
    // 4 per row (1 + 4 * 9 = 37), so 5 rows of 9.
    expect(height).toBe(1 + 5 * 9);
  });

  it("refuses an image wider than the atlas", () => {
    expect(() => packAtlas([{ w: 50, h: 8 }], 1, 40)).toThrow();
  });
});
