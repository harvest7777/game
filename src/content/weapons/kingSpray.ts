import { spread, type WeaponDef } from "../../ecs/projectile/weapons";
import { slimeBall } from "../projectiles/slimeBall";

// The Slime King's aimed spray: five balls in a fan.
export const kingSpray: WeaponDef = {
  rate: 1.2,
  fires: spread(slimeBall, 5, 0.3),
  sound: "magicFire",
};
