import { singleAccelerating } from "../weapons/singleAccelerating";
import { tiered } from "./loot";
import { defineWeaponItem } from "./shared";

export const cometStaff = defineWeaponItem({
  name: "Comet Staff",
  icon: "items/cometStaff",
  loot: tiered(5),
  weapon: singleAccelerating,
});
