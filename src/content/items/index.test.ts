import { describe, expect, it } from "vitest";
import type { ItemDef } from "../../ecs/inventory/items";
import { weapons } from "../weapons";
import { itemIds, items } from ".";

describe("item definitions", () => {
  for (const id of itemIds) {
    it(`${id} is a weapon that fires a listed weapon`, () => {
      const def: ItemDef = items[id];
      if (def.kind !== "weapon") return;
      expect(Object.values(weapons)).toContain(def.weapon);
    });
  }
});
