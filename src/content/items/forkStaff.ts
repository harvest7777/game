import { forkedNeedles } from "../weapons/forkedNeedles";
import { special } from "./loot";
import { defineWeaponItem } from "./shared";

export const forkStaff = defineWeaponItem({
  name: "Forked Staff",
  icon: "items/forkStaff",
  loot: special,
  weapon: forkedNeedles,
});
