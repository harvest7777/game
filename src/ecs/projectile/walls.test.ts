import { describe, expect, it } from "vitest";
import { testProjectile } from "../../testing/defs";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { fireProjectile } from "./spawn";
import { projectileWallHitSystem } from "./walls";

describe("projectileWallHitSystem", () => {
  function blockedProjectile() {
    const world = createWorld(createTiles(10, 10));
    const owner = spawn(world);
    const projectile = fireProjectile(world, {
      def: testProjectile(),
      owner,
      team: "player",
      at: { x: 3, y: 4 },
      toward: { x: 1, y: 0 },
    });
    world.components.blocked.set(projectile, {
      t: 0.02,
      normal: { x: -1, y: 0 },
    });
    return { world, projectile };
  }

  it("removes a stopped projectile", () => {
    const { world, projectile } = blockedProjectile();

    projectileWallHitSystem(world, 0.05);

    expect(world.events.despawns).toEqual([projectile]);
  });

  it("does not also hit the wall when an entity hit already removed it", () => {
    const { world, projectile } = blockedProjectile();
    world.events.despawns.push(projectile);

    projectileWallHitSystem(world, 0.05);

    expect(world.events.despawns).toEqual([projectile]);
  });
});
