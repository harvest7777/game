import { demonfireStaff as demonfire } from "../weapons/demonfireStaff";
import { special } from "./loot";
import { defineWeaponItem } from "./shared";

// Archdemon Malphas's prize: two weaving fireballs that burn through
// everything they hit.
export const demonfireStaff = defineWeaponItem({
  name: "Demonfire Staff",
  icon: "items/demonfireStaff",
  loot: special,
  weapon: demonfire,
});
