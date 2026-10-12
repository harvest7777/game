import { describe, expect, it } from "vitest";
import type { WeaponDef } from "../../ecs/projectile/weapons";
import { projectiles } from "../projectiles";
import { weaponIds, weapons } from ".";

describe("weapon definitions", () => {
  for (const id of weaponIds) {
    describe(id, () => {
      const def: WeaponDef = weapons[id];

      it("fires at a positive rate with at least one projectile", () => {
        expect(def.rate).toBeGreaterThan(0);
        expect(def.fires.length).toBeGreaterThanOrEqual(1);
      });

      it("fires only listed projectiles", () => {
        for (const { projectile } of def.fires) {
          expect(Object.values(projectiles)).toContain(projectile);
        }
      });
    });
  }
});
