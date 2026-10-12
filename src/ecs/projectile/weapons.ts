import type { Vec2 } from "../shared/physics/math";
import type { SoundId } from "../../audio/assets";
import type { ProjectileDef } from "./definitions";

// One projectile a weapon fires each shot: which kind, and which way,
// `angle` radians from the aim (positive is clockwise on screen). A
// `mirror`ed one curves and weaves to the other side, so two of the same
// projectile, one mirrored, make a matched pair: a helix, or a pincer.
export type FiredProjectile = {
  projectile: ProjectileDef;
  angle?: number;
  mirror?: boolean;
};

// What a shooter fires: how often, and which projectiles leave at once.
// Each weapon is its own file under src/content/weapons. Each projectile
// decides how it flies; the weapon decides which ones leave together and at
// what angles, so one shot can mix kinds.
export type WeaponDef = {
  // Shots per second.
  rate: number;
  // Every projectile in one shot.
  fires: FiredProjectile[];
  // Played once per shot, however many projectiles it fires. Left out, it
  // fires quietly, so crowds of ordinary enemies don't drown everything out.
  sound?: SoundId;
};

// `count` of `projectile`, `arcGap` radians apart and centered on the aim.
export function spread(
  projectile: ProjectileDef,
  count: number,
  arcGap: number,
): FiredProjectile[] {
  return Array.from({ length: count }, (_, i) => ({
    projectile,
    angle: (i - (count - 1) / 2) * arcGap,
  }));
}

// `count` of `projectile` evenly around a full circle.
export function ring(
  projectile: ProjectileDef,
  count: number,
): FiredProjectile[] {
  return spread(projectile, count, (2 * Math.PI) / count);
}

// Each projectile of one shot aimed along `aim` (unit vector), with the
// direction it leaves in.
export function volley(
  def: WeaponDef,
  aim: Vec2,
): { fired: FiredProjectile; direction: Vec2 }[] {
  const center = Math.atan2(aim.y, aim.x);
  return def.fires.map((fired) => {
    const angle = center + (fired.angle ?? 0);
    return { fired, direction: { x: Math.cos(angle), y: Math.sin(angle) } };
  });
}
