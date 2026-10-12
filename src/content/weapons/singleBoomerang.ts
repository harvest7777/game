import type { WeaponDef } from "../../ecs/projectile/weapons";
import { boomerang } from "../projectiles/boomerang";

// One boomerang at a time, 4 a second.
export const singleBoomerang: WeaponDef = {
  rate: 4,
  fires: [{ projectile: boomerang }],
  sound: "magicFire",
};
