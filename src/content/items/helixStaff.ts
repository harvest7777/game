import { twinHelix } from "../weapons/twinHelix";
import { special } from "./loot";
import { defineWeaponItem } from "./shared";

export const helixStaff = defineWeaponItem({
  name: "Staff of the Double Helix",
  icon: "items/helixStaff",
  loot: special,
  weapon: twinHelix,
});
