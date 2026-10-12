import { itemTier } from "../../ecs/inventory/items";
import {
  anyItem,
  anyTieredEquipment,
  drop,
  exactItem,
  itemQuery,
  lootTable,
} from "../../ecs/loot/definitions";
import { SPECIAL } from "../items/loot";
import { demonfireStaff } from "../items/demonfireStaff";
import { healthPotion } from "../items/healthPotion";

// Every ordinary enemy's chance to drop a health potion.
const POTION_CHANCE = 0.1;
const potion = drop(exactItem(healthPotion), { chance: POTION_CHANCE });

export const slimeLoot = lootTable(
  drop(anyTieredEquipment(itemTier(1), itemTier(2)), { chance: 0.25 }),
  potion,
);

export const boarLoot = lootTable(
  drop(anyTieredEquipment(itemTier(2), itemTier(4)), { chance: 0.35 }),
  potion,
);

export const archerLoot = lootTable(
  drop(anyTieredEquipment(itemTier(3), itemTier(5)), { chance: 0.4 }),
  potion,
);

export const slimeKingLoot = lootTable(
  drop(anyTieredEquipment(itemTier(5), itemTier(8))),
  drop(anyItem(itemQuery({ tags: [SPECIAL] })), { chance: 0.15 }),
);

// Abyss of Demons: ordinary demons drop mid-tier gear, its guards better,
// and Malphas the best, with a fair chance at his Demonfire Staff.
export const impLoot = lootTable(
  drop(anyTieredEquipment(itemTier(3), itemTier(5)), { chance: 0.1 }),
  potion,
);

export const demonLoot = lootTable(
  drop(anyTieredEquipment(itemTier(4), itemTier(6)), { chance: 0.3 }),
  potion,
);

export const bruteLoot = lootTable(
  drop(anyTieredEquipment(itemTier(5), itemTier(7)), { chance: 0.35 }),
  potion,
);

export const protectorLoot = lootTable(
  drop(anyTieredEquipment(itemTier(6), itemTier(8))),
  drop(anyItem(itemQuery({ tags: [SPECIAL] })), { chance: 0.1 }),
);

export const malphasLoot = lootTable(
  drop(anyTieredEquipment(itemTier(7), itemTier(8))),
  drop(anyTieredEquipment(itemTier(6), itemTier(8)), { chance: 0.5 }),
  drop(exactItem(demonfireStaff), { chance: 0.25 }),
);
