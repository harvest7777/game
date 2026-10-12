import type { Vec2 } from "../shared/physics/math";
import type { SoundId } from "../../audio/assets";
import type { ProjectileDef } from "./definitions";

// What a shooter fires: which projectile, how often, and in what pattern.
// Each weapon is its own file under src/content/weapons.
// The projectile decides how each shot flies; the weapon decides how many
// leave at once and at what angles.
export type WeaponDef = {
  projectile: ProjectileDef;
  // Shots per second.
  rate: number;
  // Projectiles per shot. Defaults to 1.
  count?: number;
  // Radians between neighbouring projectiles in a shot, spread evenly
  // either side of the aim.
  arcGap?: number;
  // Played once per shot, however many projectiles it fires. Left out, it
  // fires quietly, so crowds of ordinary enemies don't drown everything out.
  sound?: SoundId;
};

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
