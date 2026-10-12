import type { WeaponDef } from "../../ecs/projectile/weapons";
import { bolt } from "../projectiles/bolt";

// One bolt at a time, 4 a second.
export const singleBolt: WeaponDef = {
  rate: 4,
  fires: [{ projectile: bolt }],
  sound: "magicFire",
};
