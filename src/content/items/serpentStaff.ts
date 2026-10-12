import { singleWavy } from "../weapons/singleWavy";
import { tiered } from "./loot";
import { defineWeaponItem } from "./shared";

export const serpentStaff = defineWeaponItem({
  name: "Serpent Staff",
  icon: "items/serpentStaff",
  loot: tiered(3),
  weapon: singleWavy,
});
