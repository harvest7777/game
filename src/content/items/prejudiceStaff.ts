import type { ItemDef } from "../../ecs/inventory/items";
import { extremePrejudice } from "../weapons/extremePrejudice";

export const prejudiceStaff: ItemDef = {
  name: "Staff of Extreme Prejudice",
  kind: "weapon",
  icon: "items/prejudiceStaff",
  weapon: extremePrejudice,
};
