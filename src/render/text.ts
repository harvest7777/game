import type { World } from "../ecs/world";
import type { Art } from "./art";
import type { QuadBuffer } from "./quads";
import {
  interpolatedPosition,
  OUTLINE_THICKNESS,
  SPRITE_PIXELS_PER_TILE,
} from "./sprites";
import { worldToScreen, type View } from "./view";

// Text is drawn at this fraction of a tile tall.
export const TEXT_SCALE = 0.48;
// Font glyphs are 6x7 in an 8x8 cell, one blank column to their left;
// characters are placed this many font pixels apart.
export const GLYPH = { width: 6, left: 1, cell: 8 };
export const TEXT_ADVANCE = 7;
// Fades out over the last third of its life.
const FADE_FROM = 2 / 3;
const OUTLINE = { color: [0, 0, 0, 1] as [number, number, number, number] };

// Floating text, centered on where it started and rising up the screen as it
// ages (whichever way the camera faces, easing out), beginning just above where a
// one-tile sprite's top would be. Upright, tinted its color, outlined in
// black, and fading at the end.
export function pushFloatingText(
  out: QuadBuffer,
  world: World,
  view: View,
  art: Art,
  alpha: number,
): void {
  const font = (view.pixelsPerTile / SPRITE_PIXELS_PER_TILE) * TEXT_SCALE;
  const tall = GLYPH.cell * font;

  for (const [entity, text] of world.components.floatingText) {
    const position = interpolatedPosition(world, entity, alpha);
    if (!position) continue;
    const age = text.previousAge + (text.age - text.previousAge) * alpha;

    const center = worldToScreen(view, position);
    const progress = Math.min(1, age / text.lifetime);
    const eased = 1 - (1 - progress) * (1 - progress);
    const raised = (text.lift + text.rise * eased) * view.pixelsPerTile;
    const bottom = center.y - view.pixelsPerTile / 2 - raised;
    const top = bottom - tall;
    const width = ((text.text.length - 1) * TEXT_ADVANCE + GLYPH.width) * font;
    const firstLeft = center.x - width / 2 - GLYPH.left * font;

    if (bottom < 0 || top > view.height) continue;
    if (firstLeft + width + tall < 0 || firstLeft > view.width) continue;

    const fade =
      age < text.lifetime * FADE_FROM
        ? 1
        : 1 -
          (age - text.lifetime * FADE_FROM) / (text.lifetime * (1 - FADE_FROM));
    const opacity = Math.max(0, Math.min(1, fade));
    const tint: [number, number, number, number] = [
      text.color[0],
      text.color[1],
      text.color[2],
      text.color[3] * opacity,
    ];
    const pad = OUTLINE_THICKNESS * font;

    [...text.text].forEach((char, i) => {
      const file = art.manifest.font[char];
      const region = file && art.regions.get(file);
      if (!region) return;
      const left = firstLeft + i * TEXT_ADVANCE * font - pad;
      const right = left + tall + 2 * pad;
      out.push(
        left,
        top - pad,
        right,
        top - pad,
        right,
        bottom + pad,
        left,
        bottom + pad,
        region,
        { margin: OUTLINE_THICKNESS, outline: OUTLINE, tint },
      );
    });
  }
}
