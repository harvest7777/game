import type { PackedRect } from "./atlas";

// Largest outline/glow reach the shader supports, in sprite pixels. Glow
// radii above this are cut off.
export const MAX_REACH = 4;
// How far past a sprite its distance map reaches: enough to cover the
// furthest a quad's margin can go, plus a texel so smooth sampling at the
// very edge still reads this sprite's values.
export const FIELD_REACH = MAX_REACH + 1;
// Distances are stored as bytes covering [-0.5, FIELD_REACH + 1].
const LOW = -0.5;
const HIGH = FIELD_REACH + 1;

export function encodeDistance(d: number): number {
  const clamped = Math.max(LOW, Math.min(HIGH, d));
  return Math.round(((clamped - LOW) / (HIGH - LOW)) * 255);
}

// GLSL for turning a sampled byte (0-1) back into a distance.
export const DECODE_DISTANCE = `(v * ${(HIGH - LOW).toFixed(4)} + ${LOW.toFixed(4)})`;

// For every texel in and around each sprite, how far its center is from
// the nearest opaque texel's square, in sprite pixels: -0.5 inside the art
// (so smoothly sampling across an edge crosses 0 right on it), up to
// FIELD_REACH out. Baked once when the atlas loads so the shader draws
// outlines and glows from a single smooth sample instead of searching the
// texels around every pixel. `opaque` is the atlas's alpha test (alpha >
// half), `width` its width; the result is one byte per atlas texel, laid
// out like the atlas, with texels no sprite reaches left at the far end.
export function distanceField(
  opaque: (x: number, y: number) => boolean,
  width: number,
  height: number,
  regions: Iterable<PackedRect>,
): Uint8Array {
  const out = new Uint8Array(width * height).fill(255);
  const reach = FIELD_REACH + 1;
  for (const r of regions) {
    // Which of this sprite's texels are opaque, so neighbours never count.
    const solid = new Uint8Array(r.w * r.h);
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        solid[y * r.w + x] = opaque(r.x + x, r.y + y) ? 1 : 0;
      }
    }
    for (let y = -FIELD_REACH; y < r.h + FIELD_REACH; y++) {
      for (let x = -FIELD_REACH; x < r.w + FIELD_REACH; x++) {
        const ax = r.x + x;
        const ay = r.y + y;
        if (ax < 0 || ay < 0 || ax >= width || ay >= height) continue;
        let nearest = Infinity;
        if (x >= 0 && y >= 0 && x < r.w && y < r.h && solid[y * r.w + x]) {
          nearest = LOW;
        } else {
          const cx = x + 0.5;
          const cy = y + 0.5;
          for (
            let ty = Math.max(0, y - reach);
            ty <= Math.min(r.h - 1, y + reach);
            ty++
          ) {
            for (
              let tx = Math.max(0, x - reach);
              tx <= Math.min(r.w - 1, x + reach);
              tx++
            ) {
              if (!solid[ty * r.w + tx]) continue;
              const gx = Math.max(0, tx - cx, cx - (tx + 1));
              const gy = Math.max(0, ty - cy, cy - (ty + 1));
              nearest = Math.min(nearest, Math.hypot(gx, gy));
            }
          }
        }
        out[ay * width + ax] = encodeDistance(nearest);
      }
    }
  }
  return out;
}
