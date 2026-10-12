import type { ItemDef } from "../../ecs/inventory/items";
import { forkedNeedles } from "../weapons/forkedNeedles";

export const forkStaff: ItemDef = {
  name: "Forked Staff",
  kind: "weapon",
  icon: "items/forkStaff",
  weapon: forkedNeedles,
};
