import { describe, expect, it } from "vitest";
import { testProjectile, testWeapon } from "../../testing/defs";
import type { Vec2 } from "../shared/physics/math";
import { createTiles } from "../tiles";
import { createWorld, spawn, type World } from "../world";
import { Action } from "../input/actions";
import { shootSystem } from "./shoot";
import { ring, type WeaponDef } from "./weapons";

const DT = 0.05;
const AT = { x: 10, y: 10 };

// 4 shots a second.
const STAFF = testWeapon();

function setup(weapon: WeaponDef = STAFF, player = true) {
  const world = createWorld(createTiles(20, 20));
  const shooter = spawn(world);
  const c = world.components;
  c.position.set(shooter, { ...AT });
  c.velocity.set(shooter, { x: 0, y: 0 });
  c.facing.set(shooter, { x: 0, y: 1 });
  c.team.set(shooter, "player");
  c.shooter.set(shooter, { weapon, cooldown: 0 });
  if (player) {
    c.playerControlled.set(shooter, true);
    c.autoFire.set(shooter, true);
  }
  return { world, shooter };
}

function shots(world: World) {
  return [...world.components.projectile].map(([, p]) => p);
}

function expectDirection(actual: Vec2, x: number, y: number) {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
}

function tick(world: World, ticks = 1, dt = DT) {
  for (let i = 0; i < ticks; i++) shootSystem(world, dt);
}

describe("shootSystem", () => {
  describe("rate", () => {
    it("fires straight away, then at the weapon's rate", () => {
      // 4 shots/s is one every 0.25 s: at 0, 0.25 and 0.5. Checked between
      // shots so rounding at the exact moment of a shot doesn't matter.
      const { world } = setup();
      tick(world);
      expect(shots(world)).toHaveLength(1);
      tick(world, 3); // 0.2 s
      expect(shots(world)).toHaveLength(1);
      tick(world, 8); // 0.6 s
      expect(shots(world)).toHaveLength(3);
    });

    it("fires several shots in a tick that's longer than a shot", () => {
      // A 0.6 s tick at 4 shots/s covers shots at 0, 0.25 and 0.5.
      const { world } = setup();
      tick(world, 1, 0.6);
      expect(shots(world)).toHaveLength(3);
    });
  });

  it("fires from where the shooter stands, as its team, owned by it", () => {
    const { world, shooter } = setup();
    tick(world);
    const [shot] = shots(world);
    expect(shot.origin).toEqual(AT);
    expect(shot.owner).toBe(shooter);
    expect(shot.team).toBe("player");
    expect(shot.def).toBe(STAFF.fires[0].projectile);
  });

  it("does not fire while player autofire is off", () => {
    const { world, shooter } = setup();
    world.components.autoFire.set(shooter, false);

    tick(world);

    expect(shots(world)).toEqual([]);
    expect(world.components.shooter.get(shooter)!.cooldown).toBe(0);
  });

  it("fires while Shoot is held, even with autofire off", () => {
    const { world, shooter } = setup();
    world.components.autoFire.set(shooter, false);
    world.input.held = new Set([Action.Shoot]);

    tick(world);

    expect(shots(world)).toHaveLength(1);
  });

  describe("aim", () => {
    it("aims the player's shots at the cursor", () => {
      const { world } = setup();
      world.input.aim = { x: 7, y: 6 };
      tick(world);
      expectDirection(shots(world)[0].direction, -0.6, -0.8);
    });

    it("remembers the aim on the shooter, for facing", () => {
      const { world, shooter } = setup();
      world.input.aim = { x: 13, y: 14 };
      tick(world);
      expectDirection(world.components.shooter.get(shooter)!.aim!, 0.6, 0.8);
    });

    it("aims every tick, not just when firing", () => {
      const { world, shooter } = setup();
      tick(world);
      world.input.aim = { x: 10, y: 0 };
      tick(world);
      expectDirection(world.components.shooter.get(shooter)!.aim!, 0, -1);
    });

    it("aims the way it moves before the cursor is over the game", () => {
      const { world, shooter } = setup();
      world.components.velocity.set(shooter, { x: -3, y: 0 });
      tick(world);
      expectDirection(shots(world)[0].direction, -1, 0);
    });

    it("turns its aim when it changes direction", () => {
      const { world, shooter } = setup();
      world.components.velocity.set(shooter, { x: -3, y: 0 });
      tick(world);
      world.components.velocity.set(shooter, { x: 0, y: -3 });
      tick(world);
      expectDirection(world.components.shooter.get(shooter)!.aim!, 0, -1);
    });

    it("keeps its last aim when standing still", () => {
      const { world, shooter } = setup();
      world.components.velocity.set(shooter, { x: -3, y: 0 });
      tick(world);
      world.components.velocity.set(shooter, { x: 0, y: 0 });
      tick(world, 5);
      expectDirection(shots(world)[1].direction, -1, 0);
    });

    it("starts out aiming the way it faces", () => {
      const { world } = setup();
      tick(world);
      expectDirection(shots(world)[0].direction, 0, 1);
    });

    it("ignores the cursor for anything not player controlled", () => {
      const { world, shooter } = setup(STAFF, false);
      const target = spawn(world);
      world.components.position.set(target, { x: 10, y: 15 });
      world.components.target.set(shooter, target);
      world.input.aim = { x: 0, y: 0 };
      tick(world);
      expectDirection(shots(world)[0].direction, 0, 1);
    });

    it("aims at its target when not player controlled", () => {
      const { world, shooter } = setup(STAFF, false);
      const target = spawn(world);
      world.components.position.set(target, { x: 13, y: 6 });
      world.components.target.set(shooter, target);
      tick(world);
      expectDirection(shots(world)[0].direction, 0.6, -0.8);
    });

    it("holds fire without a target when not player controlled", () => {
      const { world } = setup(STAFF, false);
      tick(world, 10);
      expect(shots(world)).toHaveLength(0);
    });

    it("fires the moment it gets a target", () => {
      const { world, shooter } = setup(STAFF, false);
      tick(world, 10);
      const target = spawn(world);
      world.components.position.set(target, { x: 10, y: 15 });
      world.components.target.set(shooter, target);
      tick(world);
      expect(shots(world)).toHaveLength(1);
    });
  });

  describe("patterns", () => {
    it("fires a full ring of shots at once", () => {
      const shard = testProjectile();
      const tenRing = testWeapon({ fires: ring(shard, 10) });
      const { world } = setup(tenRing);
      world.input.aim = { x: 20, y: 10 };

      tick(world);

      const fired = shots(world);
      expect(fired).toHaveLength(10);
      expect(fired.every((p) => p.def === shard)).toBe(true);
      const angles = fired
        .map((p) => Math.atan2(p.direction.y, p.direction.x))
        .map((a) => (a + 2 * Math.PI) % (2 * Math.PI))
        .sort((a, b) => a - b);
      for (let i = 1; i < angles.length; i++) {
        expect(angles[i] - angles[i - 1]).toBeCloseTo((2 * Math.PI) / 10);
      }
      expect(world.events.shotsFired).toHaveLength(1);
      expect(world.events.shotsFired[0]).toMatchObject({
        weapon: tenRing,
      });
    });
  });

  it("refuses to fire for a shooter with no team", () => {
    const { world, shooter } = setup();
    world.components.team.delete(shooter);
    expect(() => tick(world)).toThrow();
  });

  it("fires each projectile its weapon lists, mirrored where it says", () => {
    const helix = testProjectile({ wave: { amplitude: 1, frequency: 1 } });
    const twin = testWeapon({
      fires: [{ projectile: helix }, { projectile: helix, mirror: true }],
    });
    const { world } = setup(twin);

    tick(world);

    expect(shots(world).map((p) => [p.def, p.mirror])).toEqual([
      [helix, false],
      [helix, true],
    ]);
  });

  it("skips shooters with no position", () => {
    const world = createWorld(createTiles(20, 20));
    const shooter = spawn(world);
    world.components.shooter.set(shooter, { weapon: STAFF, cooldown: 0 });
    tick(world);
    expect(shots(world)).toHaveLength(0);
  });
});
