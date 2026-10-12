import { describe, expect, it } from "vitest";
import { testBoss, testEnemy, testItem, testWeapon } from "../testing/defs";
import { addControllable, addMovable, addShooter, addSprite } from "./bundles";
import { spawnEnemy } from "./enemy/spawn";
import { addHoldings } from "./inventory/bundle";
import { Action } from "./input/actions";
import { CROUCH_SPEED } from "./input/system";
import { runTick } from "./tick";
import { createTiles, setWall } from "./tiles";
import { createWorld, spawn, type World } from "./world";

const SPEED = 4;
const DT = 0.1;
const START = { x: 10, y: 10 };
const R = 0.4;

// A player standing in the middle of an open 20x20 map, with autofire on.
function setup() {
  const world = createWorld(createTiles(20, 20));
  const player = spawn(world);
  addMovable(world, player, { at: START, hitbox: { r: R } });
  addControllable(world, player, { speed: SPEED });
  world.components.team.set(player, "player");
  world.components.autoFire.set(player, true);
  addSprite(world, player, {
    art: { kind: "static", file: "player" },
    layer: "player",
  });
  const position = () => world.components.position.get(player)!;
  const facing = () => world.components.facing.get(player)!;
  return { world, position, facing };
}

function hold(world: World, ...actions: Action[]) {
  world.input.held = new Set(actions);
}

describe("runTick", () => {
  describe("walking", () => {
    const step = SPEED * DT;

    it("Up moves up the screen", () => {
      const { world, position } = setup();
      hold(world, Action.Up);
      runTick(world, DT);
      expect(position().x).toBeCloseTo(START.x);
      expect(position().y).toBeCloseTo(START.y - step);
    });

    it("Down moves down the screen", () => {
      const { world, position } = setup();
      hold(world, Action.Down);
      runTick(world, DT);
      expect(position().y).toBeCloseTo(START.y + step);
    });

    it("Left moves left on the screen", () => {
      const { world, position } = setup();
      hold(world, Action.Left);
      runTick(world, DT);
      expect(position().x).toBeCloseTo(START.x - step);
    });

    it("Right moves right on the screen", () => {
      const { world, position } = setup();
      hold(world, Action.Right);
      runTick(world, DT);
      expect(position().x).toBeCloseTo(START.x + step);
    });

    it("stops as soon as keys are released", () => {
      const { world, position } = setup();
      hold(world, Action.Right);
      runTick(world, DT);
      const afterWalking = { ...position() };

      hold(world);
      runTick(world, DT);

      expect(position()).toEqual(afterWalking);
    });
  });

  it("faces the way it walks and keeps facing that way after stopping", () => {
    const { world, facing } = setup();
    hold(world, Action.Left);
    runTick(world, DT);
    hold(world);
    runTick(world, DT);

    expect(facing()).toEqual({ x: -1, y: 0 });
  });

  it("shift walks slower", () => {
    const { world, position } = setup();
    hold(world, Action.Right, Action.Crouch);

    runTick(world, DT);

    expect(position().x).toBeCloseTo(START.x + SPEED * CROUCH_SPEED * DT);
  });

  describe("rotating", () => {
    it("turns the camera without moving the player", () => {
      const { world, position } = setup();
      hold(world, Action.RotateRight);

      runTick(world, DT);

      expect(world.camera.angle).toBeCloseTo(world.camera.turnSpeed * DT);
      expect(position()).toEqual(START);
    });

    it("keeps Up pointing at the top of the screen after turning", () => {
      const { world, position } = setup();
      world.camera.angle = Math.PI / 2;
      hold(world, Action.Up);

      runTick(world, DT);

      // Top of the screen faces world +x at π/2.
      expect(position().x).toBeCloseTo(START.x + SPEED * DT);
      expect(position().y).toBeCloseTo(START.y);
    });

    it("uses this tick's angle when turning and walking together", () => {
      const { world, position } = setup();
      world.camera.turnSpeed = Math.PI / 2 / DT; // a quarter turn in one tick
      hold(world, Action.RotateRight, Action.Up);

      runTick(world, DT);

      expect(position().x).toBeCloseTo(START.x + SPEED * DT);
    });
  });

  describe("shooting", () => {
    function shooting() {
      const setupResult = setup();
      const { world } = setupResult;
      const player = [...world.components.playerControlled][0][0];
      addShooter(world, player, { weapon: testWeapon() });
      const shots = () =>
        [...world.components.projectile].map(([e, p]) => ({
          ...p,
          at: world.components.position.get(e)!,
        }));
      return { ...setupResult, shots };
    }

    it("holds fire with autofire off until Shoot is held", () => {
      const { world, shots } = shooting();
      const player = [...world.components.playerControlled][0][0];
      world.components.autoFire.set(player, false);
      world.input.aim = { x: START.x, y: START.y - 5 };

      runTick(world, DT);
      expect(shots()).toHaveLength(0);

      world.input.held = new Set([Action.Shoot]);
      runTick(world, DT);
      expect(shots()).toHaveLength(1);
    });

    it("autofires toward the cursor, already moving on the first tick", () => {
      const { world, shots } = shooting();
      world.input.aim = { x: START.x, y: START.y - 5 };

      runTick(world, DT);

      const [shot] = shots();
      expect(shot.direction.x).toBeCloseTo(0);
      expect(shot.direction.y).toBeCloseTo(-1);
      expect(shot.at.y).toBeLessThan(START.y);
    });

    it("fires a newly equipped weapon on the same tick", () => {
      const { world } = setup();
      const player = [...world.components.playerControlled][0][0];
      world.components.team.set(player, "player");
      const lance = testItem({ name: "Lance" });
      addHoldings(world, player, {
        weapon: testItem({ name: "Staff" }),
        carrying: [lance],
      });
      world.input.aim = { x: START.x + 5, y: START.y };
      world.input.commands = [{ kind: "equip", index: 0 }];

      runTick(world, DT);

      const shots = [...world.components.projectile].map(([, p]) => p.def);
      expect(shots).toEqual([lance.weapon!.fires[0].projectile]);
    });

    it("faces the cursor while walking the other way", () => {
      const { world, facing } = shooting();
      world.input.aim = { x: START.x + 5, y: START.y };
      hold(world, Action.Left);

      runTick(world, DT);

      expect(facing()).toEqual({ x: 1, y: 0 });
    });

    it("aims at the cursor's world point whatever the camera angle", () => {
      const { world, shots } = shooting();
      world.camera.angle = Math.PI / 2;
      world.input.aim = { x: START.x + 5, y: START.y };

      runTick(world, DT);

      expect(shots()[0].direction.x).toBeCloseTo(1);
    });
  });

  it("shoots an enemy until it's removed", () => {
    const { world } = setup();
    const player = [...world.components.playerControlled][0][0];
    addShooter(world, player, { weapon: testWeapon() });
    const dummy = spawn(world);
    addMovable(world, dummy, {
      at: { x: START.x + 3, y: START.y },
      hitbox: { r: 0.4 },
    });
    world.components.health.set(dummy, { hp: 50, max: 50 });
    world.components.team.set(dummy, "enemy");
    world.input.aim = { x: START.x + 3, y: START.y };

    // Test shots deal 10 at 4 shots/s: dead within 5 shots.
    for (let i = 0; i < 20 && world.components.health.has(dummy); i++) {
      runTick(world, DT);
    }

    expect(world.components.health.has(dummy)).toBe(false);
    expect(world.components.position.has(dummy)).toBe(false);
  });

  it("shows damage numbers that float away and disappear", () => {
    const { world } = setup();
    const player = [...world.components.playerControlled][0][0];
    addShooter(world, player, { weapon: testWeapon() });
    const still = { kind: "stationary" } as const;
    const dummyDef = testEnemy({ idle: still, aggro: still });
    const dummy = spawnEnemy(world, dummyDef, { x: START.x + 2, y: START.y });
    world.input.aim = { x: START.x + 2, y: START.y };

    let ticks = 0;
    while (world.components.floatingText.size === 0 && ticks++ < 20) {
      runTick(world, DT);
    }
    const [[text, number]] = [...world.components.floatingText];
    const hurt = dummyDef.health - world.components.health.get(dummy)!.hp;
    expect(Number(number.text)).toBe(hurt);
    // A new number starts fresh on the tick it appears.
    expect(number.age).toBe(0);

    world.components.shooter.delete(player);
    for (let i = 0; i < 10; i++) runTick(world, DT);
    expect(world.components.floatingText.has(text)).toBe(false);
  });

  describe("enemies", () => {
    // Notices things within 7 tiles and chases to 2.5 tiles, shooting.
    const SLIME = testEnemy({ weapon: testWeapon() });

    function withPlayerHealth() {
      const result = setup();
      const player = [...result.world.components.playerControlled][0][0];
      result.world.components.health.set(player, { hp: 500, max: 500 });
      result.world.components.team.set(player, "player");
      const hp = () => result.world.components.health.get(player)!.hp;
      return { ...result, hp };
    }

    it("shoot the player once in range, and it hurts", () => {
      const { world, hp } = withPlayerHealth();
      spawnEnemy(world, SLIME, { x: START.x + 3, y: START.y });

      for (let i = 0; i < 20; i++) runTick(world, DT);

      expect(hp()).toBeLessThan(500);
    });

    it("come after the player once in range", () => {
      const { world } = withPlayerHealth();
      const slime = spawnEnemy(world, SLIME, { x: START.x + 6, y: START.y });

      for (let i = 0; i < 10; i++) runTick(world, DT);

      // Chasing to 2.5 tiles away.
      const at = world.components.position.get(slime)!;
      expect(at.x).toBeLessThan(START.x + 6);
      expect(at.x).toBeGreaterThanOrEqual(START.x + 2.5 - 1e-6);
    });

    it("move a boss on to its next phase as it's hurt", () => {
      const { world } = withPlayerHealth();
      const king = spawnEnemy(world, testBoss(), {
        x: START.x + 5,
        y: START.y,
      });
      // Below two thirds of its 1000 health.
      world.components.health.get(king)!.hp = 600;

      runTick(world, DT);

      expect(world.components.enemy.get(king)!.phase!.name).toBe("enraged");
      expect(world.components.bossAction.get(king)).toMatchObject({
        sequence: "charge",
        rotationIndex: 0,
      });
    });

    it("kill the player once its health runs out", () => {
      const { world } = withPlayerHealth();
      const player = [...world.components.playerControlled][0][0];
      world.components.health.get(player)!.hp = 1;
      spawnEnemy(world, SLIME, { x: START.x + 3, y: START.y });

      for (let i = 0; i < 20; i++) runTick(world, DT);

      expect(world.components.health.has(player)).toBe(false);
      expect(world.components.position.has(player)).toBe(false);
    });

    it("can't hurt an invulnerable player, though their shots still hit", () => {
      const { world, hp } = withPlayerHealth();
      const player = [...world.components.playerControlled][0][0];
      world.components.invulnerable.set(player, true);
      spawnEnemy(world, SLIME, { x: START.x + 3, y: START.y });

      let hits = 0;
      for (let i = 0; i < 20; i++) {
        runTick(world, DT);
        hits += world.events.hits.filter((h) => h.target === player).length;
      }

      expect(hits).toBeGreaterThan(0);
      expect(hp()).toBe(500);
    });

    it("leave the player alone out of range", () => {
      const { world, hp } = withPlayerHealth();
      spawnEnemy(world, SLIME, { x: START.x + 9, y: START.y });

      for (let i = 0; i < 20; i++) runTick(world, DT);

      expect(world.components.projectile.size).toBe(0);
      expect(hp()).toBe(500);
    });
  });

  it("clears events from before the tick, queued removals included", () => {
    const { world } = setup();
    const doomed = spawn(world);
    world.components.position.set(doomed, { x: 1, y: 1 });
    world.events.hits.push({
      projectile: doomed,
      target: doomed,
      owner: doomed,
      damage: 1,
      armorPiercing: false,
    });
    world.events.despawns.push(doomed);

    runTick(world, DT);

    expect(world.events.hits).toHaveLength(0);
    expect(world.components.position.has(doomed)).toBe(true);
  });

  it("stops the player at walls", () => {
    const { world, position } = setup();
    setWall(world.tiles, 11, 10);
    hold(world, Action.Right);

    for (let i = 0; i < 20; i++) runTick(world, DT);

    expect(position().x).toBeCloseTo(11 - R, 3);
  });
});
