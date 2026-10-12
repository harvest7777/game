import { describe, expect, it } from "vitest";
import type { ItemDef } from "../../ecs/inventory/items";
import { ITEM_CATEGORIES, ITEM_KIND } from "../../ecs/inventory/items";
import { weapons } from "../weapons";
import { SPECIAL } from "./loot";
import { itemIds, items } from ".";

describe("item definitions", () => {
  for (const id of itemIds) {
    it(`${id} has exactly one progression classification`, () => {
      const def: ItemDef = items[id];
      expect(
        (def.loot.tier !== undefined) !== def.loot.tags.includes(SPECIAL),
      ).toBe(true);
    });

    it(`${id} is a weapon that fires a listed weapon`, () => {
      const def: ItemDef = items[id];
      if (
        def.category !== ITEM_CATEGORIES.EQUIPMENT ||
        def.kind !== ITEM_KIND.WEAPON
      ) {
        return;
      }
      expect(Object.values(weapons)).toContain(def.weapon);
    });
  }
});
