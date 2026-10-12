import type { PackedRect } from "./atlas";
import type { SpriteFile } from "../ecs/sprite/art";
import type { Manifest } from "./assets";
import type { GlyphMetrics } from "./loader";

// The loaded art a frame is built from: the manifest, where each file sits in
// the atlas, and how wide each glyph's ink is.
export type Art = {
  manifest: Manifest;
  regions: Map<SpriteFile, PackedRect>;
  glyphs: Map<SpriteFile, GlyphMetrics>;
};

export function regionOf(art: Art, file: SpriteFile): PackedRect {
  const region = art.regions.get(file);
  if (!region) throw new Error(`sprite file "${file}" isn't in the atlas`);
  return region;
}
