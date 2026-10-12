// @ts-nocheck
import { it } from "vitest";
import { addControllable, addMovable } from "./ecs/bundles";
import { enemies } from "./content/enemies";
import { spawnEnemy } from "./ecs/enemy/spawn";
import { addHoldings } from "./ecs/inventory/bundle";
import { items } from "./content/items";
import { runTick } from "./ecs/tick";
import { createTiles } from "./ecs/tiles";
import { createWorld, spawn } from "./ecs/world";

it("bench", { timeout: 300000 }, async () => {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const world = createWorld(createTiles(128, 128), random);
  const player = spawn(world);
  addMovable(world, player, { at: { x: 64, y: 64 }, hitbox: { r: 0.4 } });
  addControllable(world, player, { speed: 5 });
  world.components.team.set(player, "player");
  world.components.health.set(player, { hp: 500, max: 500 });
  world.components.invulnerable.set(player, true);
  addHoldings(world, player, { weapon: items.apprenticeStaff });
  const n = Number(process.env.N ?? 10000);
  const kinds = ["archer"] as const;
  for (let i = 0; i < n; i++) {
    const a = random() * Math.PI * 2,
      r = 2 + Math.sqrt(random()) * 50;
    spawnEnemy(world, enemies[kinds[0]], {
      x: 64 + Math.cos(a) * r,
      y: 64 + Math.sin(a) * r,
    });
  }
  for (let i = 0; i < 100; i++) runTick(world, 0.05);
  const t0 = performance.now();
  const ticks = 20;
  for (let i = 0; i < ticks; i++) runTick(world, 0.05);
  const ms = (performance.now() - t0) / ticks;
  const { tickSystems } = await import("./ecs/tick");
  const per: string[] = [];
  for (const system of tickSystems) {
    const s0 = performance.now();
    for (let i = 0; i < 10; i++) system(world, 0.05);
    per.push(`${system.name}=${((performance.now() - s0) / 10).toFixed(1)}`);
  }
  (await import("node:fs")).appendFileSync("/private/tmp/claude-501/-Users-ryantran-Developer-rotmg-no-slop/3fdb00da-ca15-4a48-a70a-baf2c721090c/scratchpad/bench.txt", per.join(" ") + "\n");
  (await import("node:fs")).appendFileSync(
    "/private/tmp/claude-501/-Users-ryantran-Developer-rotmg-no-slop/3fdb00da-ca15-4a48-a70a-baf2c721090c/scratchpad/bench.txt",
    `N=${n} ms/tick=${ms.toFixed(1)} projectiles=${world.components.projectile.size}\n`,
  );
});
