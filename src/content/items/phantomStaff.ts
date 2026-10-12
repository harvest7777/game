import type { ItemDef } from "../../ecs/inventory/items";
import { singleGhost } from "../weapons/singleGhost";

export const phantomStaff: ItemDef = {
  name: "Phantom Staff",
  kind: "weapon",
  icon: "items/phantomStaff",
  weapon: singleGhost,
};
