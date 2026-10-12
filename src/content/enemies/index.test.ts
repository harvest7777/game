import { describe, expect, it } from "vitest";
import type { EnemyDef } from "../../ecs/enemy/definitions";
import { IDLE_CLIP } from "../../ecs/sprite/art";
import { weapons } from "../weapons";
import { enemies, enemyIds } from ".";

describe("enemy definitions", () => {
  for (const id of enemyIds) {
    describe(id, () => {
      const def: EnemyDef = enemies[id];

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

      it("only fires listed weapons", () => {
        const fired = [
          def.weapon,
          ...Object.values(def.phases?.list ?? {}).map((p) => p.weapon),
          ...Object.values(def.sequences ?? {}).flatMap((sequence) =>
            sequence.stages.flatMap((stage) =>
              (stage.cues ?? []).map(({ cue }) =>
                cue.kind === "fire" ? cue.weapon : undefined,
              ),
            ),
          ),
        ];
        for (const weapon of fired) {
          if (weapon) expect(Object.values(weapons)).toContain(weapon);
        }
      });

      it("has an idle clip if it's animated", () => {
        const { art } = def.sprite;
        if (art.kind === "animated") expect(art.clips[IDLE_CLIP]).toBeDefined();
      });

      it("has a hitbox, a speed and a detection range", () => {
        expect(def.hitbox.r).toBeGreaterThan(0);
        expect(def.speed).toBeGreaterThanOrEqual(0);
        expect(def.detectRange).toBeGreaterThanOrEqual(0);
      });
    });
  }
});
