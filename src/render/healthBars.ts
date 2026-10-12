import type { Color, SpriteLayer } from "../ecs/sprite/components";
import { HURT_FADE, HURT_SHOWN } from "../ecs/combat/hurt";
import type { Entity, World } from "../ecs/world";
import { effectiveResourceMax } from "../ecs/stats/runtime";
import { STAT } from "../ecs/stats/components";
import type { Art } from "./art";
import type { QuadBuffer } from "./quads";
import {
  interpolatedPosition,
  farOffScreen,
  marginOf,
  SPRITE_LAYERS,
  spriteLift,
  SPRITE_PIXELS_PER_TILE,
  spritePixels,
} from "./sprites";
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

// Color of a health bar's filled part, blending smoothly from red when
// empty through yellow at half to green when full. Shared by the world's
// bars and the HUD's, so they always match.
export function healthColor(fraction: number): Color {
  const f = Math.max(0, Math.min(1, fraction));
  return f < 0.5
    ? mix(BAR_COLORS.critical, BAR_COLORS.hurt, f / 0.5)
    : mix(BAR_COLORS.hurt, BAR_COLORS.healthy, (f - 0.5) / 0.5);
}

function mix(a: Color, b: Color, t: number): Color {
  return a.map((channel, i) => channel + (b[i] - channel) * t) as Color;
}

const NO_REGION = { x: 0, y: 0, w: 0, h: 0 };

// A health bar under everything with health that's showing (see barShown),
// centered under its sprite at
// its interpolated position and always level on screen. Drawn as a dark
// background with the remaining health filled in from the left, colored by
// healthColor. Each bar is
// at its owner's depth, so a wall in front of the owner hides the bar too.
// With `only`, draws just the bars of entities on that sprite layer
// (anything without a sprite counts as on the first layer).
export function pushHealthBars(
  out: QuadBuffer,
  world: World,
  view: View,
  alpha: number,
  art?: Art,
  only?: SpriteLayer,
): void {
  const pixel = view.pixelsPerTile / SPRITE_PIXELS_PER_TILE;
  for (const [entity, health] of world.components.health) {
    // Checked first, so the many bars not showing cost almost nothing.
    const shown = barShown(world, entity, alpha);
    if (shown <= 0) continue;
    const layer =
      world.components.sprite.get(entity)?.layer ?? SPRITE_LAYERS[0];
    if (only !== undefined && layer !== only) continue;
    const position = interpolatedPosition(world, entity, alpha);
    const max = effectiveResourceMax(world, entity, STAT.HEALTH);
    if (!position || max === undefined || max <= 0) continue;

    const feet = worldToScreen(view, position);
    if (farOffScreen(view, feet)) continue;
    // Below the sprite as drawn, outline and glow included, so big or
    // glowing sprites don't cover their own bar.
    const sprite = world.components.sprite.get(entity);
    const scale = sprite?.scale ?? 1;
    const margin = sprite ? marginOf(sprite) : 0;
    const height = spritePixels(world, entity, art).height;
    const center = {
      x: feet.x,
      y: feet.y - spriteLift(world, entity, art, height) * view.pixelsPerTile,
    };
    const spriteHalf = (height / 2 + margin * scale) * pixel;
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

    const fraction = Math.max(0, Math.min(1, health.value / max));
    const depth = depthOf(view, feet.y);
    pushRect(
      out,
      left - BORDER,
      top - BORDER,
      right + BORDER,
      bottom + BORDER,
      faded(BAR_COLORS.background, shown),
      depth,
    );
    if (fraction > 0) {
      const filled = left + (right - left) * fraction;
      const color = faded(healthColor(fraction), shown);
      pushRect(out, left, top, filled, bottom, color, depth);
    }
  }
}

// How much of an entity's bar shows, 0 to 1: the player's always does;
// anything else's only after it's been hurt, in full for HURT_SHOWN seconds
// and then fading out over HURT_FADE.
export function barShown(world: World, entity: Entity, alpha: number): number {
  if (world.components.playerControlled.has(entity)) return 1;
  const hurt = world.components.recentlyHurt.get(entity);
  if (!hurt) return 0;
  const age = hurt.previousAge + (hurt.age - hurt.previousAge) * alpha;
  if (age <= HURT_SHOWN) return 1;
  return Math.max(0, 1 - (age - HURT_SHOWN) / HURT_FADE);
}

function faded(color: Color, shown: number): Color {
  return shown >= 1 ? color : [color[0], color[1], color[2], color[3] * shown];
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
  out.push(left, top, right, top, right, bottom, left, bottom, NO_REGION, {
    outline: { color },
    depth,
    fill: true,
  });
}
