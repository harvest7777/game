import type { ItemDef } from "../../ecs/inventory/items";
import { singleWavy } from "../weapons/singleWavy";

export const serpentStaff: ItemDef = {
  name: "Serpent Staff",
  kind: "weapon",
  icon: "items/serpentStaff",
  weapon: singleWavy,
};
