import { describe, expect, it } from "vitest";
import { enemyDef, enemyIds } from "./definitions";

describe("enemy definitions", () => {
  for (const id of enemyIds) {
    describe(id, () => {
      const def = enemyDef(id);

      it("starts with some health", () => {
        expect(def.health).toBeGreaterThan(0);
      });

      it("has a hitbox, a speed and a detection range", () => {
        expect(def.hitbox.r).toBeGreaterThan(0);
        expect(def.speed).toBeGreaterThanOrEqual(0);
        expect(def.detectRange).toBeGreaterThanOrEqual(0);
      });
    });
  }
});
