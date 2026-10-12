import { describe, expect, it } from "vitest";
import { testWeapon } from "../../testing/defs";
import {
  defineItemTag,
  equipmentItemDef,
  ITEM_CATEGORIES,
  ITEM_KIND,
} from "./items";

const weapon = testWeapon();
const special = defineItemTag("Special");
const registries = { weapons: { bolt: weapon }, tags: { special } };

describe("itemDef", () => {
  it("resolves JSON ids and accepts bonuses for all eight stats", () => {
    const item = equipmentItemDef(
      {
        name: "Everything Ring",
        category: "equipment",
        kind: "ring",
        icon: "test/ring",
        loot: { tags: ["special"] },
        bonuses: {
          health: 1,
          mana: 2,
          attack: 3,
          defense: 4,
          speed: 5,
          dexterity: 6,
          vitality: 7,
          wisdom: 8,
        },
      },
      registries,
    );

    expect(item.category).toBe(ITEM_CATEGORIES.EQUIPMENT);
    expect(item.kind).toBe(ITEM_KIND.RING);
    expect(item.loot.tags).toEqual([special]);
    expect(item.bonuses.wisdom).toBe(8);
  });

  it("resolves a weapon id to the runtime definition", () => {
    const item = equipmentItemDef(
      {
        name: "Staff",
        category: "equipment",
        kind: "weapon",
        icon: "test/staff",
        loot: { tier: 1, tags: [] },
        bonuses: {},
        weapon: "bolt",
      },
      registries,
    );
    expect(item.weapon).toBe(weapon);
  });

  it("rejects unknown ids, stats and fields", () => {
    const base = {
      name: "Ring",
      category: "equipment",
      kind: "ring",
      icon: "test/ring",
      loot: { tier: 1, tags: [] },
      bonuses: {},
    };
    expect(() =>
      equipmentItemDef({ ...base, bonuses: { luck: 1 } }, registries),
    ).toThrow('unknown stat "luck"');
    expect(() =>
      equipmentItemDef({ ...base, extra: true }, registries),
    ).toThrow('unknown field "extra"');
    expect(() =>
      equipmentItemDef({ ...base, loot: { tags: ["missing"] } }, registries),
    ).toThrow('unknown id "missing"');
  });
});
