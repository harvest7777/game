import { describe, expect, it } from "vitest";
import { spawnEnemy } from "../enemy/spawn";
import { fireProjectile } from "../projectile/spawn";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { soundSystem } from "./system";

describe("soundSystem", () => {
  it("turns one volley into one firing sound", () => {
    const world = createWorld(createTiles(10, 10));
    world.components.playerControlled.set(3, true);
    world.events.shotsFired.push({
      projectile: "bolt",
      owner: 3,
      at: { x: 2, y: 4 },
    });

    soundSystem(world, 0.05);

    expect(world.outbox).toEqual([
      { kind: "sound", sound: "magicFire", at: { x: 2, y: 4 } },
    ]);
  });

  it("distinguishes player and enemy impacts", () => {
    const world = createWorld(createTiles(10, 10));
    const owner = spawn(world);
    const shot = fireProjectile(world, {
      def: "bolt",
      owner,
      team: "player",
      at: { x: 1, y: 1 },
      toward: { x: 1, y: 0 },
    });
    const player = spawn(world);
    const enemy = spawn(world);
    world.components.position.set(player, { x: 2, y: 3 });
    world.components.position.set(enemy, { x: 4, y: 5 });
    world.components.team.set(player, "player");
    world.components.team.set(enemy, "enemy");
    world.events.hits.push(
      {
        projectile: shot,
        target: player,
        owner,
        damage: 1,
        armorPiercing: false,
      },
      {
        projectile: shot,
        target: enemy,
        owner,
        damage: 1,
        armorPiercing: false,
      },
    );
    soundSystem(world, 0.05);

    expect(world.outbox).toEqual([
      { kind: "sound", sound: "hitPlayer", at: { x: 2, y: 3 } },
      { kind: "sound", sound: "hitEnemy", at: { x: 4, y: 5 } },
    ]);
  });

  it("keeps ordinary enemy shots quiet but plays boss shots", () => {
    const world = createWorld(createTiles(10, 10), () => 0.5);
    const slime = spawnEnemy(world, "slime", { x: 2, y: 2 });
    const boss = spawnEnemy(world, "slimeKing", { x: 6, y: 6 });
    world.events.shotsFired.push(
      { projectile: "slimeBall", owner: slime, at: { x: 2, y: 2 } },
      { projectile: "slimeBall", owner: boss, at: { x: 6, y: 6 } },
    );

    soundSystem(world, 0.05);

    expect(world.outbox).toEqual([
      { kind: "sound", sound: "magicFire", at: { x: 6, y: 6 } },
    ]);
  });

  it("plays an enemy's authored death sound", () => {
    const world = createWorld(createTiles(10, 10), () => 0.5);
    const enemy = spawnEnemy(world, "slimeKing", { x: 4, y: 6 });
    world.events.deaths.push({ entity: enemy });

    soundSystem(world, 0.05);

    expect(world.outbox).toEqual([
      { kind: "sound", sound: "bossDeath", at: { x: 4, y: 6 } },
    ]);
  });
});
