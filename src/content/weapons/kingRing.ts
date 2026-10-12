import type { WeaponDef } from "../../ecs/projectile/weapons";
import { slimeBall } from "../projectiles/slimeBall";

// The Slime King's ring: twelve balls all the way around.
export const kingRing: WeaponDef = {
  projectile: slimeBall,
  rate: 1,
  count: 12,
  arcGap: (2 * Math.PI) / 12,
  sound: "magicFire",
};
