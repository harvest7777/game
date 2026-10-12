import type { Color, Outline } from "../ecs/sprite/components";
import type { Vec2 } from "../ecs/shared/physics/math";
import type { PackedRect } from "./atlas";

// One textured quad as the GPU sees it. Corners are in screen pixels, in the
// order the texture maps onto them: top-left, top-right, bottom-right,
// bottom-left. The quad may be any parallelogram (rotated tiles, wall faces).
//
// `margin` is how many sprite pixels the quad extends past the texture
// region on every side, leaving room to draw an outline and glow around it.
//
// `depth` is 0 (nearest the viewer) to 1 (farthest). Walls write it to the
// depth buffer and sprites test against it, so walls only cover sprites
// standing behind them.
export type Quad = {
  corners: [Vec2, Vec2, Vec2, Vec2];
  region: PackedRect;
  flipX: boolean;
  margin: number;
  outline: Color;
  glowRadius: number;
  glowPulseHz: number;
  depth: number;
};

// Float layout of one quad in the instance buffer. The WebGL backend reads
// the same offsets.
export const QUAD_LAYOUT = {
  corners: 0, // 8 floats: x0 y0 x1 y1 x2 y2 x3 y3
  region: 8, // 4 floats: x y w h in atlas pixels
  flipX: 12, // 1 float: 0 or 1
  margin: 13, // 1 float: sprite pixels
  outline: 14, // 4 floats: rgba 0..1, alpha 0 means no outline
  glow: 18, // 2 floats: radius in sprite pixels, pulses per second
  depth: 20, // 1 float: 0 nearest .. 1 farthest
} as const;
export const FLOATS_PER_QUAD = 21;

const NO_OUTLINE: Color = [0, 0, 0, 0];

// Growable flat buffer of quads, reused across frames so building a frame
// doesn't allocate per quad.
export class QuadBuffer {
  data: Float32Array;
  count = 0;

  constructor(initialQuads = 1024) {
    this.data = new Float32Array(initialQuads * FLOATS_PER_QUAD);
  }

  reset(): void {
    this.count = 0;
  }

  push(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    region: PackedRect,
    flipX = false,
    margin = 0,
    outline?: Outline,
    depth = 1,
  ): void {
    if ((this.count + 1) * FLOATS_PER_QUAD > this.data.length) {
      const grown = new Float32Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    const d = this.data;
    const o = this.count * FLOATS_PER_QUAD;
    d[o] = x0;
    d[o + 1] = y0;
    d[o + 2] = x1;
    d[o + 3] = y1;
    d[o + 4] = x2;
    d[o + 5] = y2;
    d[o + 6] = x3;
    d[o + 7] = y3;
    d[o + 8] = region.x;
    d[o + 9] = region.y;
    d[o + 10] = region.w;
    d[o + 11] = region.h;
    d[o + 12] = flipX ? 1 : 0;
    d[o + 13] = margin;
    const color = outline?.color ?? NO_OUTLINE;
    d[o + 14] = color[0];
    d[o + 15] = color[1];
    d[o + 16] = color[2];
    d[o + 17] = color[3];
    d[o + 18] = outline?.glow?.radius ?? 0;
    d[o + 19] = outline?.glow?.pulseHz ?? 0;
    d[o + 20] = depth;
    this.count++;
  }
}

// Reads quads back out as objects, for tests and debugging.
export function readQuads(buffer: QuadBuffer): Quad[] {
  const quads: Quad[] = [];
  const d = buffer.data;
  for (let i = 0; i < buffer.count; i++) {
    const o = i * FLOATS_PER_QUAD;
    quads.push({
      corners: [
        { x: d[o], y: d[o + 1] },
        { x: d[o + 2], y: d[o + 3] },
        { x: d[o + 4], y: d[o + 5] },
        { x: d[o + 6], y: d[o + 7] },
      ],
      region: { x: d[o + 8], y: d[o + 9], w: d[o + 10], h: d[o + 11] },
      flipX: d[o + 12] === 1,
      margin: d[o + 13],
      outline: [d[o + 14], d[o + 15], d[o + 16], d[o + 17]],
      glowRadius: d[o + 18],
      glowPulseHz: d[o + 19],
      depth: d[o + 20],
    });
  }
  return quads;
}
