import { ring, type WeaponDef } from "../../ecs/projectile/weapons";
import { mageOrb } from "../projectiles/mageOrb";

// A demon mage's ring of eight orbs that speed up as they go.
export const mageRing: WeaponDef = {
  rate: 0.45,
  fires: ring(mageOrb, 8),
};
