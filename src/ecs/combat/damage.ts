import type { Entity, World } from "../world";

// Takes `amount` off the target's health. The one place damage is applied,
// so defense and armor piercing slot in here once stats exist. Records what
// was dealt as a Damaged event. Health stops at 0, and reaching it records a
// Death once. Something already at 0 takes nothing more, and something
// invulnerable records the hit but keeps its health.
export function applyDamage(
  world: World,
  target: Entity,
  amount: number,
  source?: Entity,
): void {
  const health = world.components.health.get(target);
  if (!health || health.hp <= 0) return;
  const dealt =
    amount * (world.components.vulnerable.get(target)?.multiplier ?? 1);
  world.events.damaged.push({ target, amount: dealt, source });
  if (world.components.invulnerable.has(target)) return;
  health.hp = Math.max(0, health.hp - dealt);
  if (health.hp === 0) {
    world.events.deaths.push({ entity: target, killer: source });
  }
}

// Applies every hit from this tick.
export function damageSystem(world: World, _dt: number): void {
  for (const hit of world.events.hits) {
    applyDamage(world, hit.target, hit.damage, hit.owner);
  }
}

// Removes whatever died this tick, the player included. Only Invulnerable
// keeps something alive, by never losing health in the first place.
export function deathSystem(world: World, _dt: number): void {
  for (const { entity } of world.events.deaths) {
    world.events.despawns.push(entity);
  }
}
