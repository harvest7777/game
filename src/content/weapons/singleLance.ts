import type { WeaponDef } from "../../ecs/projectile/weapons";
import { lance } from "../projectiles/lance";

// One lance at a time, 4 a second.
export const singleLance: WeaponDef = {
  projectile: lance,
  rate: 4,
  sound: "magicFire",
};
