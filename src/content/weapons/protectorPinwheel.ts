import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { protectorFlame } from "../projectiles/protectorFlame";

// A Malphas Protector's eight curling flames, spinning out like a
// pinwheel.
export const protectorPinwheel: WeaponDef = {
  rate: 0.9,
  fires: ring(protectorFlame, 8),
  sound: "fireCast",
};
