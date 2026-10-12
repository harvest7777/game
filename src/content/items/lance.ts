import { singleLance } from "../weapons/singleLance";
import { special } from "./loot";
import { defineWeaponItem } from "./shared";

export const lance = defineWeaponItem({
  name: "Piercing Lance",
  icon: "items/lance",
  loot: special,
  weapon: singleLance,
});
