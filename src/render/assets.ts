import type { GroundType } from "../ecs/tiles";

// Paths are relative to public/sprites, without the .png extension.
export type SpriteFile = string;

// A walker has three facings, each [standing, step 1, step 2]. Side frames
// face right; the renderer mirrors them for left.
export type WalkerArt = {
  kind: "walker";
  front: SpriteFile[];
  back: SpriteFile[];
  side: SpriteFile[];
};

export type StaticArt = { kind: "static"; file: SpriteFile };

export type SpriteArt = WalkerArt | StaticArt;

export type Manifest = {
  // Keyed by Sprite.name.
  sprites: Record<string, SpriteArt>;
  // Keyed by ground type id.
  ground: Record<GroundType, SpriteFile>;
  walls: { top: SpriteFile; side: SpriteFile };
};

function walkerFrames(facing: string): SpriteFile[] {
  return [0, 1, 2].map((frame) => `player/${facing}-${frame}`);
}

export const manifest: Manifest = {
  sprites: {
    player: {
      kind: "walker",
      front: walkerFrames("front"),
      back: walkerFrames("back"),
      side: walkerFrames("side"),
    },
    bolt: { kind: "static", file: "projectiles/bolt" },
    orb: { kind: "static", file: "projectiles/orb" },
    star: { kind: "static", file: "projectiles/star" },
  },
  ground: { 0: "tiles/floor" },
  walls: { top: "tiles/wall-top", side: "tiles/wall-side" },
};

// Every file the manifest uses, each once.
export function manifestFiles(m: Manifest): SpriteFile[] {
  const files = new Set<SpriteFile>();
  for (const art of Object.values(m.sprites)) {
    if (art.kind === "static") files.add(art.file);
    else [...art.front, ...art.back, ...art.side].forEach((f) => files.add(f));
  }
  Object.values(m.ground).forEach((f) => files.add(f));
  files.add(m.walls.top);
  files.add(m.walls.side);
  return [...files];
}
