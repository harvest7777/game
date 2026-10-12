import { describe, expect, it } from "vitest";
import type { CharacterDef } from "../../ecs/character/definitions";
import { ITEM_KIND } from "../../ecs/inventory/items";
import { items } from "../items";
import { characterIds, characters } from ".";
import { STAT } from "../../ecs/stats/components";

describe("character definitions", () => {
  for (const id of characterIds) {
    describe(id, () => {
      const def: CharacterDef = characters[id];

      it("has some health, a hitbox and a speed", () => {
        expect(def.stats[STAT.HEALTH].value).toBeGreaterThan(0);
        expect(def.hitbox.r).toBeGreaterThan(0);
        expect(def.stats[STAT.SPEED].value).toBeGreaterThan(0);
      });

      it("starts with listed equipment in matching slots", () => {
        for (const [slot, item] of Object.entries(
          def.startingEquipment ?? {},
        )) {
          expect(Object.values(items)).toContain(item);
          expect(item.kind).toBe(slot);
        }
        expect(def.startingEquipment?.weapon?.kind).toBe(ITEM_KIND.WEAPON);
      });
    });
  }
});
