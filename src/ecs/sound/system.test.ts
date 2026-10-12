import { describe, expect, it } from "vitest";
import { spread } from "../projectile/weapons";
import { testEnemy, testProjectile, testWeapon } from "../../testing/defs";
import { spawnEnemy } from "../enemy/spawn";
import { fireProjectile } from "../projectile/spawn";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import { soundSystem } from "./system";

describe("soundSystem", () => {
  it("turns one volley into one firing sound", () => {
    const world = createWorld(createTiles(10, 10));
    world.events.shotsFired.push({
      weapon: testWeapon({
        fires: spread(testProjectile(), 5, 0.2),
        sound: "magicFire",
      }),
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
      def: testProjectile(),
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

  it("keeps a weapon with no firing sound quiet", () => {
    const world = createWorld(createTiles(10, 10));
    world.events.shotsFired.push(
      { weapon: testWeapon(), owner: 1, at: { x: 2, y: 2 } },
      {
        weapon: testWeapon({ sound: "magicFire" }),
        owner: 2,
        at: { x: 6, y: 6 },
      },
    );

    soundSystem(world, 0.05);

    expect(world.outbox).toEqual([
      { kind: "sound", sound: "magicFire", at: { x: 6, y: 6 } },
    ]);
  });

  it("plays an enemy's authored death sound", () => {
    const world = createWorld(createTiles(10, 10), () => 0.5);
    const enemy = spawnEnemy(world, testEnemy({ deathSound: "bossDeath" }), {
      x: 4,
      y: 6,
    });
    world.events.deaths.push({ entity: enemy });

    soundSystem(world, 0.05);

    expect(world.outbox).toEqual([
      { kind: "sound", sound: "bossDeath", at: { x: 4, y: 6 } },
    ]);
  });
});
