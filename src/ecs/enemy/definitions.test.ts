import { describe, expect, it } from "vitest";
import { enemyDef, enemyIds } from "./definitions";

describe("enemy definitions", () => {
  for (const id of enemyIds) {
    describe(id, () => {
      const def = enemyDef(id);

      it("starts with some health", () => {
        expect(def.health).toBeGreaterThan(0);
      });

      it("only moves to phases it has", () => {
        if (!def.phases) return;
        const names = Object.keys(def.phases.list);
        expect(names).toContain(def.phases.start);
        for (const phase of Object.values(def.phases.list)) {
          for (const { to } of phase.next ?? []) expect(names).toContain(to);
          for (const sequence of phase.rotation ?? []) {
            expect(def.sequences?.[sequence]).toBeDefined();
          }
        }
      });

      it("has a hitbox, a speed and a detection range", () => {
        expect(def.hitbox.r).toBeGreaterThan(0);
        expect(def.speed).toBeGreaterThanOrEqual(0);
        expect(def.detectRange).toBeGreaterThanOrEqual(0);
      });
    });
  }
});
