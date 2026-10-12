import { MAX_REACH } from "./distance";
import type { Entity, World } from "../ecs/world";
import type { Color, Sprite, SpriteLayer } from "../ecs/sprite/components";
import type { Vec2 } from "../ecs/shared/physics/math";
import { lerpAngle } from "./angle";
import { regionOf, type Art } from "./art";
import { IDLE_CLIP, type SpriteFile } from "../ecs/sprite/art";
import type { QuadBuffer } from "./quads";
import { depthOf, worldToScreen, type View } from "./view";
import { shotsPerSecond } from "../ecs/stats/runtime";

// Sprite pixels per tile: an 8x8 sprite is one tile across.
export const SPRITE_PIXELS_PER_TILE = 8;
// Outline thickness in sprite pixels.
export const OUTLINE_THICKNESS = 0.2;
// Walk animation: frames per second, cycling step 1, stand, step 2, stand.
export const WALK_FPS = 8;
const WALK_CYCLE = [1, 0, 2, 0];
const MIN_LOOT_BAG_FLASH_BRIGHTNESS = 0.35;

// Sprite layers in the order they're drawn, so the player ends up on top.
export const SPRITE_LAYERS: SpriteLayer[] = [
  "ground",
  "enemy",
  "projectile",
  "player",
];
const LAYER_ORDER = Object.fromEntries(
  SPRITE_LAYERS.map((layer, i) => [layer, i]),
) as Record<SpriteLayer, number>;

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

// Shader tint for a bag nearing expiry. Its pulse eases from full color to
// black and back; integrating the configured frequency keeps the phase smooth
// while the flashes accelerate.
export function lootBagTint(
  world: World,
  entity: Entity,
  alpha: number,
): Color | undefined {
  const bag = world.components.lootBag.get(entity);
  const flash = bag?.def.expiryFlash;
  if (!bag || !flash) return undefined;
  const age = bag.previousAge + (bag.age - bag.previousAge) * alpha;
  const elapsed = age - (bag.def.lifetime - flash.duration);
  if (elapsed <= 0) return undefined;
  const withinWarning = Math.min(flash.duration, elapsed);
  const acceleration =
    (flash.endFrequency - flash.startFrequency) / flash.duration;
  const cycles =
    flash.startFrequency * withinWarning +
    0.5 * acceleration * withinWarning * withinWarning;
  const black = 0.5 - 0.5 * Math.cos(Math.PI * 2 * cycles);
  const brightness = 1 - black * (1 - MIN_LOOT_BAG_FLASH_BRIGHTNESS);
  return [brightness, brightness, brightness, 1];
}

// The art's true pixel dimensions after visual scale. Most sprites are 8px,
// but bosses can use larger clips; UI anchored to a sprite must not assume a
// one-tile body.
export function spritePixels(
  world: World,
  entity: Entity,
  art?: Art,
): { width: number; height: number } {
  const sprite = world.components.sprite.get(entity);
  const scale = sprite?.scale ?? 1;
  const fallback = {
    width: SPRITE_PIXELS_PER_TILE * scale,
    height: SPRITE_PIXELS_PER_TILE * scale,
  };
  if (!sprite || !art) return fallback;
  const spriteArt = sprite.art;
  const file =
    spriteArt.kind === "static"
      ? spriteArt.file
      : spriteArt.kind === "animated"
        ? spriteArt.clips[
            world.components.animation.get(entity)?.clip ?? IDLE_CLIP
          ]?.[0]
        : spriteArt.front[0];
  if (!file) return fallback;
  const region = regionOf(art, file);
  return { width: region.w * scale, height: region.h * scale };
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
// Sprites entirely off screen (outline and glow included) are skipped. With
// `only`, draws just that layer's sprites.
export function pushSprites(
  out: QuadBuffer,
  world: World,
  view: View,
  art: Art,
  alpha: number,
  time: number,
  only?: SpriteLayer,
): void {
  const basePixel = view.pixelsPerTile / SPRITE_PIXELS_PER_TILE;
  const placed: (Placed & { halfW: number; halfH: number })[] = [];

  for (const [entity, sprite] of world.components.sprite) {
    if (only !== undefined && sprite.layer !== only) continue;
    const position = interpolatedPosition(world, entity, alpha);
    if (!position) continue;
    const center = worldToScreen(view, position);
    const { file, flipX } = pickFrame(world, entity, sprite, view, alpha, time);
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
        tint: lootBagTint(world, p.entity, alpha),
      },
    );
  }
}

// Sprite pixels the quad needs past the art for its outline or glow, up to
// as far as the distance map reaches (bigger glows are cut off there).
export function marginOf(sprite: Sprite): number {
  if (!sprite.outline) return 0;
  const glow = sprite.outline.glow?.radius ?? 0;
  return Math.min(MAX_REACH, Math.max(OUTLINE_THICKNESS, glow));
}

// Which file to draw and whether to mirror it. Walkers pick a facing from the
// direction they face *on screen* (so turning the camera turns them too),
// cycle walk frames while moving, and use their attack frames while
// thrusting.
function pickFrame(
  world: World,
  entity: Entity,
  sprite: Sprite,
  view: View,
  alpha: number,
  time: number,
): { file: SpriteFile; flipX: boolean } {
  const spriteArt = sprite.art;
  if (spriteArt.kind === "static")
    return { file: spriteArt.file, flipX: false };
  if (spriteArt.kind === "animated") {
    const animation = world.components.animation.get(entity);
    const clip = spriteArt.clips[animation?.clip ?? IDLE_CLIP];
    if (!clip) throw new Error(`no clip "${animation?.clip}" in its art`);
    const elapsed = animation
      ? animation.previousTime +
        (animation.time - animation.previousTime) * alpha
      : 0;
    const progress = animation
      ? Math.max(0, Math.min(1, elapsed / animation.duration))
      : 0;
    return {
      file: clip[Math.min(clip.length - 1, Math.floor(progress * clip.length))],
      flipX: false,
    };
  }

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
  const interval = 1 / shotsPerSecond(world, entity, shooter.weapon.rate);
  return shooter.cooldown > interval / 2;
}
