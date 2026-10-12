import type { WeaponDef } from "../../ecs/projectile/weapons";
import { helix } from "../projectiles/helix";

// Two weaving shots, one mirrored, braiding around the aim.
export const twinHelix: WeaponDef = {
  rate: 3,
  fires: [{ projectile: helix }, { projectile: helix, mirror: true }],
  sound: "magicFire",
};
