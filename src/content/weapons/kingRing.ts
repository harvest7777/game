import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { slimeBall } from "../projectiles/slimeBall";

// The Slime King's ring: twelve balls all the way around.
export const kingRing: WeaponDef = {
  rate: 1,
  fires: ring(slimeBall, 12),
  sound: "magicFire",
};
