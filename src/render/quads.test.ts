import { describe, expect, it } from "vitest";
import { QuadBuffer, readQuads } from "./quads";

const region = { x: 1, y: 2, w: 8, h: 8 };

describe("QuadBuffer", () => {
  it("round-trips a quad through the flat buffer", () => {
    const buffer = new QuadBuffer();

    buffer.push(
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      region,
      true,
      0.5,
      { color: [1, 0.5, 0.25, 1], glow: { radius: 2, pulseHz: 3 } },
      0.25,
      0.75,
      true,
    );

    expect(readQuads(buffer)).toEqual([
      {
        corners: [
          { x: 0, y: 1 },
          { x: 2, y: 3 },
          { x: 4, y: 5 },
          { x: 6, y: 7 },
        ],
        region,
        flipX: true,
        margin: 0.5,
        outline: [1, 0.5, 0.25, 1],
        glowRadius: 2,
        glowPulseHz: 3,
        depth: 0.25,
        ring: 0.75,
        fill: true,
      },
    ]);
  });

  it("defaults to a plain textured quad at the farthest depth", () => {
    const buffer = new QuadBuffer();
    buffer.push(0, 0, 1, 0, 1, 1, 0, 1, region);

    const [quad] = readQuads(buffer);

    expect(quad.outline).toEqual([0, 0, 0, 0]);
    expect(quad.glowRadius).toBe(0);
    expect(quad.margin).toBe(0);
    expect(quad.depth).toBe(1);
    expect(quad.ring).toBe(0);
    expect(quad.fill).toBe(false);
  });

  it("grows past its initial capacity and keeps earlier quads", () => {
    const buffer = new QuadBuffer(2);
    for (let i = 0; i < 5; i++) buffer.push(i, 0, 0, 0, 0, 0, 0, 0, region);

    expect(readQuads(buffer).map((q) => q.corners[0].x)).toEqual([
      0, 1, 2, 3, 4,
    ]);
  });

  it("starts over after reset without reallocating", () => {
    const buffer = new QuadBuffer(4);
    buffer.push(9, 0, 0, 0, 0, 0, 0, 0, region);
    const data = buffer.data;

    buffer.reset();
    buffer.push(1, 0, 0, 0, 0, 0, 0, 0, region);

    expect(buffer.data).toBe(data);
    expect(readQuads(buffer).map((q) => q.corners[0].x)).toEqual([1]);
  });
});
