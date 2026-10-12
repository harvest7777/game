import type { Color, Outline } from "../ecs/sprite/components";
import type { Art } from "./art";
import type { SpriteFile } from "../ecs/sprite/art";
import type { FontName } from "./assets";
import type { GlyphMetrics } from "./loader";
import type { QuadBuffer } from "./quads";
import { OUTLINE_THICKNESS } from "./sprites";

// Font pixels between one glyph's ink and the next, and the width of a space.
export const LETTER_SPACING = 1;
export const SPACE_WIDTH = 3;
// Glyphs sit in 8x8 cells: capitals 7 tall with a row below for descenders.
export const GLYPH_CELL = 8;

export type PlacedGlyph = {
  file: SpriteFile;
  // Font pixels from the text's left edge to the left of the glyph's cell.
  x: number;
};

// Lines up a string's glyphs by their measured widths, so narrow letters
// take less room. `width` is from the first glyph's ink to the last's, in
// font pixels. Characters the font doesn't have are skipped.
export function layoutText(
  text: string,
  font: Record<string, SpriteFile>,
  glyphs: Map<SpriteFile, GlyphMetrics>,
): { glyphs: PlacedGlyph[]; width: number } {
  const placed: PlacedGlyph[] = [];
  let cursor = 0;
  let width = 0;
  for (const char of text) {
    if (char === " ") {
      cursor += SPACE_WIDTH;
      continue;
    }
    const file = font[char];
    const metrics = file === undefined ? undefined : glyphs.get(file);
    if (!metrics) continue;
    placed.push({ file, x: cursor - metrics.left });
    width = cursor + metrics.width;
    cursor = width + LETTER_SPACING;
  }
  return { glyphs: placed, width };
}

export type TextStyle = {
  font: FontName;
  // Screen pixels per font pixel.
  pixel: number;
  // Multiplies the white glyphs; its alpha fades the outline too.
  tint: Color;
  outline?: Outline;
  // Whether `x` is the left edge or the middle of the text.
  align?: "left" | "center";
};

// Draws `text` with its glyph cells' top at screen `y`, upright, in screen
// space. Returns how wide it came out, in screen pixels.
export function pushText(
  out: QuadBuffer,
  art: Art,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
): number {
  const font = art.manifest.fonts[style.font];
  const layout = layoutText(text, font, art.glyphs);
  const width = layout.width * style.pixel;
  const left = style.align === "center" ? x - width / 2 : x;
  const pad = style.outline ? OUTLINE_THICKNESS * style.pixel : 0;
  const size = GLYPH_CELL * style.pixel;

  for (const glyph of layout.glyphs) {
    const region = art.regions.get(glyph.file);
    if (!region) continue;
    const gx = left + glyph.x * style.pixel - pad;
    const gy = y - pad;
    out.push(
      gx,
      gy,
      gx + size + 2 * pad,
      gy,
      gx + size + 2 * pad,
      gy + size + 2 * pad,
      gx,
      gy + size + 2 * pad,
      region,
      {
        margin: style.outline ? OUTLINE_THICKNESS : 0,
        outline: style.outline,
        tint: style.tint,
      },
    );
  }
  return width;
}
