import type { WeaponDef } from "../../ecs/projectile/weapons";
import { lance } from "../projectiles/lance";

// One lance at a time, 4 a second.
export const singleLance: WeaponDef = {
  rate: 4,
  fires: [{ projectile: lance }],
  sound: "magicFire",
};
