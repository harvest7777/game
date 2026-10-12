import type { ItemDef } from "../../ecs/inventory/items";
import { singleBolt } from "../weapons/singleBolt";

export const apprenticeStaff: ItemDef = {
  name: "Apprentice Staff",
  kind: "weapon",
  icon: "items/apprenticeStaff",
  weapon: singleBolt,
};
