import type { WeaponDef } from "../../ecs/projectile/weapons";
import { spiral } from "../projectiles/spiral";

// One spiral at a time, 4 a second.
export const singleSpiral: WeaponDef = {
  rate: 4,
  fires: [{ projectile: spiral }],
  sound: "magicFire",
};
