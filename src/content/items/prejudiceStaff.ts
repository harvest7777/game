import { extremePrejudice } from "../weapons/extremePrejudice";
import { special } from "./loot";
import { defineWeaponItem } from "./shared";

export const prejudiceStaff = defineWeaponItem({
  name: "Staff of Extreme Prejudice",
  icon: "items/prejudiceStaff",
  loot: special,
  weapon: extremePrejudice,
});
