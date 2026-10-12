import type { ItemDef } from "../../ecs/inventory/items";
import { bloom } from "../weapons/bloom";

export const bloomStaff: ItemDef = {
  name: "Bloom Staff",
  kind: "weapon",
  icon: "items/bloomStaff",
  weapon: bloom,
};
