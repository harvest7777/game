import type { GroundDef } from "../../ecs/tiles";

// Molten rock: walkable, but it burns characters every half second they
// stand in it.
export const lava: GroundDef = {
  art: "tiles/lava",
  hazard: { damage: 25, every: 0.5 },
};
