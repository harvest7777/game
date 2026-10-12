import type { ProjectileDef } from "../../ecs/projectile/definitions";
import { BOLT_ART, HIT_SOUND, SMALL } from "./shared";

// A leaf's edge: fired out to the left, it bows wide, then its turn eases
// off and it runs nearly straight back in toward the tip. Mirror it for the
// right edge.
export const leafEdge: ProjectileDef = {
  speed: 10,
  damage: [15, 22],
  lifetime: 0.9,
  hitbox: SMALL,
  sprite: { art: BOLT_ART, outline: { color: [0.82, 0.98, 0.59, 1] } },
  sound: HIT_SOUND,
  turnRate: 2.4,
  turnAcceleration: -1.5,
  faceDirection: true,
};
