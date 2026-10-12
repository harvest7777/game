import type { World } from "../world";
import { freshMemory, steer } from "./behaviors";
import { phaseOf } from "./definitions";
import { separation, withSeparation } from "./separation";
import { stageVelocity } from "./stageMovement";
import { bossStage } from "../shared/bossActions";

// Moves enemies by their behavior: `aggro` while they have a target, `idle`
// otherwise, taken from their current phase when it sets them. Switching
// starts the new behavior fresh. Enemies that move also ease apart from
// each other so they don't pile up. It only sets velocity, the way player
// input does, so movement handles walls for enemies too.
export function brainSystem(world: World, dt: number): void {
  const { enemy, brain, position, target, speed, velocity } = world.components;
  const pushes = separation(world);

  for (const [entity, e] of enemy) {
    const mind = brain.get(entity);
    const at = position.get(entity);
    if (!mind || !at) continue;
    const { def } = e;
    const actionStage = bossStage(world, entity);

    const targetEntity = target.get(entity);
    const targetAt =
      targetEntity === undefined ? undefined : position.get(targetEntity);
    const mode = targetAt ? "aggro" : "idle";
    if (mind.mode !== mode) {
      mind.mode = mode;
      mind.memory = freshMemory();
    }

    const behavior = phaseOf(def, e.phase?.name)?.[mode] ?? def[mode];
    const moveSpeed = speed.get(entity) ?? def.speed;
    const stageMove =
      actionStage &&
      stageVelocity(actionStage.movement, {
        speed: moveSpeed,
        heading: world.components.bossAction.get(entity)?.heading,
      });
    if (stageMove) {
      velocity.set(entity, stageMove);
      continue;
    }
    const steering = steer(behavior, mind.memory, {
      at,
      origin: e.origin,
      target: targetAt,
      speed: moveSpeed,
      dt,
      random: world.random,
      quirks: e.quirks,
    });
    velocity.set(
      entity,
      behavior.kind === "stationary"
        ? steering
        : withSeparation(steering, pushes.get(entity), moveSpeed),
    );
  }
}
