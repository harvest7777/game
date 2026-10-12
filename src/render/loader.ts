import { packAtlas, type PackedRect } from "./atlas";
import { manifestFiles, type Manifest, type SpriteFile } from "./assets";

// Transparent pixels between sprites in the atlas so sampling never bleeds
// into a neighbour.
const PADDING = 1;
const MAX_ATLAS_WIDTH = 2048;

export type LoadedImage = { width: number; height: number };

// The canvas the atlas is drawn into. `pixels` reads back RGBA bytes for a
// rectangle, row by row, for measuring glyphs.
export type AtlasCanvas<Image> = {
  drawImage(image: Image, x: number, y: number): void;
  pixels(
    x: number,
    y: number,
    width: number,
    height: number,
  ): ArrayLike<number>;
};

// Where a glyph's ink sits in its cell, in font pixels: the first inked
// column, and how many columns wide the ink is.
export type GlyphMetrics = { left: number; width: number };

export type Atlas<Canvas> = {
  canvas: Canvas;
  width: number;
  height: number;
  // Where each sprite file landed, in atlas pixels.
  regions: Map<SpriteFile, PackedRect>;
  // Measured from the art, for every font glyph.
  glyphs: Map<SpriteFile, GlyphMetrics>;
};

// Loads every file the manifest uses and draws them all into one canvas, so
// the GPU gets a single texture uploaded once. Loading and the canvas are
// passed in so this runs in tests without a browser.
export async function buildAtlas<Image extends LoadedImage, Canvas>(
  m: Manifest,
  loadImage: (file: SpriteFile) => Promise<Image>,
  createCanvas: (width: number, height: number) => Canvas & AtlasCanvas<Image>,
): Promise<Atlas<Canvas>> {
  const files = manifestFiles(m);
  const images = await Promise.all(files.map(loadImage));
  const packing = packAtlas(
    images.map((image) => ({ w: image.width, h: image.height })),
    PADDING,
    MAX_ATLAS_WIDTH,
  );

  const canvas = createCanvas(packing.width, packing.height);
  const regions = new Map<SpriteFile, PackedRect>();
  files.forEach((file, i) => {
    const rect = packing.rects[i];
    canvas.drawImage(images[i], rect.x, rect.y);
    regions.set(file, rect);
  });

  const glyphs = new Map<SpriteFile, GlyphMetrics>();
  for (const font of Object.values(m.fonts)) {
    for (const file of Object.values(font)) {
      glyphs.set(file, measureGlyph(canvas, regions.get(file)!));
    }
  }

  return {
    canvas,
    width: packing.width,
    height: packing.height,
    regions,
    glyphs,
  };
}

// Finds a glyph's inked columns, so glyphs of any width space correctly and
// editing the art is all it takes to change how a character is spaced. An
// empty glyph has no width.
export function measureGlyph(
  canvas: { pixels: AtlasCanvas<unknown>["pixels"] },
  rect: PackedRect,
): GlyphMetrics {
  const data = canvas.pixels(rect.x, rect.y, rect.w, rect.h);
  let first = -1;
  let last = -1;
  for (let x = 0; x < rect.w; x++) {
    for (let y = 0; y < rect.h; y++) {
      if (data[(y * rect.w + x) * 4 + 3] > 0) {
        if (first === -1) first = x;
        last = x;
        break;
      }
    }
  }
  return first === -1
    ? { left: 0, width: 0 }
    : { left: first, width: last - first + 1 };
}
