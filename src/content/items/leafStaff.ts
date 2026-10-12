import { leafVolley } from "../weapons/leafVolley";
import { special } from "./loot";
import { defineWeaponItem } from "./shared";

export const leafStaff = defineWeaponItem({
  name: "Leafblade Staff",
  icon: "items/leafStaff",
  loot: special,
  weapon: leafVolley,
});
