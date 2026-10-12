import type { WeaponDef } from "../../ecs/projectile/weapons";
import { needle } from "../projectiles/needle";

// Two needles: one dead on the aim, one forking off a little to the left.
export const forkedNeedles: WeaponDef = {
  rate: 4,
  fires: [{ projectile: needle }, { projectile: needle, angle: -0.17 }],
  sound: "magicFire",
};
