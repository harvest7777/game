import type { SlotRef } from "./inventory/components";
import type { Vec2 } from "./shared/physics/math";
import type { ProjectileId } from "./projectile/definitions";
import type { SoundId } from "../audio/assets";
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

// Something took damage, after defense (once there is any). Shows the full
// amount even when that's more than it had left, like RotMG.
export type Damaged = { target: Entity; amount: number; source?: Entity };

// An item landed in `to` (from `from`, unless it was just given).
export type ItemMoved = { entity: Entity; to: SlotRef; from?: SlotRef };

// Something ran out of health.
export type Death = { entity: Entity; killer?: Entity };

// A weapon discharged once. A volley is one shot, however many projectiles
// it creates, so its firing sound only plays once.
export type ShotFired = {
  projectile: ProjectileId;
  owner: Entity;
  at: Vec2;
};

// A semantic gameplay cue, usually an authored boss telegraph or release.
export type SoundCue = { sound: SoundId; at: Vec2 };

// Things that happened this tick, for other systems to react to. A system
// records what happened; each reaction (damage, death, removal, and later
// loot, sounds, damage numbers) is its own system reading the list. Events
// last one tick: they're cleared at the start of every tick, and the system
// order in tick.ts runs producers before consumers.
export type Events = {
  hits: Hit[];
  damaged: Damaged[];
  deaths: Death[];
  shotsFired: ShotFired[];
  soundCues: SoundCue[];
  itemsMoved: ItemMoved[];
  // Entities to remove at the end of the tick, so nothing is removed while
  // another system is still looking at it.
  despawns: Entity[];
};

export function createEvents(): Events {
  return {
    hits: [],
    damaged: [],
    deaths: [],
    shotsFired: [],
    soundCues: [],
    itemsMoved: [],
    despawns: [],
  };
}

export function clearEvents(events: Events): void {
  events.hits.length = 0;
  events.damaged.length = 0;
  events.deaths.length = 0;
  events.shotsFired.length = 0;
  events.soundCues.length = 0;
  events.itemsMoved.length = 0;
  events.despawns.length = 0;
}
