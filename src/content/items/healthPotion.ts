import {
  ITEM_CATEGORIES,
  type ConsumableItemDef,
} from "../../ecs/inventory/items";

// Restores 100 health. Ordinary enemies drop them now and then.
export const healthPotion: ConsumableItemDef = {
  name: "Health Potion",
  category: ITEM_CATEGORIES.CONSUMABLE,
  icon: "items/healthPotion",
  loot: { tags: [] },
  use: { kind: "heal", amount: 100 },
};
