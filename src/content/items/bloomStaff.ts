import { bloom } from "../weapons/bloom";
import { special } from "./loot";
import { defineWeaponItem } from "./shared";

export const bloomStaff = defineWeaponItem({
  name: "Bloom Staff",
  icon: "items/bloomStaff",
  loot: special,
  weapon: bloom,
});
