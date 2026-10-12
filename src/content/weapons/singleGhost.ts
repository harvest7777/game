import type { WeaponDef } from "../../ecs/projectile/weapons";
import { ghost } from "../projectiles/ghost";

// One ghost at a time, 4 a second.
export const singleGhost: WeaponDef = {
  projectile: ghost,
  rate: 4,
  sound: "magicFire",
};
