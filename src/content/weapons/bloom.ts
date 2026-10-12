import type { WeaponDef } from "../../ecs/projectile/weapons";
import { bud } from "../projectiles/bud";
import { petal } from "../projectiles/petal";

// A tulip: two outer petals sweep wide and two inner ones lean out, each
// pair curling back up to meet at the top. Short range.
export const bloom: WeaponDef = {
  rate: 2.5,
  fires: [
    { projectile: petal, angle: -1.5 },
    { projectile: bud, angle: -0.55 },
    { projectile: bud, angle: 0.55, mirror: true },
    { projectile: petal, angle: 1.5, mirror: true },
  ],
  sound: "magicFire",
};
