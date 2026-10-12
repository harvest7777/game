import type { World } from "../world";
import { freshMemory } from "./behaviors";
import { phaseOf } from "./definitions";
import { nextPhase } from "./phases";
import { armForPhase } from "../shared/arming";
import { resetBossAction } from "../shared/bossActions";

// Moves enemies through their phases. Times the current phase, and when one
// of its transitions holds, switches: the new phase starts its clock at 0,
// swaps the weapon if it says to, and the brain starts its behavior fresh.
// At most one switch per tick, so a phase always runs for at least a tick.
export function phaseSystem(world: World, dt: number): void {
  const { enemy, health, position, target, brain } = world.components;

  for (const [entity, e] of enemy) {
    if (!e.phase || world.components.asleep.has(entity)) continue;
    const phase = phaseOf(e.def, e.phase.name);
    if (!phase) continue;
    e.phase.time += dt;

    const hp = health.get(entity);
    const at = position.get(entity);
    const targetEntity = target.get(entity);
    const targetAt =
      targetEntity === undefined ? undefined : position.get(targetEntity);
    const to = nextPhase(phase, {
      time: e.phase.time,
      healthFraction: hp ? hp.value / hp.max : 1,
      targetDistance:
        at && targetAt
          ? Math.hypot(targetAt.x - at.x, targetAt.y - at.y)
          : undefined,
    });
    if (to === undefined || to === e.phase.name) continue;

    e.phase = { name: to, time: 0 };
    armForPhase(world, entity);
    resetBossAction(world, entity);
    const mind = brain.get(entity);
    if (mind) mind.memory = freshMemory();
  }
}
