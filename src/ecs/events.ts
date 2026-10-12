import type { Entity } from "./world";

// A projectile touched something on the other team.
export type Hit = {
  projectile: Entity;
  target: Entity;
  // Who fired the projectile.
  owner: Entity;
  // Rolled from the projectile's damage range, before defense.
  damage: number;
  armorPiercing: boolean;
};

// Something ran out of health.
export type Death = { entity: Entity; killer?: Entity };

// Things that happened this tick, for other systems to react to. A system
// records what happened; each reaction (damage, death, removal, and later
// loot, sounds, damage numbers) is its own system reading the list. Events
// last one tick: they're cleared at the start of every tick, and the system
// order in tick.ts runs producers before consumers.
export type Events = {
  hits: Hit[];
  deaths: Death[];
  // Entities to remove at the end of the tick, so nothing is removed while
  // another system is still looking at it.
  despawns: Entity[];
};

export function createEvents(): Events {
  return { hits: [], deaths: [], despawns: [] };
}

export function clearEvents(events: Events): void {
  events.hits.length = 0;
  events.deaths.length = 0;
  events.despawns.length = 0;
}
