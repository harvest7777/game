import type { Color } from "../ecs/sprite/components";
import type { World } from "../ecs/world";
import type { QuadBuffer } from "./quads";
import { interpolatedPosition, SPRITE_PIXELS_PER_TILE } from "./sprites";
import { depthOf, worldToScreen, type View } from "./view";

// Bar size in sprite pixels: 7 wide (just inside the sprite) and 1 tall,
// starting half a sprite pixel below the bottom of the sprite. It scales
// with zoom like everything else.
const WIDTH = 7;
const HEIGHT = 1;
const GAP = 0.5;
// Dark frame around the bar, in screen pixels.
const BORDER = 1;

export const BAR_COLORS = {
  background: [0.1, 0.1, 0.1, 0.85] as Color,
  healthy: [0.25, 0.85, 0.3, 1] as Color,
  hurt: [0.95, 0.8, 0.2, 1] as Color,
  critical: [0.9, 0.2, 0.2, 1] as Color,
};

// Color of the filled part: yellow below half health, red below a quarter.
export function barColor(fraction: number): Color {
  if (fraction < 0.25) return BAR_COLORS.critical;
  if (fraction < 0.5) return BAR_COLORS.hurt;
  return BAR_COLORS.healthy;
}

const NO_REGION = { x: 0, y: 0, w: 0, h: 0 };

// A health bar under everything with health, centered under its sprite at
// its interpolated position and always level on screen. Drawn as a dark
// background with the remaining health filled in from the left. Each bar is
// at its owner's depth, so a wall in front of the owner hides the bar too.
export function pushHealthBars(
  out: QuadBuffer,
  world: World,
  view: View,
  alpha: number,
): void {
  const pixel = view.pixelsPerTile / SPRITE_PIXELS_PER_TILE;
  for (const [entity, health] of world.components.health) {
    const position = interpolatedPosition(world, entity, alpha);
    if (!position || health.max <= 0) continue;

    const center = worldToScreen(view, position);
    const spriteHalf = (SPRITE_PIXELS_PER_TILE / 2) * pixel;
    const left = center.x - (WIDTH / 2) * pixel;
    const right = center.x + (WIDTH / 2) * pixel;
    const top = center.y + spriteHalf + GAP * pixel;
    const bottom = top + HEIGHT * pixel;

    const offScreen =
      right + BORDER < 0 ||
      left - BORDER > view.width ||
      bottom + BORDER < 0 ||
      top - BORDER > view.height;
    if (offScreen) continue;

    const fraction = Math.max(0, Math.min(1, health.hp / health.max));
    const depth = depthOf(view, center.y);
    pushRect(
      out,
      left - BORDER,
      top - BORDER,
      right + BORDER,
      bottom + BORDER,
      BAR_COLORS.background,
      depth,
    );
    if (fraction > 0) {
      const filled = left + (right - left) * fraction;
      pushRect(out, left, top, filled, bottom, barColor(fraction), depth);
    }
  }
}

function pushRect(
  out: QuadBuffer,
  left: number,
  top: number,
  right: number,
  bottom: number,
  color: Color,
  depth: number,
): void {
  out.push(
    left,
    top,
    right,
    top,
    right,
    bottom,
    left,
    bottom,
    NO_REGION,
    false,
    0,
    { color },
    depth,
    0,
    true,
  );
}
