import { packAtlas, type PackedRect } from "./atlas";
import { manifestFiles, type Manifest, type SpriteFile } from "./assets";

// Transparent pixels between sprites in the atlas so sampling never bleeds
// into a neighbour.
const PADDING = 1;
const MAX_ATLAS_WIDTH = 2048;

export type LoadedImage = { width: number; height: number };

// The canvas the atlas is drawn into; only needs drawImage.
export type AtlasCanvas<Image> = {
  drawImage(image: Image, x: number, y: number): void;
};

export type Atlas<Canvas> = {
  canvas: Canvas;
  width: number;
  height: number;
  // Where each sprite file landed, in atlas pixels.
  regions: Map<SpriteFile, PackedRect>;
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

  return { canvas, width: packing.width, height: packing.height, regions };
}
