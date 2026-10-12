import type { ItemDef } from "../../ecs/inventory/items";
import { singleSlowing } from "../weapons/singleSlowing";

export const mireStaff: ItemDef = {
  name: "Mire Staff",
  kind: "weapon",
  icon: "items/mireStaff",
  weapon: singleSlowing,
};
