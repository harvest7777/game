import type { WeaponDef } from "../../ecs/projectile/weapons";
import { leafEdge } from "../projectiles/leafEdge";
import { leafVein } from "../projectiles/leafVein";

// A leaf: a straight shot up the middle, framed by two that bow out and
// close back in toward its tip.
export const leafVolley: WeaponDef = {
  rate: 2,
  fires: [
    { projectile: leafEdge, angle: -0.9 },
    { projectile: leafVein },
    { projectile: leafEdge, angle: 0.9, mirror: true },
  ],
  sound: "magicFire",
};
