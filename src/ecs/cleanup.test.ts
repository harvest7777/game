import { describe, expect, it } from "vitest";
import { cleanupSystem } from "./cleanup";
import { createTiles } from "./tiles";
import { createWorld, spawn } from "./world";

describe("cleanupSystem", () => {
  it("removes everything queued, even if queued twice", () => {
    const world = createWorld(createTiles(1, 1));
    const a = spawn(world);
    const b = spawn(world);
    const kept = spawn(world);
    for (const e of [a, b, kept]) {
      world.components.position.set(e, { x: 0, y: 0 });
    }
    world.events.despawns.push(a, b, a);

    cleanupSystem(world, 1);

    expect(world.components.position.has(a)).toBe(false);
    expect(world.components.position.has(b)).toBe(false);
    expect(world.components.position.has(kept)).toBe(true);
  });
});
