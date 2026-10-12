import { phaseOf } from "../enemy/definitions";
import type { BossAction, BossStage } from "../enemy/sequences";
import { IDLE_CLIP } from "../sprite/art";
import type { Entity, World } from "../world";

// Creates or restarts the current phase's deterministic sequence rotation.
// A health-phase switch calls this before the next action tick.
export function resetBossAction(world: World, entity: Entity): void {
  const enemy = world.components.enemy.get(entity);
  if (!enemy) return;
  const { def } = enemy;
  const rotation = phaseOf(def, enemy.phase?.name)?.rotation;
  if (!rotation?.length || !def.sequences) {
    world.components.bossAction.delete(entity);
    world.components.animation.delete(entity);
    world.components.vulnerable.delete(entity);
    world.components.invulnerable.delete(entity);
    return;
  }
  world.components.bossAction.set(entity, {
    sequence: rotation[0],
    rotationIndex: 0,
    stageIndex: 0,
    time: 0,
    previousTime: 0,
    active: false,
  });
  world.components.animation.set(entity, {
    clip: IDLE_CLIP,
    time: 0,
    previousTime: 0,
    duration: 1,
  });
  world.components.vulnerable.delete(entity);
  world.components.invulnerable.delete(entity);
}

// The live stage, used by the brain to apply an action's movement override.
export function bossStage(world: World, entity: Entity): BossStage | undefined {
  const action = world.components.bossAction.get(entity);
  if (!action?.active) return undefined;
  return stageFor(world, entity, action);
}

// The stage an action is on, from its enemy's definition.
export function stageFor(
  world: World,
  entity: Entity,
  action: BossAction,
): BossStage | undefined {
  return definitionFor(world, entity)?.sequences?.[action.sequence]?.stages[
    action.stageIndex
  ];
}

function definitionFor(world: World, entity: Entity) {
  return world.components.enemy.get(entity)?.def;
}
