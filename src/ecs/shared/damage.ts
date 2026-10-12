import type { Entity, World } from "../world";
import { damageAfterDefense } from "../stats/formulas";
import { STAT } from "../stats/components";
import { effectiveStatNumber } from "../stats/runtime";

// Takes `amount` off the target's health. The one place damage is applied,
// including defense, armor piercing and vulnerability. Records what was
// dealt as a Damaged event. Health stops at 0, and reaching it records a
// Death once. Something already at 0 takes nothing more, and something
// invulnerable records the hit but keeps its health.
export function applyDamage(
  world: World,
  target: Entity,
  amount: number,
  source?: Entity,
  armorPiercing = false,
): void {
  const health = world.components.health.get(target);
  if (!health || health.value <= 0 || amount <= 0) return;
  const defense = effectiveStatNumber(world, target, STAT.DEFENSE) ?? 0;
  const afterDefense = armorPiercing
    ? amount
    : damageAfterDefense(amount, defense);
  const dealt = Math.max(
    1,
    Math.round(
      afterDefense * (world.components.vulnerable.get(target)?.multiplier ?? 1),
    ),
  );
  world.events.damaged.push({ target, amount: dealt, source });
  if (world.components.invulnerable.has(target)) return;
  health.value = Math.max(0, health.value - dealt);
  if (health.value === 0) {
    world.events.deaths.push({ entity: target, killer: source });
  }
}
