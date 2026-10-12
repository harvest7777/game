import type { GroundDef } from "../../ecs/tiles";

// Molten rock: wading through it is slow, at 30% speed, and it burns
// characters every half second they stand in it.
export const lava: GroundDef = {
  art: "tiles/lava",
  speedScale: 0.3,
  hazard: { damage: 25, every: 0.5 },
};
