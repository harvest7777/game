import type { ItemDef } from "../../ecs/inventory/items";
import { singleTightWave } from "../weapons/singleTightWave";

export const currentStaff: ItemDef = {
  name: "Staff of Currents",
  kind: "weapon",
  icon: "items/currentStaff",
  weapon: singleTightWave,
};
