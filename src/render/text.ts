import type { Color } from "../ecs/sprite/components";
import type { World } from "../ecs/world";
import type { Art } from "./art";
import type { QuadBuffer } from "./quads";
import {
  interpolatedPosition,
  SPRITE_PIXELS_PER_TILE,
  spriteLift,
  spritePixels,
} from "./sprites";
import { GLYPH_CELL, pushText } from "./textLayout";
import { worldToScreen, type View } from "./view";

// Floating text is drawn at this fraction of a tile tall.
export const TEXT_SCALE = 0.48;
// Fades out over the last third of its life.
const FADE_FROM = 2 / 3;
const OUTLINE = { color: [0, 0, 0, 1] as Color };

// Floating text in the bold font, centered over what it follows and rising
// up the screen as it ages (whichever way the camera faces, easing out),
// beginning just above where a one-tile sprite's top would be. Upright,
// tinted its color, outlined in black, and fading at the end.
export function pushFloatingText(
  out: QuadBuffer,
  world: World,
  view: View,
  art: Art,
  alpha: number,
): void {
  const pixel = (view.pixelsPerTile / SPRITE_PIXELS_PER_TILE) * TEXT_SCALE;
  const tall = GLYPH_CELL * pixel;

  for (const [entity, text] of world.components.floatingText) {
    // Follow the target's own interpolated path directly. Keeping a copied
    // position on the text is still useful once its target disappears, but
    // using it while the target lives can leave the two interpolation tracks
    // out of step when an enemy changes direction.
    const position =
      (text.follows === undefined
        ? undefined
        : interpolatedPosition(world, text.follows, alpha)) ??
      interpolatedPosition(world, entity, alpha);
    if (!position) continue;
    const age = text.previousAge + (text.age - text.previousAge) * alpha;

    const center = worldToScreen(view, position);
    const progress = Math.min(1, age / text.lifetime);
    const eased = 1 - (1 - progress) * (1 - progress);
    const raised = (text.lift + text.rise * eased) * view.pixelsPerTile;
    const anchor = text.follows ?? entity;
    const spriteHeight = spritePixels(world, anchor, art).height;
    const lift = spriteLift(world, anchor, art) * view.pixelsPerTile;
    const bottom =
      center.y -
      lift -
      (spriteHeight / 2) * (view.pixelsPerTile / SPRITE_PIXELS_PER_TILE) -
      raised;
    const top = bottom - tall;
    if (bottom < 0 || top > view.height) continue;
    // Generous horizontal check; text is never wider than a few tiles.
    const reach = view.pixelsPerTile * 3;
    if (center.x + reach < 0 || center.x - reach > view.width) continue;

    const fade =
      age < text.lifetime * FADE_FROM
        ? 1
        : 1 -
          (age - text.lifetime * FADE_FROM) / (text.lifetime * (1 - FADE_FROM));
    const opacity = Math.max(0, Math.min(1, fade));

    pushText(out, art, text.text, center.x, top, {
      font: "bold",
      pixel,
      tint: [
        text.color[0],
        text.color[1],
        text.color[2],
        text.color[3] * opacity,
      ],
      outline: OUTLINE,
      align: "center",
    });
  }
}
