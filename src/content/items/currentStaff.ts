import { singleTightWave } from "../weapons/singleTightWave";
import { tiered } from "./loot";
import { defineWeaponItem } from "./shared";

export const currentStaff = defineWeaponItem({
  name: "Staff of Currents",
  icon: "items/currentStaff",
  loot: tiered(4),
  weapon: singleTightWave,
});
