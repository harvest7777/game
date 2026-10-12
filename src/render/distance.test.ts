import { describe, expect, it } from "vitest";
import { distanceField, encodeDistance, FIELD_REACH } from "./distance";

// Decodes a stored byte back to a distance, matching the shader.
function decode(byte: number): number {
  const low = -0.5;
  const high = FIELD_REACH + 1;
  return (byte / 255) * (high - low) + low;
}

// A 20x20 atlas with one 3x3 sprite at (8, 8) whose middle texel is opaque.
function single() {
  const width = 20;
  const opaque = (x: number, y: number) => x === 9 && y === 9;
  const field = distanceField(opaque, width, 20, [{ x: 8, y: 8, w: 3, h: 3 }]);
  return (x: number, y: number) => decode(field[y * width + x]);
}

describe("distanceField", () => {
  it("is just under zero inside the art", () => {
    expect(single()(9, 9)).toBeCloseTo(-0.5, 1);
  });

  it("is half a texel beside it and the corner's distance diagonally", () => {
    const at = single();
    expect(at(10, 9)).toBeCloseTo(0.5, 1);
    expect(at(9, 8)).toBeCloseTo(0.5, 1);
    expect(at(10, 10)).toBeCloseTo(Math.SQRT1_2, 1);
  });

  it("reaches past the sprite's edges into the padding", () => {
    const at = single();
    // 3.5 texels left of the opaque texel's left edge.
    expect(at(5, 9)).toBeCloseTo(3.5, 1);
  });

  it("only measures from the sprite's own texels", () => {
    // An opaque texel of a neighbour just outside the region doesn't count.
    const width = 20;
    const opaque = (x: number, y: number) =>
      (x === 9 && y === 9) || (x === 12 && y === 9);
    const field = distanceField(opaque, width, 20, [
      { x: 8, y: 8, w: 3, h: 3 },
    ]);
    expect(decode(field[9 * width + 12])).toBeCloseTo(2.5, 1);
  });

  it("stores distances past its reach as its farthest", () => {
    expect(encodeDistance(100)).toBe(255);
    expect(encodeDistance(-3)).toBe(0);
  });

  it("matches a search of every texel, like the shader used to do", () => {
    const width = 24;
    let seed = 3;
    const bits = Array.from({ length: 64 }, () => {
      seed = (seed * 16807) % 2147483647;
      return seed % 3 === 0;
    });
    const r = { x: 8, y: 8, w: 8, h: 8 };
    const opaque = (x: number, y: number) =>
      x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h
        ? bits[(y - r.y) * 8 + (x - r.x)]
        : false;
    const field = distanceField(opaque, width, 24, [r]);
    for (let y = r.y - FIELD_REACH; y < r.y + r.h + FIELD_REACH; y++) {
      for (let x = r.x - FIELD_REACH; x < r.x + r.w + FIELD_REACH; x++) {
        let nearest = Infinity;
        for (let ty = r.y; ty < r.y + r.h; ty++) {
          for (let tx = r.x; tx < r.x + r.w; tx++) {
            if (!opaque(tx, ty)) continue;
            const gx = Math.max(0, tx - (x + 0.5), x + 0.5 - (tx + 1));
            const gy = Math.max(0, ty - (y + 0.5), y + 0.5 - (ty + 1));
            nearest = Math.min(nearest, Math.hypot(gx, gy));
          }
        }
        const expected = opaque(x, y)
          ? -0.5
          : Math.min(nearest, FIELD_REACH + 1);
        expect(decode(field[y * width + x])).toBeCloseTo(expected, 1);
      }
    }
  });
});
