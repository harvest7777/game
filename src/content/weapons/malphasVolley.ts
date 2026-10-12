import { spread, type WeaponDef } from "../../ecs/projectile/weapons";
import { malphasLance } from "../projectiles/malphasLance";

// Malphas's three aimed lances.
export const malphasVolley: WeaponDef = {
  rate: 1,
  fires: spread(malphasLance, 3, 0.15),
  sound: "arrowFire",
};
