import type { World } from "../world";
import { freshMemory, steer } from "./behaviors";
import { enemyDef, phaseOf } from "./definitions";

// Moves enemies by their behavior: `aggro` while they have a target, `idle`
// otherwise, taken from their current phase when it sets them. Switching
// starts the new behavior fresh. It only sets velocity,
// the way player input does, so movement handles walls for enemies too.
export function brainSystem(world: World, dt: number): void {
  const { enemy, brain, position, target, speed, velocity } = world.components;

  for (const [entity, e] of enemy) {
    const mind = brain.get(entity);
    const at = position.get(entity);
    if (!mind || !at) continue;
    const def = enemyDef(e.def);

    const targetEntity = target.get(entity);
    const targetAt =
      targetEntity === undefined ? undefined : position.get(targetEntity);
    const mode = targetAt ? "aggro" : "idle";
    if (mind.mode !== mode) {
      mind.mode = mode;
      mind.memory = freshMemory();
    }

    velocity.set(
      entity,
      steer(phaseOf(def, e.phase?.name)?.[mode] ?? def[mode], mind.memory, {
        at,
        origin: e.origin,
        target: targetAt,
        speed: speed.get(entity) ?? def.speed,
        dt,
        random: world.random,
      }),
    );
  }
}
