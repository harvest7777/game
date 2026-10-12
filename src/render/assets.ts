import type { SpriteArt, SpriteFile } from "../ecs/sprite/art";

export type Manifest = {
  // Each font maps characters to their glyph files.
  fonts: Record<FontName, Record<string, SpriteFile>>;
  // Every piece of art the game can show, so the atlas loads it all.
  sprites: SpriteArt[];
  walls: { top: SpriteFile; side: SpriteFile };
};

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

// The manifest for `sprites`, the game's art (ground included), plus the
// fonts and walls the renderer always needs.
export function createManifest(sprites: SpriteArt[]): Manifest {
  return {
    fonts: {
      bold: fontFiles("bold", "0123456789"),
      regular: fontFiles(
        "regular",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
          ".,:;!?'\"-+/()%",
      ),
    },
    sprites,
    walls: { top: "tiles/wall-top", side: "tiles/wall-side" },
  };
}

// Every file the manifest uses, each once.
export function manifestFiles(m: Manifest): SpriteFile[] {
  const files = new Set<SpriteFile>();
  for (const art of m.sprites) {
    if (art.kind === "static") files.add(art.file);
    else if (art.kind === "creature") {
      [...art.idle, ...art.attack].forEach((f) => files.add(f));
    } else if (art.kind === "animated") {
      for (const clip of Object.values(art.clips))
        clip.forEach((f) => files.add(f));
    } else {
      for (const set of [art, art.attack]) {
        if (!set) continue;
        for (const f of [...set.front, ...set.back, ...set.side]) files.add(f);
      }
    }
  }
  for (const font of Object.values(m.fonts)) {
    Object.values(font).forEach((f) => files.add(f));
  }
  files.add(m.walls.top);
  files.add(m.walls.side);
  return [...files];
}
