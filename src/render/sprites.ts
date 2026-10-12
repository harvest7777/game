import type { Entity, World } from "../ecs/world";
import type { Sprite, SpriteLayer } from "../ecs/sprite/components";
import type { Vec2 } from "../ecs/shared/physics/math";
import { regionOf, type Art } from "./art";
import type { SpriteFile } from "./assets";
import type { QuadBuffer } from "./quads";
import { worldToScreen, type View } from "./view";

// Sprite pixels per tile: an 8x8 sprite is one tile across.
export const SPRITE_PIXELS_PER_TILE = 8;
// Outline thickness in sprite pixels.
export const OUTLINE_THICKNESS = 0.2;
// Walk animation: frames per second, cycling step 1, stand, step 2, stand.
export const WALK_FPS = 8;
const WALK_CYCLE = [1, 0, 2, 0];

// Lower draws first, so the player ends up on top.
const LAYER_ORDER: Record<SpriteLayer, number> = {
  enemy: 0,
  projectile: 1,
  player: 2,
};

// Where to draw an entity between ticks: `alpha` is how far the current frame
// is from the previous tick (0) to the latest one (1).
export function interpolatedPosition(
  world: World,
  entity: Entity,
  alpha: number,
): Vec2 | undefined {
  const current = world.components.position.get(entity);
  if (!current) return undefined;
  const previous = world.components.previousPosition.get(entity) ?? current;
  return {
    x: previous.x + (current.x - previous.x) * alpha,
    y: previous.y + (current.y - previous.y) * alpha,
  };
}

type Placed = {
  entity: Entity;
  layer: number;
  depth: number;
  center: Vec2;
  sprite: Sprite;
  file: SpriteFile;
  flipX: boolean;
};

// Entity sprites, upright on screen whatever the camera angle, centered on
// the entity's interpolated position, one sprite pixel = 1/8 tile. Drawn by
// layer, then from the top of the screen down so lower sprites overlap.
// Sprites entirely off screen (outline and glow included) are skipped.
export function pushSprites(
  out: QuadBuffer,
  world: World,
  view: View,
  art: Art,
  alpha: number,
  time: number,
): void {
  const pixel = view.pixelsPerTile / SPRITE_PIXELS_PER_TILE;
  const placed: (Placed & { halfW: number; halfH: number })[] = [];

  for (const [entity, sprite] of world.components.sprite) {
    const position = interpolatedPosition(world, entity, alpha);
    if (!position) continue;
    const center = worldToScreen(view, position);
    const { file, flipX } = pickFrame(world, entity, sprite, art, view, time);
    const region = regionOf(art, file);
    const margin = marginOf(sprite);
    const halfW = (region.w / 2 + margin) * pixel;
    const halfH = (region.h / 2 + margin) * pixel;

    const offScreen =
      center.x + halfW < 0 ||
      center.x - halfW > view.width ||
      center.y + halfH < 0 ||
      center.y - halfH > view.height;
    if (offScreen) continue;

    placed.push({
      entity,
      layer: LAYER_ORDER[sprite.layer],
      depth: center.y,
      center,
      sprite,
      file,
      flipX,
      halfW,
      halfH,
    });
  }

  placed.sort(
    (a, b) => a.layer - b.layer || a.depth - b.depth || a.entity - b.entity,
  );

  for (const p of placed) {
    const left = p.center.x - p.halfW;
    const right = p.center.x + p.halfW;
    const top = p.center.y - p.halfH;
    const bottom = p.center.y + p.halfH;
    out.push(
      left,
      top,
      right,
      top,
      right,
      bottom,
      left,
      bottom,
      regionOf(art, p.file),
      p.flipX,
      marginOf(p.sprite),
      p.sprite.outline,
    );
  }
}

// Sprite pixels the quad needs past the art for its outline or glow.
function marginOf(sprite: Sprite): number {
  if (!sprite.outline) return 0;
  return Math.max(OUTLINE_THICKNESS, sprite.outline.glow?.radius ?? 0);
}

// Which file to draw and whether to mirror it. Walkers pick a facing from the
// direction they face *on screen* (so turning the camera turns them too) and
// cycle walk frames while moving.
function pickFrame(
  world: World,
  entity: Entity,
  sprite: Sprite,
  art: Art,
  view: View,
  time: number,
): { file: SpriteFile; flipX: boolean } {
  const spriteArt = art.manifest.sprites[sprite.name];
  if (!spriteArt) throw new Error(`no art for sprite "${sprite.name}"`);
  if (spriteArt.kind === "static")
    return { file: spriteArt.file, flipX: false };

  const facing = world.components.facing.get(entity) ?? { x: 0, y: 1 };
  const cos = Math.cos(view.angle);
  const sin = Math.sin(view.angle);
  const sx = facing.x * cos + facing.y * sin;
  const sy = -facing.x * sin + facing.y * cos;

  const velocity = world.components.velocity.get(entity);
  const moving =
    velocity !== undefined && (velocity.x !== 0 || velocity.y !== 0);
  const frame = moving
    ? WALK_CYCLE[Math.floor(time * WALK_FPS) % WALK_CYCLE.length]
    : 0;

  // Diagonals show the side view.
  if (Math.abs(sx) >= Math.abs(sy)) {
    return { file: spriteArt.side[frame], flipX: sx < 0 };
  }
  const frames = sy < 0 ? spriteArt.back : spriteArt.front;
  return { file: frames[frame], flipX: false };
}
