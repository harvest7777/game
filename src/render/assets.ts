import { itemDef, itemIds } from "../ecs/inventory/items";
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

// Explicit clips for authored animations. Stage duration determines playback;
// clip frame counts are visual-only and can change without touching gameplay.
export type AnimatedArt = {
  kind: "animated";
  clips: Record<string, SpriteFile[]>;
};

export type SpriteArt = WalkerArt | StaticArt | AnimatedArt;

export type Manifest = {
  // Each font maps characters to their glyph files.
  fonts: Record<FontName, Record<string, SpriteFile>>;
  // Keyed by Sprite.name.
  sprites: Record<string, SpriteArt>;
  // Keyed by ground type id.
  ground: Record<GroundType, SpriteFile>;
  walls: { top: SpriteFile; side: SpriteFile };
};

function walkerFrames(facing: string): SpriteFile[] {
  return [0, 1, 2].map((frame) => `player/${facing}-${frame}`);
}

// Bold: chunky digits for damage numbers. Regular: everything else.
export type FontName = "bold" | "regular";

const PUNCTUATION: Record<string, string> = {
  ".": "period",
  ",": "comma",
  ":": "colon",
  ";": "semicolon",
  "!": "exclamation",
  "?": "question",
  "'": "apostrophe",
  '"': "quote",
  "-": "dash",
  "+": "plus",
  "/": "slash",
  "(": "open-paren",
  ")": "close-paren",
  "%": "percent",
};

// File name for a character's glyph. Letters say their case, since some
// file systems treat "a" and "A" as the same name. Matches glyphFile in
// scripts/generate-sprites.mjs.
export function glyphFile(char: string): string {
  if (/[A-Z]/.test(char)) return `upper-${char.toLowerCase()}`;
  if (/[a-z]/.test(char)) return `lower-${char}`;
  return PUNCTUATION[char] ?? char;
}

function fontFiles(font: FontName, chars: string): Record<string, SpriteFile> {
  return Object.fromEntries(
    [...chars].map((char) => [char, `font/${font}/${glyphFile(char)}`]),
  );
}

export const manifest: Manifest = {
  fonts: {
    bold: fontFiles("bold", "0123456789"),
    regular: fontFiles(
      "regular",
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
        ".,:;!?'\"-+/()%",
    ),
  },
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
    slimeKing: {
      kind: "animated",
      clips: Object.fromEntries(
        [
          "idle",
          "ringTell",
          "ringCast",
          "aimTell",
          "sprayCast",
          "chargeTell",
          "chargeDash",
          "recover",
          "frenzyTell",
          "frenzyCast",
          "collapse",
          "exposed",
        ].map((clip) => [
          clip,
          [0, 1, 2].map((frame) => `enemies/slime-king/${clip}-${frame}`),
        ]),
      ),
    },
    bolt: { kind: "static", file: "projectiles/bolt" },
    orb: { kind: "static", file: "projectiles/orb" },
    star: { kind: "static", file: "projectiles/star" },
    prejudice: { kind: "static", file: "projectiles/prejudice" },
    // Item icons, one file per item under items/.
    ...Object.fromEntries(
      itemIds.map((id) => [
        itemDef(id).sprite,
        { kind: "static" as const, file: `items/${id}` },
      ]),
    ),
  },
  ground: { 0: "tiles/floor" },
  walls: { top: "tiles/wall-top", side: "tiles/wall-side" },
};

// Every file the manifest uses, each once.
export function manifestFiles(m: Manifest): SpriteFile[] {
  const files = new Set<SpriteFile>();
  for (const art of Object.values(m.sprites)) {
    if (art.kind === "static") files.add(art.file);
    else if (art.kind === "animated") {
      for (const clip of Object.values(art.clips))
        clip.forEach((f) => files.add(f));
    } else {
      for (const set of [art, art.attack]) {
        if (!set) continue;
        for (const f of [...set.front, ...set.back, ...set.side]) files.add(f);
      }
    }
  }
  Object.values(m.ground).forEach((f) => files.add(f));
  for (const font of Object.values(m.fonts)) {
    Object.values(font).forEach((f) => files.add(f));
  }
  files.add(m.walls.top);
  files.add(m.walls.side);
  return [...files];
}
