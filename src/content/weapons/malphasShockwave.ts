import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { malphasShock } from "../projectiles/malphasShock";

// The shockwave when Malphas slams down: twenty bursts all around.
export const malphasShockwave: WeaponDef = {
  rate: 1,
  fires: ring(malphasShock, 20),
  sound: "bossCast",
};
