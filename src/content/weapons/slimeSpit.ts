import type { WeaponDef } from "../../ecs/projectile/weapons";
import { slimeBall } from "../projectiles/slimeBall";

// The slime's lobbed ball, a little under once a second.
export const slimeSpit: WeaponDef = {
  rate: 0.8,
  fires: [{ projectile: slimeBall }],
};
