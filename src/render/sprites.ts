import { weaponDef } from "../ecs/projectile/weapons";
import type { Entity, World } from "../ecs/world";
import type { Sprite, SpriteLayer } from "../ecs/sprite/components";
import type { Vec2 } from "../ecs/shared/physics/math";
import { lerpAngle } from "./angle";
import { regionOf, type Art } from "./art";
import type { SpriteFile } from "./assets";
import type { QuadBuffer } from "./quads";
import { depthOf, worldToScreen, type View } from "./view";

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
  // Screen angle to turn the sprite by, or 0 for upright.
  turn: number;
};

// Entity sprites, centered on the entity's interpolated position, one sprite
// pixel = 1/8 tile. Upright on screen whatever the camera angle, unless the
// entity has a Rotation, in which case its art (which points right) is turned
// to face that world direction as seen through the camera. Drawn by
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
  const basePixel = view.pixelsPerTile / SPRITE_PIXELS_PER_TILE;
  const placed: (Placed & { halfW: number; halfH: number })[] = [];

  for (const [entity, sprite] of world.components.sprite) {
    const position = interpolatedPosition(world, entity, alpha);
    if (!position) continue;
    const center = worldToScreen(view, position);
    const { file, flipX } = pickFrame(world, entity, sprite, art, view, time);
    const region = regionOf(art, file);
    const margin = marginOf(sprite);
    const pixel = basePixel * (sprite.scale ?? 1);
    const halfW = (region.w / 2 + margin) * pixel;
    const halfH = (region.h / 2 + margin) * pixel;
    const rotation = world.components.rotation.get(entity);
    const turn = rotation
      ? lerpAngle(rotation.previous, rotation.angle, alpha) - view.angle
      : 0;

    // A turned sprite can reach as far as its corner in any direction.
    const reach = rotation ? Math.hypot(halfW, halfH) : 0;
    const offScreen =
      center.x + Math.max(halfW, reach) < 0 ||
      center.x - Math.max(halfW, reach) > view.width ||
      center.y + Math.max(halfH, reach) < 0 ||
      center.y - Math.max(halfH, reach) > view.height;
    if (offScreen) continue;

    placed.push({
      entity,
      layer: LAYER_ORDER[sprite.layer],
      depth: center.y,
      center,
      sprite,
      file,
      flipX,
      turn,
      halfW,
      halfH,
    });
  }

  placed.sort(
    (a, b) => a.layer - b.layer || a.depth - b.depth || a.entity - b.entity,
  );

  for (const p of placed) {
    // Corner offsets from the center, turned by p.turn (clockwise on screen
    // for positive angles, since y points down).
    const cos = Math.cos(p.turn);
    const sin = Math.sin(p.turn);
    const ax = p.halfW * cos;
    const ay = p.halfW * sin;
    const bx = -p.halfH * sin;
    const by = p.halfH * cos;
    const { x, y } = p.center;
    out.push(
      x - ax - bx,
      y - ay - by,
      x + ax - bx,
      y + ay - by,
      x + ax + bx,
      y + ay + by,
      x - ax + bx,
      y - ay + by,
      regionOf(art, p.file),
      {
        flipX: p.flipX,
        margin: marginOf(p.sprite),
        outline: p.sprite.outline,
        depth: depthOf(view, p.depth),
      },
    );
  }
}

// Sprite pixels the quad needs past the art for its outline or glow.
export function marginOf(sprite: Sprite): number {
  if (!sprite.outline) return 0;
  return Math.max(OUTLINE_THICKNESS, sprite.outline.glow?.radius ?? 0);
}

// Which file to draw and whether to mirror it. Walkers pick a facing from the
// direction they face *on screen* (so turning the camera turns them too),
// cycle walk frames while moving, and use their attack frames while
// thrusting.
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

  // Thrust frames swap in for the body; the legs keep walking.
  const set =
    spriteArt.attack && isThrusting(world, entity)
      ? spriteArt.attack
      : spriteArt;

  // Diagonals show the side view.
  if (Math.abs(sx) >= Math.abs(sy)) {
    return { file: set.side[frame], flipX: sx < 0 };
  }
  const frames = sy < 0 ? set.back : set.front;
  return { file: frames[frame], flipX: false };
}

// A shooter thrusts its weapon for the first half of each shot interval, so
// the attack animation pulses in time with its fire rate.
function isThrusting(world: World, entity: Entity): boolean {
  const shooter = world.components.shooter.get(entity);
  if (!shooter) return false;
  const interval = 1 / weaponDef(shooter.weapon).rate;
  return shooter.cooldown > interval / 2;
}
