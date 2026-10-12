import type { WeaponDef } from "../../ecs/projectile/weapons";
import { accelerating } from "../projectiles/accelerating";

// One accelerating at a time, 4 a second.
export const singleAccelerating: WeaponDef = {
  rate: 4,
  fires: [{ projectile: accelerating }],
  sound: "magicFire",
};
