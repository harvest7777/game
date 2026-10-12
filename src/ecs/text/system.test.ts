import { describe, expect, it } from "vitest";
import { createTiles } from "../tiles";
import { createWorld, spawn } from "../world";
import {
  DAMAGE_COLOR,
  DAMAGE_TEXT,
  damageTextSystem,
  floatingTextSystem,
  HEAL_COLOR,
  MAX_STACK,
  STACK_GAP,
} from "./system";

function setup() {
  const world = createWorld(createTiles(20, 20));
  const target = spawn(world);
  world.components.position.set(target, { x: 5, y: 6 });
  const texts = () =>
    [...world.components.floatingText].map(([e, t]) => ({
      ...t,
      at: world.components.position.get(e)!,
    }));
  return { world, target, texts };
}

describe("damageTextSystem", () => {
  it("puts a red number where the target is for each bit of damage", () => {
    const { world, target, texts } = setup();
    world.events.damaged.push({ target, amount: 27 });

    damageTextSystem(world, 0.05);

    expect(texts()).toEqual([
      {
        text: "27",
        color: DAMAGE_COLOR,
        age: 0,
        previousAge: 0,
        lifetime: DAMAGE_TEXT.lifetime,
        rise: DAMAGE_TEXT.rise,
        lift: 0,
        follows: target,
        at: { x: 5, y: 6 },
      },
    ]);
  });

  it("stacks several numbers on one target in the same tick", () => {
    const { world, target, texts } = setup();
    world.events.damaged.push(
      { target, amount: 10 },
      { target, amount: 20 },
      { target, amount: 30 },
    );

    damageTextSystem(world, 0.05);

    expect(texts().map((t) => t.lift)).toEqual([0, STACK_GAP, 2 * STACK_GAP]);
  });

  it("starts out moving with the target between ticks", () => {
    const { world, target } = setup();
    world.components.previousPosition.set(target, { x: 4, y: 6 });
    world.events.damaged.push({ target, amount: 5 });

    damageTextSystem(world, 0.05);

    const [[text]] = [...world.components.floatingText];
    expect(world.components.previousPosition.get(text)).toEqual({ x: 4, y: 6 });
  });

  it("skips targets with no position", () => {
    const { world, texts } = setup();
    world.events.damaged.push({ target: spawn(world), amount: 5 });
    damageTextSystem(world, 0.05);
    expect(texts()).toHaveLength(0);
  });
});

describe("floatingTextSystem", () => {
  it("ages text, remembering last tick's age", () => {
    const { world, target, texts } = setup();
    world.events.damaged.push({ target, amount: 5 });
    damageTextSystem(world, 0.05);

    floatingTextSystem(world, 0.05);
    floatingTextSystem(world, 0.05);

    expect(texts()[0].age).toBeCloseTo(0.1);
    expect(texts()[0].previousAge).toBeCloseTo(0.05);
  });

  it("follows the target as it moves", () => {
    const { world, target, texts } = setup();
    world.events.damaged.push({ target, amount: 5 });
    damageTextSystem(world, 0.05);

    world.components.previousPosition.set(target, { x: 5, y: 6 });
    world.components.position.set(target, { x: 9, y: 9 });
    floatingTextSystem(world, 0.05);

    const [[text]] = [...world.components.floatingText];
    expect(texts()[0].at).toEqual({ x: 9, y: 9 });
    expect(world.components.previousPosition.get(text)).toEqual({ x: 5, y: 6 });
  });

  it("stays where it last was once the target is gone", () => {
    const { world, target, texts } = setup();
    world.events.damaged.push({ target, amount: 5 });
    damageTextSystem(world, 0.05);
    const [[text]] = [...world.components.floatingText];
    world.components.previousPosition.set(text, { x: 4, y: 6 });

    world.components.position.delete(target);
    floatingTextSystem(world, 0.05);

    expect(texts()[0].at).toEqual({ x: 5, y: 6 });
    expect(world.components.previousPosition.get(text)).toEqual({ x: 5, y: 6 });
    expect(world.components.floatingText.get(text)!.follows).toBeUndefined();
  });

  it("queues text for removal once its lifetime is up", () => {
    const { world, target } = setup();
    world.events.damaged.push({ target, amount: 5 });
    damageTextSystem(world, 0.05);

    floatingTextSystem(world, DAMAGE_TEXT.lifetime - 0.01);
    expect(world.events.despawns).toHaveLength(0);
    floatingTextSystem(world, 0.02);
    expect(world.events.despawns).toHaveLength(1);
  });
});

describe("damageTextSystem healing", () => {
  it("floats a green number over whatever was healed", () => {
    const world = createWorld(createTiles(5, 5));
    const target = spawn(world);
    world.components.position.set(target, { x: 2, y: 2 });
    world.events.healed.push({ target, amount: 100 });

    damageTextSystem(world, 0.05);

    const [[, text]] = [...world.components.floatingText];
    expect(text.text).toBe("100");
    expect(text.color).toEqual(HEAL_COLOR);
  });
});

describe("damageTextSystem stacking cap", () => {
  it("gives every hit its own number but never stacks them past MAX_STACK", () => {
    const world = createWorld(createTiles(5, 5));
    const target = spawn(world);
    world.components.position.set(target, { x: 2, y: 2 });
    const hits = 100;
    for (let i = 0; i < hits; i++) {
      world.events.damaged.push({ target, amount: 5 });
    }

    damageTextSystem(world, 0.05);

    const texts = [...world.components.floatingText].map(([, text]) => text);
    expect(texts).toHaveLength(hits);
    const highest = Math.max(...texts.map((t) => t.lift));
    expect(highest).toBeCloseTo((MAX_STACK - 1) * STACK_GAP);
  });
});

describe("damageTextSystem and invulnerability", () => {
  it("floats no numbers over something invulnerable", () => {
    const world = createWorld(createTiles(5, 5));
    const target = spawn(world);
    world.components.position.set(target, { x: 2, y: 2 });
    world.components.invulnerable.set(target, true);
    world.events.damaged.push({ target, amount: 30 });

    damageTextSystem(world, 0.05);

    expect(world.components.floatingText.size).toBe(0);
  });
});
