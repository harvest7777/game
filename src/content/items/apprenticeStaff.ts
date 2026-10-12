import { singleBolt } from "../weapons/singleBolt";
import { tiered } from "./loot";
import { defineWeaponItem } from "./shared";

export const apprenticeStaff = defineWeaponItem({
  name: "Apprentice Staff",
  icon: "items/apprenticeStaff",
  loot: tiered(1),
  weapon: singleBolt,
});
