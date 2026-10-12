import type { ItemDef } from "../../ecs/inventory/items";
import { singleAccelerating } from "../weapons/singleAccelerating";

export const cometStaff: ItemDef = {
  name: "Comet Staff",
  kind: "weapon",
  icon: "items/cometStaff",
  weapon: singleAccelerating,
};
