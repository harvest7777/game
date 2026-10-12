import { applyDamage } from "../shared/damage";
import type { World } from "../world";

// Applies every hit from this tick.
export function damageSystem(world: World, _dt: number): void {
  for (const hit of world.events.hits) {
    applyDamage(world, hit.target, hit.damage, hit.owner, hit.armorPiercing);
  }
}

// Removes whatever died this tick, the player included. Only Invulnerable
// keeps something alive, by never losing health in the first place.
export function deathSystem(world: World, _dt: number): void {
  for (const { entity } of world.events.deaths) {
    world.events.despawns.push(entity);
  }
}
