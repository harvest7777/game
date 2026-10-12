import { singleSlowing } from "../weapons/singleSlowing";
import { tiered } from "./loot";
import { defineWeaponItem } from "./shared";

export const mireStaff = defineWeaponItem({
  name: "Mire Staff",
  icon: "items/mireStaff",
  loot: tiered(6),
  weapon: singleSlowing,
});
