import type { PackedRect } from "./atlas";
import type { Manifest, SpriteFile } from "./assets";

// The loaded art a frame is built from: what each sprite name and tile type
// uses, and where each file sits in the atlas.
export type Art = {
  manifest: Manifest;
  regions: Map<SpriteFile, PackedRect>;
};

export function regionOf(art: Art, file: SpriteFile): PackedRect {
  const region = art.regions.get(file);
  if (!region) throw new Error(`sprite file "${file}" isn't in the atlas`);
  return region;
}
