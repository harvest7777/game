import type { Entity, World } from "../world";
import type { ConsumableEffect } from "./items";
import { STAT } from "../stats/components";
import { effectiveResourceMax } from "../stats/runtime";

// What each kind of consumable effect does to whoever uses it. Returns
// whether it did anything, so a consumable that would be wasted, like a
// health potion at full health, isn't used up. Adding a kind of effect is
// one entry here.
type UseFn<E> = (world: World, entity: Entity, effect: E) => boolean;

export const USE_EFFECTS: {
  [K in ConsumableEffect["kind"]]: UseFn<
    Extract<ConsumableEffect, { kind: K }>
  >;
} = {
  heal: (world, entity, { amount }) => {
    const health = world.components.health.get(entity);
    const max = effectiveResourceMax(world, entity, STAT.HEALTH);
    if (
      !health ||
      max === undefined ||
      health.value <= 0 ||
      health.value >= max
    ) {
      return false;
    }
    const healed = Math.min(amount, max - health.value);
    health.value += healed;
    world.events.healed.push({ target: entity, amount: healed });
    return true;
  },
};

export function applyEffect(
  world: World,
  entity: Entity,
  effect: ConsumableEffect,
): boolean {
  const use = USE_EFFECTS[effect.kind] as UseFn<ConsumableEffect>;
  return use(world, entity, effect);
}
