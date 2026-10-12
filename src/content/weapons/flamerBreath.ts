import { spread, type WeaponDef } from "../../ecs/projectile/weapons";
import { flamerFlame } from "../projectiles/flamerFlame";

// A flamer's three-flame breath.
export const flamerBreath: WeaponDef = {
  rate: 2.5,
  fires: spread(flamerFlame, 3, 0.3),
};
