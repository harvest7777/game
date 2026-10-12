import type { Hitbox, WallResponse } from "./movement/components";
import type { WeaponDef } from "./projectile/weapons";
import type { Sprite } from "./sprite/components";
import type { Vec2 } from "./shared/physics/math";
import type { Entity, World } from "./world";

type MovableOptions = {
  at: Vec2;
  hitbox: Hitbox;
  // "pass" means it goes through walls and solids.
  response?: WallResponse | "pass";
};

// Something that moves and collides: position, a starting velocity of zero,
// a hitbox, and how it reacts to walls (slides by default, or "pass").
export function addMovable(
  world: World,
  entity: Entity,
  { at, hitbox, response = "slide" }: MovableOptions,
): void {
  const { components } = world;
  components.position.set(entity, { x: at.x, y: at.y });
  components.velocity.set(entity, { x: 0, y: 0 });
  // Copied so entities never share one hitbox object.
  components.hitbox.set(entity, { ...hitbox });
  if (response !== "pass") components.wallResponse.set(entity, response);
}

type ControllableOptions = { moveSpeed?: number };

// Steered by the keyboard, with autofire off until it's toggled on. A
// stat-bearing character derives movement from Speed; callers can provide a
// fallback movement speed for a simpler controllable entity.
export function addControllable(
  world: World,
  entity: Entity,
  { moveSpeed }: ControllableOptions = {},
): void {
  world.components.playerControlled.set(entity, true);
  world.components.autoFire.set(entity, false);
  if (moveSpeed !== undefined)
    world.components.moveSpeed.set(entity, moveSpeed);
}

// Drawn with `sprite`, starting out facing toward the viewer (world +y).
export function addSprite(world: World, entity: Entity, sprite: Sprite): void {
  world.components.sprite.set(entity, sprite);
  world.components.facing.set(entity, { x: 0, y: 1 });
}

type ShooterOptions = { weapon: WeaponDef };

// Autofires `weapon`, starting right away. Its shots take the entity's own
// team, so give it one.
export function addShooter(
  world: World,
  entity: Entity,
  { weapon }: ShooterOptions,
): void {
  world.components.shooter.set(entity, { weapon, cooldown: 0 });
}
