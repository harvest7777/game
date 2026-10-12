import { spread, type WeaponDef } from "../../ecs/projectile/weapons";
import { bruteShot } from "../projectiles/bruteShot";

// A brute's point-blank spray of five blasts.
export const bruteShotgun: WeaponDef = {
  rate: 0.7,
  fires: spread(bruteShot, 5, 0.18),
};
