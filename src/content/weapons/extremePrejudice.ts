import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { prejudice } from "../projectiles/prejudice";

// Ten swirling shards in a full ring around the shooter, once a second.
export const extremePrejudice: WeaponDef = {
  rate: 1,
  fires: ring(prejudice, 10),
  sound: "magicFire",
};
