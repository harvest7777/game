import "./style.css";
import { drawDebugStats } from "./observability";
import { addControllable, addMovable, addSprite } from "./ecs/bundles";
import {
  actionsFromKeys,
  keybindPresets,
  type KeybindPreset,
} from "./ecs/input/actions";
import { commandHotkeys, type Command } from "./ecs/input/commands";
import { addHoldings } from "./ecs/inventory/bundle";
import { itemIds, items, type ItemId } from "./ecs/inventory/items";
import type { Vec2 } from "./ecs/shared/physics/math";
import { enemyIds, type EnemyId } from "./ecs/enemy/definitions";
import { spawnCrowd, spawnEnemy } from "./ecs/enemy/spawn";
import { runTick } from "./ecs/tick";
import { createTiles, setWall } from "./ecs/tiles";
import { createWorld, spawn } from "./ecs/world";
import { manifest } from "./render/assets";
import { drawHud, FLASH_SECONDS, layoutHud, uiScreen } from "./hud/draw";
import { hudPointer, type PointerEvent } from "./hud/input";
import { createHudState, restorePanels, uiPixel } from "./hud/state";
import { createRenderDebug } from "./render/debug";
import { buildFrame, frameView } from "./render/frame";
import { createRenderer } from "./render/gl";
import { buildAtlas } from "./render/loader";
import { QuadBuffer } from "./render/quads";
import { screenToWorld, type View } from "./render/view";
import { createSoundPlayer } from "./audio/player";
import type { SoundMessage } from "./ecs/outbox";

const TICKS_PER_SECOND = 20;
const TIME_PER_TICK_MS = (1 / TICKS_PER_SECOND) * 1000;
const TICK_SECONDS = 1 / TICKS_PER_SECOND;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
if (!gl) throw new Error("WebGL2 isn't available");

// A walled test map, big enough to stress test crowds in, with a few
// obstacles to walk around near the middle where the player starts.
const MAP_SIZE = 128;
// Where the original 32x32 test area sits, in the middle of the map.
const MIDDLE = 48;
const tiles = createTiles(MAP_SIZE, MAP_SIZE);
for (let i = 0; i < MAP_SIZE; i++) {
  setWall(tiles, i, 0);
  setWall(tiles, i, MAP_SIZE - 1);
  setWall(tiles, 0, i);
  setWall(tiles, MAP_SIZE - 1, i);
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
  setWall(tiles, MIDDLE + x, MIDDLE + y);
}

const world = createWorld(tiles);
const player = spawn(world);
addMovable(world, player, {
  at: { x: MIDDLE + 16, y: MIDDLE + 16 },
  hitbox: { r: 0.4 },
});
addControllable(world, player, { speed: 5 });
addSprite(world, player, {
  name: "player",
  layer: "player",
  outline: { color: [0, 0, 0, 1] },
});
world.components.team.set(player, "player");
addHoldings(world, player, {
  weapon: "apprenticeStaff",
  carrying: [
    "hasteStaff",
    "serpentStaff",
    "cometStaff",
    "mireStaff",
    "spiralStaff",
    "boomerang",
    "lance",
    "prejudiceStaff",
  ],
});
world.components.health.set(player, { hp: 500, max: 500 });
world.components.invulnerable.set(player, true);
world.camera.target = player;

// Something to fight: dummies that just take hits, and enemies that shoot
// back once you're close.
for (const [id, x, y] of [
  ["dummy", 20, 14],
  ["dummy", 22, 16],
  ["slime", 7, 26],
  ["archer", 26, 26],
  ["boar", 26, 6],
] as const) {
  spawnEnemy(world, id, { x: MIDDLE + x, y: MIDDLE + y });
}

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
      pixels: (x: number, y: number, width: number, height: number) =>
        context.getImageData(x, y, width, height).data,
    };
  },
);
const renderer = createRenderer(gl, art.canvas.canvas, {
  data: art.distances,
  width: art.width,
  height: art.height,
});
const audioContext = new AudioContext();
const soundPlayer = await createSoundPlayer(
  audioContext,
  import.meta.env.BASE_URL,
);

function unlockAudio() {
  void soundPlayer.resume();
}

window.addEventListener("keydown", unlockAudio);
window.addEventListener("pointerdown", unlockAudio);

// Debug renders, toggled from the overlay.
const renderDebug = createRenderDebug();
const hitboxToggle = document.getElementById(
  "debugHitboxes",
) as HTMLInputElement;
const fontToggle = document.getElementById("debugFont") as HTMLInputElement;
fontToggle.addEventListener("change", () => {
  renderDebug.font = fontToggle.checked;
  fontToggle.blur();
});
hitboxToggle.addEventListener("change", () => {
  renderDebug.hitboxes = hitboxToggle.checked;
  // Don't keep focus, or movement keys like space would toggle it again.
  hitboxToggle.blur();
});

// One-off requests (number keys, debug buttons) waiting for the next tick.
const pendingCommands: Command[] = [];

// Debug item giver: puts the picked item in the first empty slot.
const itemPicker = document.getElementById("debugItem") as HTMLSelectElement;
for (const id of itemIds) itemPicker.add(new Option(items[id].name, id));
document.getElementById("debugGive")!.addEventListener("click", (event) => {
  pendingCommands.push({ kind: "give", item: itemPicker.value as ItemId });
  (event.currentTarget as HTMLButtonElement).blur();
});

// Enemy spawner: puts the picked enemy a few tiles from the player, toward
// where it's aiming, or a crowd of them around there.
const enemyPicker = document.getElementById("debugEnemy") as HTMLSelectElement;
const enemyCount = document.getElementById("debugCount") as HTMLInputElement;
for (const id of enemyIds) enemyPicker.add(new Option(id, id));
document.getElementById("debugSpawn")!.addEventListener("click", (event) => {
  const at = world.components.position.get(player)!;
  const aim = world.components.shooter.get(player)?.aim ??
    world.components.facing.get(player) ?? { x: 1, y: 0 };
  const center = { x: at.x + aim.x * 4, y: at.y + aim.y * 4 };
  const id = enemyPicker.value as EnemyId;
  const count = Math.max(1, Math.floor(Number(enemyCount.value) || 1));
  if (count === 1) spawnEnemy(world, id, center);
  else spawnCrowd(world, id, center, count);
  (event.currentTarget as HTMLButtonElement).blur();
});

// Invulnerability, on to start with so stress tests can't kill you.
const invulnerableToggle = document.getElementById(
  "debugInvulnerable",
) as HTMLInputElement;
invulnerableToggle.addEventListener("change", () => {
  if (invulnerableToggle.checked) {
    world.components.invulnerable.set(player, true);
  } else {
    world.components.invulnerable.delete(player);
  }
  invulnerableToggle.blur();
});

// Controls picker, remembered between visits.
const controlsPicker = document.getElementById(
  "settingsControls",
) as HTMLSelectElement;
let keybinds = keybindPresets.default;
try {
  const saved = localStorage.getItem("controls");
  if (saved && saved in keybindPresets) {
    controlsPicker.value = saved;
    keybinds = keybindPresets[saved as KeybindPreset];
  }
} catch {
  // Storage can be unavailable (private windows); the default still works.
}
controlsPicker.addEventListener("change", () => {
  const preset = controlsPicker.value as KeybindPreset;
  keybinds = keybindPresets[preset];
  inputs.clear();
  try {
    localStorage.setItem("controls", preset);
  } catch {
    // Not remembered, but still switched.
  }
  controlsPicker.blur();
});

const quads = new QuadBuffer();
const hudState = createHudState();
try {
  hudState.panels = restorePanels(
    JSON.parse(localStorage.getItem("hudPanels") ?? "null"),
  );
} catch {
  // Unreadable or unavailable storage: keep the default layout.
}

let accumulator: number = 0;
let lastFrameTime: number = performance.now();

const inputs = new Set<string>();

const frameTimesInTheLastSecond: Array<Array<number>> = [];

window.addEventListener("keydown", (event) => {
  // Typing into a debug field isn't playing.
  if (
    event.target instanceof HTMLInputElement &&
    event.target.type !== "checkbox"
  ) {
    return;
  }
  inputs.add(event.code);
  const command = commandHotkeys[event.code];
  if (command && !event.repeat) {
    pendingCommands.push(command);
    event.preventDefault();
  }
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
  toHud(event, "move");
});
canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0) toHud(event, "down");
});
// On the window so letting go outside the game still ends a drag.
window.addEventListener("mouseup", (event) => {
  if (event.button === 0) toHud(event, "up");
});
canvas.addEventListener("mouseleave", () => {
  hudPointer(hudState, { kind: "leave" }, [], { w: 0, h: 0 });
});

// Passes a mouse event to the HUD in UI pixels, queues whatever it asks for,
// and saves the layout when a panel is dropped.
function toHud(event: MouseEvent, kind: "move" | "down" | "up") {
  const dpr = window.devicePixelRatio;
  const pixel = uiPixel(dpr);
  const screen = uiScreen(
    Math.round(canvas.clientWidth * dpr),
    Math.round(canvas.clientHeight * dpr),
    pixel,
  );
  const panels = layoutHud(world, player, hudState, screen);
  const x = (event.clientX * dpr) / pixel;
  const y = (event.clientY * dpr) / pixel;
  const time = event.timeStamp / 1000;
  const pointer: PointerEvent = { kind, x, y, time };
  const droppingPanel = kind === "up" && hudState.press?.panel?.id;

  const { commands, used } = hudPointer(hudState, pointer, panels, screen);
  pendingCommands.push(...commands);
  if (used) event.preventDefault();
  if (droppingPanel) {
    try {
      localStorage.setItem("hudPanels", JSON.stringify(hudState.panels));
    } catch {
      // Not saved, but the panel still moved.
    }
  }
}

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
    world.input.held = actionsFromKeys(inputs, keybinds);
    world.input.commands = pendingCommands.splice(0);
    world.input.aim = cursorInWorld();
    runTick(world, TICK_SECONDS);
    accumulator -= TIME_PER_TICK_MS;
  }
  takeOutbox(currentTime / 1000);

  render(currentTime / 1000);

  lastFrameTime = currentTime;
  requestAnimationFrame(callback);
}

// Reacts to what the simulation reported this frame: an item landing in one
// of the player's slots makes that slot flash.
function takeOutbox(time: number) {
  const sounds: SoundMessage[] = [];
  for (const message of world.outbox.splice(0)) {
    if (message.kind === "itemMoved" && message.entity === player) {
      hudState.flashes.push({ ref: message.to, at: time });
    } else if (message.kind === "sound") {
      sounds.push(message);
    }
  }
  hudState.flashes = hudState.flashes.filter(
    (flash) => time - flash.at < FLASH_SECONDS,
  );
  const at = world.components.position.get(player);
  if (at) soundPlayer.play(sounds, { at, angle: world.camera.angle });
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
  const frameArt = { manifest, regions: art.regions, glyphs: art.glyphs };
  const sections = buildFrame(
    quads,
    world,
    view,
    frameArt,
    alpha,
    time,
    renderDebug,
    (out) =>
      drawHud(
        out,
        frameArt,
        world,
        player,
        hudState,
        width,
        height,
        uiPixel(dpr),
        time,
      ),
  );
  renderer.draw(quads, sections, width, height, time);
}

requestAnimationFrame(callback);
