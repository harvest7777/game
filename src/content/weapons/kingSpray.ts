import type { WeaponDef } from "../../ecs/projectile/weapons";
import { slimeBall } from "../projectiles/slimeBall";

// The Slime King's aimed spray: five balls in a fan.
export const kingSpray: WeaponDef = {
  projectile: slimeBall,
  rate: 1.2,
  count: 5,
  arcGap: 0.3,
  sound: "magicFire",
};
