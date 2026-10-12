import type { Color, SpriteLayer } from "../ecs/sprite/components";
import type { World } from "../ecs/world";
import type { QuadBuffer } from "./quads";
import { interpolatedPosition } from "./sprites";
import { worldToScreen, type View } from "./view";

// Optional overlays for seeing what the game is doing. Drawn over everything,
// walls included.
export type RenderDebug = {
  // A circle outline around every entity's hitbox.
  hitboxes: boolean;
};

export function createRenderDebug(): RenderDebug {
  return { hitboxes: false };
}

export const HITBOX_COLORS: Record<SpriteLayer | "other", Color> = {
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
  alpha: number,
  debug: RenderDebug,
): void {
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
      false,
      0,
      { color: HITBOX_COLORS[layer] },
      0,
      radius / half,
    );
  }
}
