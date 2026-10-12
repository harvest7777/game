import type { WeaponDef } from "../../ecs/projectile/weapons";
import { prejudice } from "../projectiles/prejudice";

// Ten swirling shards in a full ring around the shooter, once a second.
export const extremePrejudice: WeaponDef = {
  projectile: prejudice,
  rate: 1,
  count: 10,
  arcGap: (2 * Math.PI) / 10,
  sound: "magicFire",
};
