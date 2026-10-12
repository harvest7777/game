import { spread, type WeaponDef } from "../../ecs/projectile/weapons";
import { arrow } from "../projectiles/arrow";

// Three arrows in a narrow fan.
export const archerVolley: WeaponDef = {
  rate: 0.7,
  fires: spread(arrow, 3, 0.25),
};
