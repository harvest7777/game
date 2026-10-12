import type { WeaponDef } from "../../ecs/projectile/weapons";
import { wavy } from "../projectiles/wavy";

// One wavy at a time, 4 a second.
export const singleWavy: WeaponDef = {
  rate: 4,
  fires: [{ projectile: wavy }],
  sound: "magicFire",
};
