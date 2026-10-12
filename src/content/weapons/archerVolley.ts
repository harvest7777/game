import type { WeaponDef } from "../../ecs/projectile/weapons";
import { arrow } from "../projectiles/arrow";

// Three arrows in a narrow fan.
export const archerVolley: WeaponDef = {
  projectile: arrow,
  rate: 0.7,
  count: 3,
  arcGap: 0.25,
};
