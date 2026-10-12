import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { bruteShot } from "../projectiles/bruteShot";

// A brute warrior landing from its charge: blasts all around it.
export const bruteRing: WeaponDef = {
  rate: 2,
  fires: ring(bruteShot, 12),
};
