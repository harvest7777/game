import type { ItemDef } from "../../ecs/inventory/items";
import { apprenticeStaff } from "./apprenticeStaff";
import { hasteStaff } from "./hasteStaff";
import { serpentStaff } from "./serpentStaff";
import { currentStaff } from "./currentStaff";
import { cometStaff } from "./cometStaff";
import { mireStaff } from "./mireStaff";
import { spiralStaff } from "./spiralStaff";
import { phantomStaff } from "./phantomStaff";
import { prejudiceStaff } from "./prejudiceStaff";
import { boomerang } from "./boomerang";
import { lance } from "./lance";
import { helixStaff } from "./helixStaff";
import { leafStaff } from "./leafStaff";
import { forkStaff } from "./forkStaff";
import { bloomStaff } from "./bloomStaff";
import { demonfireStaff } from "./demonfireStaff";
import { healthPotion } from "./healthPotion";

// Every item, by id.
export const items = {
  apprenticeStaff,
  hasteStaff,
  serpentStaff,
  currentStaff,
  cometStaff,
  mireStaff,
  spiralStaff,
  phantomStaff,
  prejudiceStaff,
  boomerang,
  lance,
  helixStaff,
  leafStaff,
  forkStaff,
  bloomStaff,
  demonfireStaff,
  healthPotion,
} satisfies Record<string, ItemDef>;

export type ItemId = keyof typeof items;

export const itemIds = Object.keys(items) as ItemId[];
