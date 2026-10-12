import type { ItemDef } from "../../ecs/inventory/items";
import { singleBoomerang } from "../weapons/singleBoomerang";

export const boomerang: ItemDef = {
  name: "Wanderer's Boomerang",
  kind: "weapon",
  icon: "items/boomerang",
  weapon: singleBoomerang,
};
