import type { ItemDef } from "../../ecs/inventory/items";
import { singleSpiral } from "../weapons/singleSpiral";

export const spiralStaff: ItemDef = {
  name: "Spiral Staff",
  kind: "weapon",
  icon: "items/spiralStaff",
  weapon: singleSpiral,
};
