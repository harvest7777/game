import type { GroundType } from "../ecs/tiles";

// Paths are relative to public/sprites, without the .png extension.
export type SpriteFile = string;

export type Facings = {
  front: SpriteFile[];
  back: SpriteFile[];
  side: SpriteFile[];
};

// A walker has three facings, each [standing, step 1, step 2]. Side frames
// face right; the renderer mirrors them for left. `attack` has the same
// shape, with the weapon thrust out, shown in time with its shots.
export type WalkerArt = Facings & {
  kind: "walker";
  attack?: Facings;
};

export type StaticArt = { kind: "static"; file: SpriteFile };

export type SpriteArt = WalkerArt | StaticArt;

export type Manifest = {
  // Keyed by character, for floating text.
  font: Record<string, SpriteFile>;
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
  font: Object.fromEntries(
    [..."0123456789"].map((digit) => [digit, `font/${digit}`]),
  ),
  sprites: {
    player: {
      kind: "walker",
      front: walkerFrames("front"),
      back: walkerFrames("back"),
      side: walkerFrames("side"),
      attack: {
        front: walkerFrames("front-attack"),
        back: walkerFrames("back-attack"),
        side: walkerFrames("side-attack"),
      },
    },
    dummy: { kind: "static", file: "enemies/dummy" },
    slime: { kind: "static", file: "enemies/slime" },
    archer: { kind: "static", file: "enemies/archer" },
    boar: { kind: "static", file: "enemies/boar" },
    bolt: { kind: "static", file: "projectiles/bolt" },
    orb: { kind: "static", file: "projectiles/orb" },
    star: { kind: "static", file: "projectiles/star" },
    prejudice: { kind: "static", file: "projectiles/prejudice" },
  },
  ground: { 0: "tiles/floor" },
  walls: { top: "tiles/wall-top", side: "tiles/wall-side" },
};

// Every file the manifest uses, each once.
export function manifestFiles(m: Manifest): SpriteFile[] {
  const files = new Set<SpriteFile>();
  for (const art of Object.values(m.sprites)) {
    if (art.kind === "static") files.add(art.file);
    else {
      for (const set of [art, art.attack]) {
        if (!set) continue;
        for (const f of [...set.front, ...set.back, ...set.side]) files.add(f);
      }
    }
  }
  Object.values(m.ground).forEach((f) => files.add(f));
  Object.values(m.font).forEach((f) => files.add(f));
  files.add(m.walls.top);
  files.add(m.walls.side);
  return [...files];
}
