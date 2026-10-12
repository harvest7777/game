import type { WeaponDef } from "../../ecs/projectile/weapons";
import { demonfire } from "../projectiles/demonfire";

// Two weaving fireballs, mirrored, that burn through everything they
// hit.
export const demonfireStaff: WeaponDef = {
  rate: 2.5,
  fires: [{ projectile: demonfire }, { projectile: demonfire, mirror: true }],
  sound: "fireCast",
};
