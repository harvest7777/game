import type { WeaponDef } from "../../ecs/projectile/weapons";
import { ghost } from "../projectiles/ghost";

// One ghost at a time, 4 a second.
export const singleGhost: WeaponDef = {
  rate: 4,
  fires: [{ projectile: ghost }],
  sound: "magicFire",
};
