import type { Vec2 } from "../shared/physics/math";
import { projectileIds, type ProjectileId } from "./definitions";

// What a shooter fires: which projectile, how often, and in what pattern.
// The projectile decides how each shot flies; the weapon decides how many
// leave at once and at what angles.
export type WeaponDef = {
  projectile: ProjectileId;
  // Shots per second.
  rate: number;
  // Projectiles per shot. Defaults to 1.
  count?: number;
  // Radians between neighbouring projectiles in a shot, spread evenly
  // either side of the aim.
  arcGap?: number;
};

// Every projectile gets a plain single-shot weapon, so each can be tried on
// its own.
const singles = Object.fromEntries(
  projectileIds.map((id) => [id, { projectile: id, rate: 4 }]),
) as Record<ProjectileId, WeaponDef>;

export const weapons = {
  ...singles,
  // Ten swirling shards in a full ring around the shooter, once a second.
  extremePrejudice: {
    projectile: "prejudice",
    rate: 1,
    count: 10,
    arcGap: (2 * Math.PI) / 10,
  },
  // Enemy weapons.
  slimeSpit: { projectile: "slimeBall", rate: 0.8 },
  archerVolley: { projectile: "arrow", rate: 0.7, count: 3, arcGap: 0.25 },
  // The Slime King's attacks, one per phase.
  kingSpray: { projectile: "slimeBall", rate: 1.2, count: 5, arcGap: 0.3 },
  kingRing: {
    projectile: "slimeBall",
    rate: 1,
    count: 12,
    arcGap: (2 * Math.PI) / 12,
  },
  kingFrenzy: {
    projectile: "prejudice",
    rate: 1.5,
    count: 8,
    arcGap: (2 * Math.PI) / 8,
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof weapons;

export const weaponIds = Object.keys(weapons) as WeaponId[];

export function weaponDef(id: WeaponId): WeaponDef {
  return weapons[id];
}

// Directions of each projectile in one shot aimed along `aim` (unit vector),
// spread `arcGap` apart and centered on the aim.
export function volley(def: WeaponDef, aim: Vec2): Vec2[] {
  const count = def.count ?? 1;
  const gap = def.arcGap ?? 0;
  const center = Math.atan2(aim.y, aim.x);
  return Array.from({ length: count }, (_, i) => {
    const angle = center + (i - (count - 1) / 2) * gap;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}
