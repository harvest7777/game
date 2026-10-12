import type { WeaponDef } from "../../ecs/projectile/weapons";
import { fastBolt } from "../projectiles/fastBolt";

// One fastBolt at a time, 4 a second.
export const singleFastBolt: WeaponDef = {
  projectile: fastBolt,
  rate: 4,
  sound: "magicFire",
};
