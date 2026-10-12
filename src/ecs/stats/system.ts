import type { World } from "../world";
import { STAT_KINDS, type StatValue } from "./components";
import { healthPerSecond, manaPerSecond } from "./formulas";

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
        if (value) value.value = value.max;
      }
    }
  }

  for (const [entity, health] of world.components.health) {
    if (health.value <= 0) continue;
    const vitality = world.components.vitality.get(entity)?.value;
    if (vitality !== undefined)
      regenerate(health, healthPerSecond(vitality), dt);
  }

  for (const [entity, mana] of world.components.mana) {
    const health = world.components.health.get(entity);
    if (health && health.value <= 0) continue;
    const wisdom = world.components.wisdom.get(entity)?.value;
    if (wisdom !== undefined) regenerate(mana, manaPerSecond(wisdom), dt);
  }
}

function regenerate(resource: StatValue, perSecond: number, dt: number): void {
  resource.value = Math.min(resource.max, resource.value + perSecond * dt);
}
