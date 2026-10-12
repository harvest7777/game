import type { TileDef } from "../../ecs/level/definitions";
import { grass } from "../grounds/grass";
import { water } from "../grounds/water";
import { wood } from "../grounds/wood";

// The map characters levels share: `#` wall, `,` grass, `=` wood, `~` water,
// and `P` the wood tile characters spawn on.
export const LEGEND = {
  "#": { wall: true },
  ",": { ground: grass },
  "=": { ground: wood },
  "~": { ground: water },
  P: { ground: wood, spawn: true },
} satisfies Record<string, TileDef>;
