import type { Entity, World } from "../world";

// Takes `amount` off the target's health. The one place damage is applied,
// so defense and armor piercing slot in here once stats exist. Health stops
// at 0, and reaching it records a Death once.
export function applyDamage(
  world: World,
  target: Entity,
  amount: number,
  source?: Entity,
): void {
  const health = world.components.health.get(target);
  if (!health || health.hp <= 0) return;
  health.hp = Math.max(0, health.hp - amount);
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

// Removes whatever died this tick. The player doesn't die yet: it stays at 0
// health so testing isn't interrupted.
export function deathSystem(world: World, _dt: number): void {
  for (const { entity } of world.events.deaths) {
    if (world.components.playerControlled.has(entity)) continue;
    world.events.despawns.push(entity);
  }
}
