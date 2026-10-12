import { addMovable, addSprite } from "../bundles";
import type { Vec2 } from "../shared/physics/math";
import { isWall } from "../tiles";
import { spawn, type Entity, type World } from "../world";
import { freshMemory } from "./behaviors";
import { resetBossAction } from "../shared/bossActions";
import { armForPhase } from "../shared/arming";
import type { EnemyDef } from "./definitions";
import { addStats } from "../stats/runtime";

// Creates an enemy from its definition at `at`, which becomes its origin.
// Everything taken from the definition is copied, so enemies never share
// objects with it or with each other. Each rolls its own quirks and a speed
// within 10% of its kind's, so a group spreads out instead of moving as one.
export function spawnEnemy(world: World, def: EnemyDef, at: Vec2): Entity {
  const entity = spawn(world);
  const { components } = world;

  addMovable(world, entity, { at, hitbox: def.hitbox });
  addSprite(world, entity, {
    art: def.sprite.art,
    layer: "enemy",
    ...(def.sprite.scale !== undefined && { scale: def.sprite.scale }),
    ...(def.sprite.outline && {
      outline: structuredClone(def.sprite.outline),
    }),
  });
  addStats(world, entity, def.stats);
  components.team.set(entity, "enemy");
  const random = world.random;
  components.moveSpeed.set(
    entity,
    def.speed * between(random, ...SPEED_SPREAD),
  );
  components.enemy.set(entity, {
    def,
    origin: { x: at.x, y: at.y },
    quirks: {
      reach: between(random, ...REACH_SPREAD),
      flipOrbit: random() < 0.5,
    },
    ...(def.phases && { phase: { name: def.phases.start, time: 0 } }),
  });
  components.brain.set(entity, { mode: "idle", memory: freshMemory() });
  resetBossAction(world, entity);
  armForPhase(world, entity);
  return entity;
}

// Enemies per square tile a crowd starts out at, loose enough that they
// aren't already piled up.
const CROWD_DENSITY = 0.5;

// Spawns `count` enemies scattered over a disc around `center`, sized so the
// crowd starts loose, keeping them off walls (a spot on a wall is rerolled,
// and given up on after a few tries). For stress tests and swarms.
export function spawnCrowd(
  world: World,
  def: EnemyDef,
  center: Vec2,
  count: number,
): Entity[] {
  const radius = Math.sqrt(count / (CROWD_DENSITY * Math.PI));
  const spawned: Entity[] = [];
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = world.random() * 2 * Math.PI;
      const distance = radius * Math.sqrt(world.random());
      const at = {
        x: center.x + Math.cos(angle) * distance,
        y: center.y + Math.sin(angle) * distance,
      };
      if (isWall(world.tiles, Math.floor(at.x), Math.floor(at.y))) continue;
      spawned.push(spawnEnemy(world, def, at));
      break;
    }
  }
  return spawned;
}

const SPEED_SPREAD = [0.9, 1.1] as const;
const REACH_SPREAD = [0.8, 1.2] as const;

function between(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}
