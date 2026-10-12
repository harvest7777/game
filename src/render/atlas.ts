export type Size = { w: number; h: number };
export type PackedRect = { x: number; y: number; w: number; h: number };
export type Packing = { width: number; height: number; rects: PackedRect[] };

// Packs images into one atlas using shelves: tallest first, left to right,
// starting a new row when the next one won't fit. Every image gets at least
// `padding` empty pixels between it and its neighbours and the atlas edge, so
// texture sampling never picks up a neighbour. Rects come back in the same
// order as `sizes`.
export function packAtlas(
  sizes: Size[],
  padding: number,
  maxWidth: number,
): Packing {
  const order = sizes
    .map((size, index) => ({ size, index }))
    .sort((a, b) => b.size.h - a.size.h || a.index - b.index);

  const rects: PackedRect[] = new Array(sizes.length);
  let x = padding;
  let y = padding;
  let rowHeight = 0;
  let width = 0;

  for (const { size, index } of order) {
    if (size.w + 2 * padding > maxWidth) {
      throw new Error(`image ${index} (${size.w}px) is wider than the atlas`);
    }
    if (x + size.w + padding > maxWidth) {
      x = padding;
      y += rowHeight + padding;
      rowHeight = 0;
    }
    rects[index] = { x, y, w: size.w, h: size.h };
    x += size.w + padding;
    rowHeight = Math.max(rowHeight, size.h);
    width = Math.max(width, x);
  }

  return { width, height: y + rowHeight + padding, rects };
}
