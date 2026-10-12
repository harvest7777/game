import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { malphasCurl } from "../projectiles/malphasCurl";

// Malphas's frenzy: six curling flames each way, crossing as they
// straighten out.
export const malphasFrenzy: WeaponDef = {
  rate: 1,
  fires: [
    ...ring(malphasCurl, 6),
    ...ring(malphasCurl, 6).map((shot) => ({ ...shot, mirror: true })),
  ],
  sound: "fireCast",
};
