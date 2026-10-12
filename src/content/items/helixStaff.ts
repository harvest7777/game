import type { ItemDef } from "../../ecs/inventory/items";
import { twinHelix } from "../weapons/twinHelix";

export const helixStaff: ItemDef = {
  name: "Staff of the Double Helix",
  kind: "weapon",
  icon: "items/helixStaff",
  weapon: twinHelix,
};
