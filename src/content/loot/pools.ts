import { itemTier } from "../../ecs/inventory/items";
import {
  anyItem,
  anyTieredEquipment,
  drop,
  itemQuery,
  lootTable,
} from "../../ecs/loot/definitions";
import { SPECIAL } from "../items/loot";

export const slimeLoot = lootTable(
  drop(anyTieredEquipment(itemTier(1), itemTier(2)), { chance: 0.25 }),
);

export const boarLoot = lootTable(
  drop(anyTieredEquipment(itemTier(2), itemTier(4)), { chance: 0.35 }),
);

export const archerLoot = lootTable(
  drop(anyTieredEquipment(itemTier(3), itemTier(5)), { chance: 0.4 }),
);

export const slimeKingLoot = lootTable(
  drop(anyTieredEquipment(itemTier(5), itemTier(8))),
  drop(anyItem(itemQuery({ tags: [SPECIAL] })), { chance: 0.15 }),
);
