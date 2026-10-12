import type { WeaponDef } from "../../ecs/projectile/weapons";
import { bolt } from "../projectiles/bolt";

// One bolt at a time, 4 a second.
export const singleBolt: WeaponDef = {
  projectile: bolt,
  rate: 4,
  sound: "magicFire",
};
