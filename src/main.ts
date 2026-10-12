import "./style.css";
import { drawDebugStats } from "./observability";
import {
  addControllable,
  addMovable,
  addShooter,
  addSprite,
} from "./ecs/bundles";
import { actionsFromKeys, playerKeybinds } from "./ecs/input/actions";
import { weaponIds, type WeaponId } from "./ecs/projectile/weapons";
import type { Vec2 } from "./ecs/shared/physics/math";
import { enemyIds, type EnemyId } from "./ecs/enemy/definitions";
import { spawnEnemy } from "./ecs/enemy/spawn";
import { runTick } from "./ecs/tick";
import { createTiles, setWall } from "./ecs/tiles";
import { createWorld, spawn } from "./ecs/world";
import { manifest } from "./render/assets";
import { createRenderDebug } from "./render/debug";
import { buildFrame, frameView } from "./render/frame";
import { createRenderer } from "./render/gl";
import { buildAtlas } from "./render/loader";
import { QuadBuffer } from "./render/quads";
import { screenToWorld, type View } from "./render/view";

const TICKS_PER_SECOND = 20;
const TIME_PER_TICK_MS = (1 / TICKS_PER_SECOND) * 1000;
const TICK_SECONDS = 1 / TICKS_PER_SECOND;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
if (!gl) throw new Error("WebGL2 isn't available");

// A small walled test map with a few obstacles to walk around.
const tiles = createTiles(32, 32);
for (let i = 0; i < 32; i++) {
  setWall(tiles, i, 0);
  setWall(tiles, i, 31);
  setWall(tiles, 0, i);
  setWall(tiles, 31, i);
}
for (const [x, y] of [
  [12, 12],
  [13, 12],
  [14, 12],
  [12, 13],
  [12, 14],
  [20, 18],
  [21, 18],
  [20, 19],
  [8, 22],
]) {
  setWall(tiles, x, y);
}

const world = createWorld(tiles);
const player = spawn(world);
addMovable(world, player, { at: { x: 16, y: 16 }, hitbox: { r: 0.4 } });
addControllable(world, player, { speed: 5 });
addSprite(world, player, {
  name: "player",
  layer: "player",
  outline: { color: [0, 0, 0, 1] },
});
addShooter(world, player, { weapon: "bolt", team: "player" });
world.components.health.set(player, { hp: 500, max: 500 });
world.camera.target = player;

// Something to fight: dummies that just take hits, and enemies that shoot
// back once you're close.
for (const at of [
  { x: 20, y: 14 },
  { x: 22, y: 16 },
]) {
  spawnEnemy(world, "dummy", at);
}
spawnEnemy(world, "slime", { x: 7, y: 26 });
spawnEnemy(world, "archer", { x: 26, y: 26 });

const art = await buildAtlas(
  manifest,
  async (file) => {
    const response = await fetch(
      `${import.meta.env.BASE_URL}sprites/${file}.png`,
    );
    return createImageBitmap(await response.blob());
  },
  (width, height) => {
    const atlasCanvas = new OffscreenCanvas(width, height);
    const context = atlasCanvas.getContext("2d")!;
    return {
      canvas: atlasCanvas,
      drawImage: (image: ImageBitmap, x: number, y: number) =>
        context.drawImage(image, x, y),
    };
  },
);
const renderer = createRenderer(gl, art.canvas.canvas);

// Debug renders, toggled from the overlay.
const renderDebug = createRenderDebug();
const hitboxToggle = document.getElementById(
  "debugHitboxes",
) as HTMLInputElement;
hitboxToggle.addEventListener("change", () => {
  renderDebug.hitboxes = hitboxToggle.checked;
  // Don't keep focus, or movement keys like space would toggle it again.
  hitboxToggle.blur();
});

// Weapon picker, for trying each kind of projectile and pattern.
const weaponPicker = document.getElementById(
  "debugWeapon",
) as HTMLSelectElement;
for (const id of weaponIds) weaponPicker.add(new Option(id, id));
weaponPicker.value = world.components.shooter.get(player)!.weapon;
weaponPicker.addEventListener("change", () => {
  world.components.shooter.get(player)!.weapon = weaponPicker.value as WeaponId;
  weaponPicker.blur();
});

// Enemy spawner: puts the picked enemy a few tiles from the player, toward
// where it's aiming.
const enemyPicker = document.getElementById("debugEnemy") as HTMLSelectElement;
for (const id of enemyIds) enemyPicker.add(new Option(id, id));
document.getElementById("debugSpawn")!.addEventListener("click", (event) => {
  const at = world.components.position.get(player)!;
  const aim = world.components.shooter.get(player)!.aim ?? { x: 1, y: 0 };
  spawnEnemy(world, enemyPicker.value as EnemyId, {
    x: at.x + aim.x * 4,
    y: at.y + aim.y * 4,
  });
  (event.currentTarget as HTMLButtonElement).blur();
});

const quads = new QuadBuffer();

let accumulator: number = 0;
let lastFrameTime: number = performance.now();

const inputs = new Set<string>();

const frameTimesInTheLastSecond: Array<Array<number>> = [];

window.addEventListener("keydown", (event) => {
  inputs.add(event.code);
});

window.addEventListener("keyup", (event) => {
  inputs.delete(event.code);
});

// Where the cursor is, in CSS pixels, and the view it was last drawn with,
// so aiming uses exactly what's on screen.
let cursor: Vec2 | undefined;
let lastView: View | undefined;
canvas.addEventListener("mousemove", (event) => {
  cursor = { x: event.clientX, y: event.clientY };
});

function cursorInWorld(): Vec2 | undefined {
  if (!cursor || !lastView) return undefined;
  const dpr = window.devicePixelRatio;
  return screenToWorld(lastView, { x: cursor.x * dpr, y: cursor.y * dpr });
}

function callback() {
  const currentTime: number = performance.now();

  // We only care about the stats in the last second because
  // over-saving value would make it so averages barely move
  while (
    frameTimesInTheLastSecond.length > 0 &&
    currentTime - frameTimesInTheLastSecond[0][1] > 1000
  ) {
    frameTimesInTheLastSecond.shift();
  }

  const deltaTime: number = currentTime - lastFrameTime;
  frameTimesInTheLastSecond.push([deltaTime, currentTime]);

  drawDebugStats(frameTimesInTheLastSecond);

  // Carry leftover time between frames so ticks average out to exactly
  // TICKS_PER_SECOND regardless of frame timing.
  accumulator += deltaTime;
  while (accumulator >= TIME_PER_TICK_MS) {
    world.input.held = actionsFromKeys(inputs, playerKeybinds);
    world.input.aim = cursorInWorld();
    runTick(world, TICK_SECONDS);
    accumulator -= TIME_PER_TICK_MS;
  }

  render(currentTime / 1000);

  lastFrameTime = currentTime;
  requestAnimationFrame(callback);
}

// Draws between the last two ticks: alpha is how far into the next tick the
// leftover time reaches, so the screen runs up to one tick behind the game.
function render(time: number) {
  const dpr = window.devicePixelRatio;
  const width = Math.round(canvas.clientWidth * dpr);
  const height = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const alpha = accumulator / TIME_PER_TICK_MS;
  const view = frameView(world, alpha, width, height, dpr);
  lastView = view;
  const sections = buildFrame(
    quads,
    world,
    view,
    { manifest, regions: art.regions },
    alpha,
    time,
    renderDebug,
  );
  renderer.draw(quads, sections, width, height, time);
}

requestAnimationFrame(callback);
