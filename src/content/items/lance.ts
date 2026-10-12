import type { ItemDef } from "../../ecs/inventory/items";
import { singleLance } from "../weapons/singleLance";

export const lance: ItemDef = {
  name: "Piercing Lance",
  kind: "weapon",
  icon: "items/lance",
  weapon: singleLance,
};
