import type { ItemDef } from "../../ecs/inventory/items";
import { singleFastBolt } from "../weapons/singleFastBolt";

export const hasteStaff: ItemDef = {
  name: "Staff of Haste",
  kind: "weapon",
  icon: "items/hasteStaff",
  weapon: singleFastBolt,
};
