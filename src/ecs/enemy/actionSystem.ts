import type { Vec2 } from "../shared/physics/math";
import { IDLE_CLIP } from "../sprite/art";
import type { Entity, World } from "../world";
import { playCue } from "./cues";
import { stageFor } from "../shared/bossActions";
import { phaseOf } from "./definitions";
import type { BossAction, BossStage } from "./sequences";

// Advances authored timelines. Cues fire exactly when their timestamp is
// crossed, regardless of tick length; a completed sequence takes the next
// entry in its phase's declared rotation.
export function bossActionSystem(world: World, dt: number): void {
  for (const [entity, action] of world.components.bossAction) {
    if (world.components.asleep.has(entity)) continue;
    if (world.components.target.get(entity) === undefined) {
      action.active = false;
      action.time = action.previousTime = 0;
      world.components.vulnerable.delete(entity);
      world.components.invulnerable.delete(entity);
      setAnimation(world, entity, IDLE_CLIP, 0, 1);
      continue;
    }
    if (!action.active) {
      action.active = true;
      enterStage(world, entity, action);
    }

    let remaining = dt;
    for (
      let transitions = 0;
      remaining > 0 && transitions < 32;
      transitions++
    ) {
      const stage = stageFor(world, entity, action);
      if (!stage || stage.duration <= 0) break;
      const from = action.time;
      const step = Math.min(remaining, stage.duration - action.time);
      action.previousTime = from;
      action.time += step;
      fireCrossedCues(world, entity, stage, from, action.time, action);
      setAnimation(world, entity, stage.animation, action.time, stage.duration);
      remaining -= step;
      if (action.time < stage.duration) break;
      advanceStage(world, entity, action);
    }
  }
}

function advanceStage(world: World, entity: Entity, action: BossAction): void {
  const enemy = world.components.enemy.get(entity);
  const sequence = enemy?.def.sequences?.[action.sequence];
  const rotation = enemy && phaseOf(enemy.def, enemy.phase?.name)?.rotation;
  if (!sequence || !rotation?.length) return;
  action.stageIndex++;
  if (action.stageIndex >= sequence.stages.length) {
    action.rotationIndex = (action.rotationIndex + 1) % rotation.length;
    action.sequence = rotation[action.rotationIndex];
    action.stageIndex = 0;
  }
  action.time = action.previousTime = 0;
  enterStage(world, entity, action);
}

function enterStage(world: World, entity: Entity, action: BossAction): void {
  const stage = stageFor(world, entity, action);
  if (!stage) return;
  if (stage.lockAim) action.heading = aimAtTarget(world, entity);
  world.components.vulnerable.delete(entity);
  if (stage.vulnerable !== undefined) {
    world.components.vulnerable.set(entity, { multiplier: stage.vulnerable });
  }
  if (stage.invulnerable) world.components.invulnerable.set(entity, true);
  else world.components.invulnerable.delete(entity);
  setAnimation(world, entity, stage.animation, 0, stage.duration);
  fireCrossedCues(world, entity, stage, 0, 0, action, true);
}

function fireCrossedCues(
  world: World,
  entity: Entity,
  stage: BossStage,
  from: number,
  to: number,
  action: BossAction,
  entering = false,
): void {
  const at = world.components.position.get(entity);
  if (!at) return;
  const aim = () => action.heading ?? aimAtTarget(world, entity);
  for (const { at: cueAt, cue } of stage.cues ?? []) {
    const crossed = entering ? cueAt === 0 : cueAt > from && cueAt <= to;
    if (crossed) playCue(world, cue, { entity, at, aim });
  }
}

function aimAtTarget(world: World, entity: Entity): Vec2 {
  const at = world.components.position.get(entity);
  const target = world.components.target.get(entity);
  const targetAt =
    target === undefined ? undefined : world.components.position.get(target);
  if (at && targetAt) {
    const x = targetAt.x - at.x;
    const y = targetAt.y - at.y;
    const length = Math.hypot(x, y);
    if (length > 0) return { x: x / length, y: y / length };
  }
  return world.components.facing.get(entity) ?? { x: 1, y: 0 };
}

function setAnimation(
  world: World,
  entity: Entity,
  clip: string,
  time: number,
  duration: number,
): void {
  const animation = world.components.animation.get(entity);
  if (animation?.clip === clip) {
    animation.previousTime = animation.time;
    animation.time = time;
    animation.duration = duration;
  } else {
    world.components.animation.set(entity, {
      clip,
      time,
      previousTime: time,
      duration,
    });
  }
}
