import type { WeaponDef } from "../../ecs/projectile/weapons";
import { accelerating } from "../projectiles/accelerating";

// One accelerating at a time, 4 a second.
export const singleAccelerating: WeaponDef = {
  projectile: accelerating,
  rate: 4,
  sound: "magicFire",
};
