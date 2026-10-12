import type { WeaponDef } from "../../ecs/projectile/weapons";
import { slowing } from "../projectiles/slowing";

// One slowing at a time, 4 a second.
export const singleSlowing: WeaponDef = {
  projectile: slowing,
  rate: 4,
  sound: "magicFire",
};
