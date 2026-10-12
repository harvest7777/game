import { describe, expect, it } from "vitest";
import { weaponIds } from "../projectile/weapons";
import { itemDef, itemIds } from "./items";

describe("item definitions", () => {
  for (const id of itemIds) {
    it(`${id} is a weapon that fires a real weapon`, () => {
      const def = itemDef(id);
      if (def.kind !== "weapon") return;
      expect(weaponIds).toContain(def.weapon);
    });
  }
});
