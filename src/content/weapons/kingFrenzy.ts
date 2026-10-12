import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { prejudice } from "../projectiles/prejudice";

// The Slime King's desperate burst: eight swirling shards in a ring.
export const kingFrenzy: WeaponDef = {
  rate: 1.5,
  fires: ring(prejudice, 8),
  sound: "magicFire",
};
