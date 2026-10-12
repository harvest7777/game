import type { WeaponDef } from "../../ecs/projectile/weapons";
import { impFire } from "../projectiles/impFire";

// An imp's fireball, a quick one and a half a second.
export const impShot: WeaponDef = {
  rate: 1.5,
  fires: [{ projectile: impFire }],
};
