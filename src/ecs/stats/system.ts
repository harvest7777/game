import type { World } from "../world";
import { STAT, STAT_KINDS, type StatValue } from "./components";
import { healthPerSecond, manaPerSecond } from "./formulas";
import { effectiveResourceMax, effectiveStatNumber } from "./runtime";

// Applies stat commands and passive regeneration. It owns no movement,
// shooting or damage behavior; those systems read stats through pure helpers.
export function statSystem(world: World, dt: number): void {
  const maxes = world.input.commands.filter(
    (command) => command.kind === "maxStats",
  ).length;
  if (maxes > 0) {
    for (const [entity] of world.components.playerControlled) {
      for (const kind of STAT_KINDS) {
        const value = world.components[kind].get(entity);
        if (!value) continue;
        value.value =
          kind === STAT.HEALTH || kind === STAT.MANA
            ? effectiveResourceMax(world, entity, kind)!
            : value.max;
      }
    }
  }

  for (const [entity, health] of world.components.health) {
    if (health.value <= 0) continue;
    const vitality = effectiveStatNumber(world, entity, STAT.VITALITY);
    if (vitality !== undefined)
      regenerate(
        health,
        effectiveResourceMax(world, entity, STAT.HEALTH)!,
        healthPerSecond(vitality),
        dt,
      );
  }

  for (const [entity, mana] of world.components.mana) {
    const health = world.components.health.get(entity);
    if (health && health.value <= 0) continue;
    const wisdom = effectiveStatNumber(world, entity, STAT.WISDOM);
    if (wisdom !== undefined)
      regenerate(
        mana,
        effectiveResourceMax(world, entity, STAT.MANA)!,
        manaPerSecond(wisdom),
        dt,
      );
  }
}

function regenerate(
  resource: StatValue,
  max: number,
  perSecond: number,
  dt: number,
): void {
  resource.value = Math.min(max, resource.value + perSecond * dt);
}
