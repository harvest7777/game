import { describe, expect, it } from "vitest";
import type { CharacterDef } from "../../ecs/character/definitions";
import { items } from "../items";
import { characterIds, characters } from ".";

describe("character definitions", () => {
  for (const id of characterIds) {
    describe(id, () => {
      const def: CharacterDef = characters[id];

      it("has some health, a hitbox and a speed", () => {
        expect(def.health).toBeGreaterThan(0);
        expect(def.hitbox.r).toBeGreaterThan(0);
        expect(def.speed).toBeGreaterThan(0);
      });

      it("starts with a listed weapon", () => {
        if (!def.startingWeapon) return;
        expect(Object.values(items)).toContain(def.startingWeapon);
        expect(def.startingWeapon.kind).toBe("weapon");
      });
    });
  }
});
