import { describe, expect, it } from "vitest";
import {
  ITEM_CATEGORIES,
  ITEM_KIND,
  defineItemTag,
  itemTier,
  type ConsumableItemDef,
} from "../inventory/items";
import { testItem } from "../../testing/defs";
import {
  anyItem,
  anyTieredEquipment,
  defineLootBag,
  drop,
  exactItem,
  itemQuery,
  lootTable,
  weightedChoice,
  weightedOption,
} from "./definitions";
import { bagForItem, bundleLoot, createLootRuntime, rollLoot } from "./runtime";

const SPECIAL = defineItemTag("Special");
const STAT_POTION = defineItemTag("Stat potion");

const tieredBag = defineLootBag({
  name: "Tiered",
  art: { kind: "static", file: "test/tiered-bag" },
  priority: 10,
  capacity: 8,
  lifetime: 60,
  matches: itemQuery({ tier: { min: itemTier(0), max: itemTier(100) } }),
});
const consumableBag = defineLootBag({
  name: "Consumable",
  art: { kind: "static", file: "test/consumable-bag" },
  priority: 20,
  capacity: 8,
  lifetime: 60,
  matches: itemQuery({ categories: [ITEM_CATEGORIES.CONSUMABLE] }),
});
const statBag = defineLootBag({
  name: "Stat",
  art: { kind: "static", file: "test/stat-bag" },
  priority: 30,
  capacity: 8,
  lifetime: 60,
  matches: itemQuery({ tags: [STAT_POTION] }),
});
const specialBag = defineLootBag({
  name: "Special",
  art: { kind: "static", file: "test/special-bag" },
  priority: 100,
  capacity: 8,
  lifetime: 60,
  matches: itemQuery({ tags: [SPECIAL] }),
});

function runtime(
  items: Parameters<typeof createLootRuntime>[0]["items"],
  tables: Parameters<typeof createLootRuntime>[0]["tables"],
) {
  return createLootRuntime({
    items,
    tables,
    bags: [tieredBag, consumableBag, statBag, specialBag],
  });
}

describe("loot selection", () => {
  it("chooses an equipment kind before an item within that kind", () => {
    const weapons = ["A", "B", "C"].map((name) => testItem({ name }));
    const armor = testItem({ name: "Armor", kind: ITEM_KIND.ARMOR });
    const table = lootTable(drop(anyTieredEquipment(itemTier(1), itemTier(1))));
    const loot = runtime([...weapons, armor], [table]);
    const values = [0.6, 0];
    expect(rollLoot(loot, table, () => values.shift() ?? 0)).toEqual([armor]);
  });

  it("automatically includes newly registered items in a query", () => {
    const first = testItem({ name: "First" });
    const future = testItem({ name: "Future" });
    const table = lootTable(drop(anyTieredEquipment(itemTier(1), itemTier(1))));
    const loot = runtime([first, future], [table]);
    const values = [0, 0.99];
    expect(rollLoot(loot, table, () => values.shift() ?? 0)).toEqual([future]);
  });

  it("supports exact and weighted sources without content ids", () => {
    const common = testItem({ name: "Common" });
    const rare = testItem({
      name: "Rare",
      loot: { tags: [SPECIAL] },
    });
    const table = lootTable(
      drop(
        weightedChoice(
          weightedOption(9, exactItem(common)),
          weightedOption(1, exactItem(rare)),
        ),
      ),
    );
    const loot = runtime([common, rare], [table]);
    expect(rollLoot(loot, table, () => 0.95)).toEqual([rare]);
  });

  it("uses chance independently for every roll", () => {
    const item = testItem();
    const table = lootTable(drop(exactItem(item), { chance: 0.5, rolls: 2 }));
    const loot = runtime([item], [table]);
    const values = [0.2, 0, 0.8];
    expect(rollLoot(loot, table, () => values.shift() ?? 0)).toEqual([item]);
  });
});

describe("rollLoot chance scale", () => {
  const item = testItem();
  const table = lootTable(drop(exactItem(item), { chance: 0.1 }));

  it("multiplies each rule's chance", () => {
    const loot = runtime([item], [table]);
    // A roll of 0.25 misses a 10% chance but makes it at 3x (30%).
    expect(rollLoot(loot, table, () => 0.25)).toEqual([]);
    expect(rollLoot(loot, table, () => 0.25, 3)).toEqual([item]);
  });

  it("never makes a chance more than certain", () => {
    const loot = runtime([item], [table]);
    expect(rollLoot(loot, table, () => 0.999, 50)).toEqual([item]);
  });
});

describe("loot bags", () => {
  it("lets a stat potion override the general consumable bag", () => {
    const potion: ConsumableItemDef = {
      name: "Potion",
      category: ITEM_CATEGORIES.CONSUMABLE,
      icon: "test/potion",
      loot: { tags: [STAT_POTION] },
      use: { kind: "heal", amount: 1 },
    };
    const loot = runtime([potion], []);
    expect(bagForItem(loot, potion)).toBe(statBag);
  });

  it("keeps a special item with regular loot and splits overflow", () => {
    const regular = Array.from({ length: 8 }, (_, index) =>
      testItem({ name: `Tiered ${index}` }),
    );
    const special = testItem({
      name: "Special",
      loot: { tags: [SPECIAL] },
    });
    const loot = runtime([...regular, special], []);
    const bundles = bundleLoot(loot, [...regular, special]);
    expect(bundles).toHaveLength(2);
    expect(bundles[0].bag).toBe(specialBag);
    expect(bundles[0].items).toContain(special);
    expect(bundles[0].items).toHaveLength(8);
    expect(bundles[1]).toEqual({ bag: tieredBag, items: [regular[7]] });
  });

  it("can select special items through their tag", () => {
    const regular = testItem();
    const special = testItem({ name: "Special", loot: { tags: [SPECIAL] } });
    const table = lootTable(drop(anyItem(itemQuery({ tags: [SPECIAL] }))));
    const loot = runtime([regular, special], [table]);
    expect(rollLoot(loot, table, () => 0)).toEqual([special]);
  });
});
