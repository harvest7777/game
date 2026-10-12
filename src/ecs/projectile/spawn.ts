import { addMovable, addSprite } from "../bundles";
import type { Vec2 } from "../shared/physics/math";
import { spawn, type Entity, type World } from "../world";
import type { Team } from "./components";
import {
  DEFAULT_PROJECTILE_SCALE,
  projectileDef,
  type ProjectileId,
} from "./definitions";

export type FireOptions = {
  def: ProjectileId;
  owner: Entity;
  team: Team;
  at: Vec2;
  // Which way to fire; doesn't need to be unit length.
  toward: Vec2;
};

// Creates a projectile entity from its definition. Everything taken from the
// definition is copied, so projectiles never share objects with it or with
// each other.
export function fireProjectile(world: World, options: FireOptions): Entity {
  const def = projectileDef(options.def);
  const length = Math.hypot(options.toward.x, options.toward.y);
  const direction =
    length === 0
      ? { x: 1, y: 0 }
      : { x: options.toward.x / length, y: options.toward.y / length };

  const entity = spawn(world);
  addMovable(world, entity, {
    at: options.at,
    hitbox: def.hitbox,
    response: def.walls ?? "stop",
  });
  addSprite(world, entity, {
    name: def.sprite.name,
    layer: "projectile",
    scale: def.sprite.scale ?? DEFAULT_PROJECTILE_SCALE,
    ...(def.sprite.outline && {
      outline: structuredClone(def.sprite.outline),
    }),
  });

  world.components.projectile.set(entity, {
    def: options.def,
    owner: options.owner,
    team: options.team,
    origin: { x: options.at.x, y: options.at.y },
    direction,
    age: 0,
  });

  if (def.faceDirection || def.spin) {
    const angle = Math.atan2(direction.y, direction.x);
    world.components.rotation.set(entity, { angle, previous: angle });
  }
  return entity;
}
