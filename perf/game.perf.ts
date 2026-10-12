import { afterAll, describe, it } from "vitest";
import { contentArt } from "../src/content/art";
import { characters } from "../src/content/characters";
import { dungeonRegistries, dungeons } from "../src/content/dungeons";
import { enemies } from "../src/content/enemies";
import { grounds } from "../src/content/grounds";
import { levels } from "../src/content/levels";
import { gameLoot } from "../src/content/loot";
import { generateDungeon, type StageTimings } from "../src/dungeon/generate";
import { seeded } from "../src/dungeon/rng";
import { createCamera } from "../src/ecs/camera/resource";
import { spawnCharacter } from "../src/ecs/character/spawn";
import { spawnCrowd } from "../src/ecs/enemy/spawn";
import { levelFromDungeon } from "../src/ecs/level/dungeon";
import { loadLevel } from "../src/ecs/level/load";
import { runTick, type SystemTimings } from "../src/ecs/tick";
import { createTiles } from "../src/ecs/tiles";
import { createWorld, type Entity, type World } from "../src/ecs/world";
import type { Art } from "../src/render/art";
import { createManifest, manifestFiles } from "../src/render/assets";
import { buildFrame } from "../src/render/frame";
import { QuadBuffer } from "../src/render/quads";
import { createView } from "../src/render/view";
import { measure, record, report } from "./measure";

// How the game performs: simulation ticks with crowds and in a real
// dungeon, building frames, and generating dungeons. Everything random is
// seeded, so runs are comparable.

const TICK = 0.05;
const CROWDS = [500, 2000, 5000];
// The crowd broken down system by system.
const PROFILED_CROWD = 2000;

// An invulnerable wizard in an open 200x200 field, with `count`
// imps around them, settled for a second.
function crowd(count: number): { world: World; player: Entity } {
  const field = createTiles(200, 200, [grounds.grass]);
  const world = createWorld(field, seeded(1), gameLoot);
  const player = spawnCharacter(world, characters.wizard, { x: 100, y: 100 });
  world.components.invulnerable.set(player, true);
  spawnCrowd(world, enemies.imp, { x: 100, y: 100 }, count);
  for (let i = 0; i < 20; i++) runTick(world, TICK);
  return { world, player };
}

// An invulnerable wizard in an open field among 5,000 Malphas, a second
// in: a few hundred of them can see the wizard, and their first casts have
// just filled the air with thousands of shots.
function firingCrowd(): { world: World; player: Entity } {
  const field = createTiles(120, 120, [grounds.abyssBrick]);
  const world = createWorld(field, seeded(1), gameLoot);
  const player = spawnCharacter(world, characters.wizard, { x: 60, y: 60 });
  world.components.invulnerable.set(player, true);
  spawnCrowd(world, enemies.malphas, { x: 60, y: 60 }, 5000);
  for (let i = 0; i < 20; i++) runTick(world, TICK);
  return { world, player };
}

// An Abyss from a fixed seed with the wizard at its start.
function abyss(): { world: World; player: Entity } {
  const def = dungeons.abyss!;
  const level = levelFromDungeon(
    def,
    generateDungeon(def, 7),
    dungeonRegistries,
  );
  const { world, spawn } = loadLevel(level, seeded(1), gameLoot);
  const player = spawnCharacter(world, characters.wizard, spawn);
  world.components.invulnerable.set(player, true);
  return { world, player };
}

// Every atlas file as a placeholder region, so frames can be built without
// a GPU.
function fakeArt(): Art {
  const manifest = createManifest(contentArt());
  const files = manifestFiles(manifest);
  return {
    manifest,
    regions: new Map(files.map((f, i) => [f, { x: i * 10, y: 0, w: 8, h: 8 }])),
    glyphs: new Map(files.map((f) => [f, { left: 0, width: 5 }])),
  };
}

describe("ticks", () => {
  for (const count of CROWDS) {
    it(`${count} imps`, () => {
      const { world } = crowd(count);
      const stats = measure(() => runTick(world, TICK), 60);
      record(
        `tick/${count} imps`,
        stats,
        `${world.components.projectile.size} shots`,
      );
    });
  }

  it(`${PROFILED_CROWD} imps, by system`, () => {
    const { world } = crowd(PROFILED_CROWD);
    const timings: SystemTimings = {};
    const ticks = 60;
    for (let i = 0; i < ticks; i++) runTick(world, TICK, timings);
    const slowest = Object.entries(timings)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
    for (const [system, ms] of slowest) {
      const mean = ms / ticks;
      record(`tick/${PROFILED_CROWD} imps/${system}`, {
        mean,
        p50: mean,
        p95: mean,
      });
    }
  });

  it("abyss, 500 imps hunting the player through its walls", () => {
    const { world, player } = abyss();
    const at = world.components.position.get(player)!;
    spawnCrowd(world, enemies.imp, at, 500);
    // Every imp already after the player, most of them out of sight.
    for (const [imp] of world.components.enemy) {
      world.components.target.set(imp, player);
    }
    record(
      "tick/abyss, 500 imps hunting",
      measure(() => runTick(world, TICK), 60),
    );
  });

  it("abyss, thousands of Malphas around the player", () => {
    const { world, player } = abyss();
    const at = world.components.position.get(player)!;
    spawnCrowd(world, enemies.malphas, at, 11_111);
    for (let i = 0; i < 40; i++) runTick(world, TICK);
    record(
      "tick/abyss, Malphas crowd",
      measure(() => runTick(world, TICK), 30),
      `${world.components.enemy.size} enemies`,
    );
  });

  it("Malphas crowd firing, over 8 seconds of bursts", () => {
    const { world } = firingCrowd();
    let peak = 0;
    const stats = measure(
      () => {
        runTick(world, TICK);
        peak = Math.max(peak, world.components.projectile.size);
      },
      160,
      0,
    );
    record("tick/Malphas crowd firing", stats, `peak ${peak} shots`);
  });

  it("Malphas crowd firing, by system", () => {
    const { world } = firingCrowd();
    const timings: SystemTimings = {};
    const ticks = 160;
    for (let i = 0; i < ticks; i++) runTick(world, TICK, timings);
    const slowest = Object.entries(timings)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
    for (const [system, ms] of slowest) {
      const mean = ms / ticks;
      record(`tick/Malphas crowd firing/${system}`, {
        mean,
        p50: mean,
        p95: mean,
      });
    }
  });

  it("abyss, at the start", () => {
    const { world } = abyss();
    record(
      "tick/abyss",
      measure(() => runTick(world, TICK), 60),
      `${world.components.enemy.size} enemies`,
    );
  });
});

describe("frames", () => {
  const art = fakeArt();
  const out = new QuadBuffer();
  const frame = (name: string, world: World, player: Entity) => {
    const at = world.components.position.get(player)!;
    const view = createView({ ...createCamera(), angle: 0.4 }, at, 1920, 1080);
    const stats = measure(() => buildFrame(out, world, view, art, 0.5, 1), 60);
    record(`frame/${name}`, stats, `${out.count} quads`);
  };

  it("nexus", () => {
    const { world, spawn } = loadLevel(levels.nexus, seeded(1), gameLoot);
    frame("nexus", world, spawnCharacter(world, characters.wizard, spawn));
  });

  it("abyss", () => {
    const { world, player } = abyss();
    frame("abyss", world, player);
  });

  it(`${PROFILED_CROWD} imps`, () => {
    const { world, player } = crowd(PROFILED_CROWD);
    frame(`${PROFILED_CROWD} imps`, world, player);
  });

  it("Malphas crowd firing, mid-burst", () => {
    const { world, player } = firingCrowd();
    frame("Malphas crowd firing", world, player);
  });

  it("abyss, Malphas crowd", () => {
    const { world, player } = abyss();
    spawnCrowd(
      world,
      enemies.malphas,
      world.components.position.get(player)!,
      11_111,
    );
    for (let i = 0; i < 40; i++) runTick(world, TICK);
    frame("abyss, Malphas crowd", world, player);
  });
});

describe("dungeons", () => {
  const SEEDS = Array.from({ length: 20 }, (_, i) => i);

  for (const id of ["abyss", "testCaves"] as const) {
    it(id, () => {
      const def = dungeons[id]!;
      let seed = 0;
      record(
        `dungeon/${id}`,
        measure(() => generateDungeon(def, SEEDS[seed++ % SEEDS.length]), 40),
      );
    });

    it(`${id}, by stage`, () => {
      const def = dungeons[id]!;
      const timings: StageTimings = {};
      for (const seed of SEEDS) generateDungeon(def, seed, undefined, timings);
      for (const [stage, ms] of Object.entries(timings)) {
        const mean = ms / SEEDS.length;
        record(`dungeon/${id}/${stage}`, { mean, p50: mean, p95: mean });
      }
    });
  }

  it("abyss, into a level and a world", () => {
    const def = dungeons.abyss!;
    const dungeon = generateDungeon(def, 7);
    record(
      "dungeon/abyss/level and world",
      measure(() =>
        loadLevel(levelFromDungeon(def, dungeon, dungeonRegistries)),
      ),
    );
  });
});

afterAll(() => report("game performance"));
