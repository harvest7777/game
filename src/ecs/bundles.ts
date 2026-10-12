import type { WallResponse } from "./movement/components";
import type { Sprite } from "./sprite/components";
import type { Vec2 } from "./shared/physics/math";
import type { Entity, World } from "./world";

type MovableOptions = { at: Vec2; r: number; response?: WallResponse };

// Something that moves and collides: position, a starting velocity of zero,
// a hitbox, and how it reacts to walls (slides by default).
export function addMovable(
  world: World,
  entity: Entity,
  { at, r, response = "slide" }: MovableOptions,
): void {
  const { components } = world;
  components.position.set(entity, { x: at.x, y: at.y });
  components.velocity.set(entity, { x: 0, y: 0 });
  components.hitbox.set(entity, { r });
  components.wallResponse.set(entity, response);
}

type ControllableOptions = { speed: number };

// Steered by the keyboard at `speed` tiles per second. Pair with addMovable.
export function addControllable(
  world: World,
  entity: Entity,
  { speed }: ControllableOptions,
): void {
  world.components.playerControlled.set(entity, true);
  world.components.speed.set(entity, speed);
}

// Drawn with `sprite`, starting out facing toward the viewer (world +y).
export function addSprite(world: World, entity: Entity, sprite: Sprite): void {
  world.components.sprite.set(entity, sprite);
  world.components.facing.set(entity, { x: 0, y: 1 });
}
