import { singleGhost } from "../weapons/singleGhost";
import { tiered } from "./loot";
import { defineWeaponItem } from "./shared";

export const phantomStaff = defineWeaponItem({
  name: "Phantom Staff",
  icon: "items/phantomStaff",
  loot: tiered(8),
  weapon: singleGhost,
});
