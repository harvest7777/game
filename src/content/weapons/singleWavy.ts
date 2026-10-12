import type { WeaponDef } from "../../ecs/projectile/weapons";
import { wavy } from "../projectiles/wavy";

// One wavy at a time, 4 a second.
export const singleWavy: WeaponDef = {
  projectile: wavy,
  rate: 4,
  sound: "magicFire",
};
