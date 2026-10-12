import { describe, expect, it } from "vitest";
import { itemTier } from "../../ecs/inventory/items";
import { bagForItem, createLootRuntime } from "../../ecs/loot/runtime";
import { testConsumable, testItem } from "../../testing/defs";
import { enemies } from "../enemies";
import { items } from "../items";
import { SPECIAL } from "../items/loot";
import { gameLoot } from ".";
import { brownBag, lootBags, tieredBag } from "./bags";

describe("game loot", () => {
  it("compiles every enemy loot table", () => {
    for (const enemy of Object.values(enemies)) {
      if (enemy.loot) expect(gameLoot.tables.has(enemy.loot)).toBe(true);
    }
  });

  it("assigns every item a bag", () => {
    for (const item of Object.values(items)) {
      expect(bagForItem(gameLoot, item), item.name).toBeDefined();
    }
  });

  it("uses brown bags for current ordinary tiered items", () => {
    for (const item of Object.values(items)) {
      if (item.loot.tier === undefined || item.loot.tags.includes(SPECIAL)) {
        continue;
      }
      expect(bagForItem(gameLoot, item), item.name).toBe(brownBag);
    }
  });

  it("uses brown for consumables and leaves higher future tiers to blue", () => {
    const consumable = testConsumable({ name: "Consumable" });
    const futureTier = testItem({
      name: "Future tier",
      loot: { tier: itemTier(9), tags: [] },
    });
    const runtime = createLootRuntime({
      items: [consumable, futureTier],
      tables: [],
      bags: lootBags,
    });

    expect(bagForItem(runtime, consumable)).toBe(brownBag);
    expect(bagForItem(runtime, futureTier)).toBe(tieredBag);
  });

  it("gives every bag a one-minute life and ten-second black flash", () => {
    for (const bag of lootBags) {
      expect(bag.lifetime).toBe(60);
      expect(bag.expiryFlash).toEqual({
        duration: 10,
        startFrequency: 1,
        endFrequency: 7,
      });
      expect(bag.outline).toEqual({ color: [0, 0, 0, 1] });
    }
  });
});
