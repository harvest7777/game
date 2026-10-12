import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { malphasFlame } from "../projectiles/malphasFlame";

// Malphas's ring of sixteen flames.
export const malphasRing: WeaponDef = {
  rate: 1,
  fires: ring(malphasFlame, 16),
  sound: "magicFire",
};
