import { describe, expect, it } from "vitest";
import { projectileDef, projectileIds } from "./definitions";

describe("projectile definitions", () => {
  for (const id of projectileIds) {
    describe(id, () => {
      const def = projectileDef(id);

      it("lives for some time", () => {
        expect(def.lifetime).toBeGreaterThan(0);
      });

      it("has a hitbox", () => {
        expect(def.hitbox.r).toBeGreaterThanOrEqual(0);
      });

      it("has a speed range that makes sense", () => {
        expect(def.speed).toBeGreaterThanOrEqual(0);
        if (def.minSpeed !== undefined && def.maxSpeed !== undefined) {
          expect(def.minSpeed).toBeLessThanOrEqual(def.maxSpeed);
        }
      });

      it("only turns if it has a speed to turn at", () => {
        if (def.turnRate) expect(def.speed).toBeGreaterThan(0);
      });

      it("waves at a real frequency", () => {
        if (def.wave) expect(def.wave.frequency).toBeGreaterThan(0);
      });
    });
  }
});
