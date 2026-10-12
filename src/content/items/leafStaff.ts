import type { ItemDef } from "../../ecs/inventory/items";
import { leafVolley } from "../weapons/leafVolley";

export const leafStaff: ItemDef = {
  name: "Leafblade Staff",
  kind: "weapon",
  icon: "items/leafStaff",
  weapon: leafVolley,
};
