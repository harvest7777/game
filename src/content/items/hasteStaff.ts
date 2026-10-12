import { singleFastBolt } from "../weapons/singleFastBolt";
import { tiered } from "./loot";
import { defineWeaponItem } from "./shared";

export const hasteStaff = defineWeaponItem({
  name: "Staff of Haste",
  icon: "items/hasteStaff",
  loot: tiered(2),
  weapon: singleFastBolt,
});
