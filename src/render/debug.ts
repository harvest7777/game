import type { Color, SpriteLayer } from "../ecs/sprite/components";
import type { Art } from "./art";
import { GLYPH_CELL, layoutText, pushText } from "./textLayout";
import type { World } from "../ecs/world";
import type { QuadBuffer } from "./quads";
import { interpolatedPosition } from "./sprites";
import { worldToScreen, type View } from "./view";

// Optional overlays for seeing what the game is doing. Drawn over everything,
// walls included.
export type RenderDebug = {
  // A circle outline around every entity's hitbox.
  hitboxes: boolean;
  // Every glyph of both fonts, in the top-right corner.
  font: boolean;
};

export function createRenderDebug(): RenderDebug {
  return { hitboxes: false, font: false };
}

export const HITBOX_COLORS: Record<SpriteLayer | "other", Color> = {
  floor: [0.6, 0.6, 0.6, 1],
  ground: [0.6, 0.6, 0.6, 1],
  player: [0.3, 1, 0.4, 1],
  enemy: [1, 0.3, 0.3, 1],
  projectile: [1, 0.9, 0.2, 1],
  other: [1, 1, 1, 1],
};

// Room around a ring so its line isn't clipped at the quad's edge, in pixels.
const RING_PADDING = 2;
const NO_REGION = { x: 0, y: 0, w: 0, h: 0 };

export function pushDebug(
  out: QuadBuffer,
  world: World,
  view: View,
  art: Art,
  alpha: number,
  debug: RenderDebug,
): void {
  if (debug.font) pushFontSheet(out, view, art);
  if (!debug.hitboxes) return;

  for (const [entity, hitbox] of world.components.hitbox) {
    if (hitbox.r <= 0) continue;
    const position = interpolatedPosition(world, entity, alpha);
    if (!position) continue;

    const center = worldToScreen(view, position);
    const radius = hitbox.r * view.pixelsPerTile;
    const half = radius + RING_PADDING;
    const offScreen =
      center.x + half < 0 ||
      center.x - half > view.width ||
      center.y + half < 0 ||
      center.y - half > view.height;
    if (offScreen) continue;

    const layer = world.components.sprite.get(entity)?.layer ?? "other";
    out.push(
      center.x - half,
      center.y - half,
      center.x + half,
      center.y - half,
      center.x + half,
      center.y + half,
      center.x - half,
      center.y + half,
      NO_REGION,
      {
        outline: { color: HITBOX_COLORS[layer] },
        depth: 0,
        ring: radius / half,
      },
    );
  }
}

const FONT_SHEET = [
  { font: "regular", text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  { font: "regular", text: "abcdefghijklmnopqrstuvwxyz" },
  { font: "regular", text: "0123456789 .,:;!?'\"-+/()%" },
  { font: "regular", text: "The quick brown fox jumps over the lazy dog." },
  { font: "bold", text: "0123456789" },
] as const;
const SHEET_PIXEL = 3;
const SHEET_MARGIN = 16;

// Every glyph, right-aligned in the top-right corner, for checking the font.
function pushFontSheet(out: QuadBuffer, view: View, art: Art): void {
  const lineHeight = (GLYPH_CELL + 3) * SHEET_PIXEL;
  FONT_SHEET.forEach(({ font, text }, line) => {
    const style = {
      font,
      pixel: SHEET_PIXEL,
      tint: [1, 1, 1, 1] as Color,
      outline: { color: [0, 0, 0, 1] as Color },
    };
    const width =
      layoutText(text, art.manifest.fonts[font], art.glyphs).width *
      SHEET_PIXEL;
    const x = view.width - SHEET_MARGIN - width;
    pushText(out, art, text, x, SHEET_MARGIN + line * lineHeight, style);
  });
}
