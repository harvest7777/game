import type { WeaponDef } from "../../ecs/projectile/weapons";
import { prejudice } from "../projectiles/prejudice";

// The Slime King's desperate burst: eight swirling shards in a ring.
export const kingFrenzy: WeaponDef = {
  projectile: prejudice,
  rate: 1.5,
  count: 8,
  arcGap: (2 * Math.PI) / 8,
  sound: "magicFire",
};
