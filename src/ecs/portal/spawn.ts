import { addSprite } from "../bundles";
import type { Vec2 } from "../shared/physics/math";
import { spawn, type Entity, type World } from "../world";
import type { PortalDef } from "./definitions";

// A portal set into the floor at `at`, under anything lying on it, like a
// loot bag. It has no hitbox, health or team:
// nothing collides with it or hurts it.
export function spawnPortal(world: World, def: PortalDef, at: Vec2): Entity {
  const entity = spawn(world);
  world.components.position.set(entity, { x: at.x, y: at.y });
  addSprite(world, entity, {
    art: def.sprite.art,
    layer: "floor",
    ...(def.sprite.outline && {
      outline: structuredClone(def.sprite.outline),
    }),
  });
  world.components.portal.set(entity, { def });
  return entity;
}

// The nearest portal close enough for something at `at` to enter.
export function portalAt(world: World, at: Vec2): Entity | undefined {
  let nearest: Entity | undefined;
  let nearestDistance = Infinity;
  for (const [entity, { def }] of world.components.portal) {
    const p = world.components.position.get(entity);
    if (!p) continue;
    const distance = Math.hypot(p.x - at.x, p.y - at.y);
    if (distance <= (def.radius ?? 1) && distance < nearestDistance) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  return nearest;
}
