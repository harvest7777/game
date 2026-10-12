import type { WeaponDef } from "../../ecs/projectile/weapons";
import { tightWave } from "../projectiles/tightWave";

// One tightWave at a time, 4 a second.
export const singleTightWave: WeaponDef = {
  projectile: tightWave,
  rate: 4,
  sound: "magicFire",
};
