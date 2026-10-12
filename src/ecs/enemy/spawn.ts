import { addMovable, addShooter, addSprite } from "../bundles";
import type { Vec2 } from "../shared/physics/math";
import { spawn, type Entity, type World } from "../world";
import { freshMemory } from "./behaviors";
import { enemyDef, type EnemyId } from "./definitions";

// Creates an enemy from its definition at `at`, which becomes its origin.
// Everything taken from the definition is copied, so enemies never share
// objects with it or with each other.
export function spawnEnemy(world: World, id: EnemyId, at: Vec2): Entity {
  const def = enemyDef(id);
  const entity = spawn(world);
  const { components } = world;

  addMovable(world, entity, { at, hitbox: def.hitbox });
  addSprite(world, entity, {
    name: def.sprite.name,
    layer: "enemy",
    ...(def.sprite.scale !== undefined && { scale: def.sprite.scale }),
    ...(def.sprite.outline && {
      outline: structuredClone(def.sprite.outline),
    }),
  });
  components.health.set(entity, { hp: def.health, max: def.health });
  components.team.set(entity, "enemy");
  components.speed.set(entity, def.speed);
  components.enemy.set(entity, { def: id, origin: { x: at.x, y: at.y } });
  components.brain.set(entity, { mode: "idle", memory: freshMemory() });
  if (def.weapon)
    addShooter(world, entity, { weapon: def.weapon, team: "enemy" });
  return entity;
}
