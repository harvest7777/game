import { spread, type WeaponDef } from "../../ecs/projectile/weapons";
import { demonFireball } from "../projectiles/demonFireball";

// A demon's three fireballs in a fan.
export const demonVolley: WeaponDef = {
  rate: 0.8,
  fires: spread(demonFireball, 3, 0.3),
};
