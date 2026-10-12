import { singleBoomerang } from "../weapons/singleBoomerang";
import { special } from "./loot";
import { defineWeaponItem } from "./shared";

export const boomerang = defineWeaponItem({
  name: "Wanderer's Boomerang",
  icon: "items/boomerang",
  loot: special,
  weapon: singleBoomerang,
});
