import { spread, type WeaponDef } from "../../ecs/projectile/weapons";
import { demonBlade } from "../projectiles/demonBlade";

// A demon warrior's sweep of five short blades.
export const demonSlash: WeaponDef = {
  rate: 1.2,
  fires: spread(demonBlade, 5, 0.25),
};
