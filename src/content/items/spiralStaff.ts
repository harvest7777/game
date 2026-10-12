import { singleSpiral } from "../weapons/singleSpiral";
import { tiered } from "./loot";
import { defineWeaponItem } from "./shared";

export const spiralStaff = defineWeaponItem({
  name: "Spiral Staff",
  icon: "items/spiralStaff",
  loot: tiered(7),
  weapon: singleSpiral,
});
