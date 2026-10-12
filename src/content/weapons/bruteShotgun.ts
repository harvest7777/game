import { spread, type WeaponDef } from "../../ecs/projectile/weapons";
import { bruteShot } from "../projectiles/bruteShot";

// A brute's point-blank spray of four blasts.
export const bruteShotgun: WeaponDef = {
  rate: 0.6,
  fires: spread(bruteShot, 4, 0.2),
};
