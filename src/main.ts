import "./style.css";
import { drawDebugStats } from "./observability";
import { Action, actionsFromKeys } from "./ecs/input/actions";
import type { Command } from "./ecs/input/commands";
import type { Vec2 } from "./ecs/shared/physics/math";
import { runTick } from "./ecs/tick";
import { loadLevel } from "./ecs/level/load";
import type { LevelDef } from "./ecs/level/definitions";
import { travel } from "./ecs/travel";
import { levels } from "./content/levels";
import { createManifest } from "./render/assets";
import { contentArt } from "./content/art";
import { characters } from "./content/characters";
import { spawnCharacter } from "./ecs/character/spawn";
import {
  drawHud,
  FLASH_SECONDS,
  layoutHud,
  uiScreen,
  updateHpBars,
} from "./hud/draw";
import { hudPointer, type PointerEvent } from "./hud/input";
import { pushQuestPointer } from "./hud/quest";
import { pushPortalPrompt } from "./hud/portalPrompt";
import { createHudState, restorePanels, uiPixel } from "./hud/state";
import { installDebugPanel } from "./debug/panel";
import { hudHotkey } from "./hud/hotkeys";
import { installSettings } from "./settings/panel";
import { buildFrame, frameView } from "./render/frame";
import { createRenderer } from "./render/gl";
import { buildAtlas } from "./render/loader";
import { QuadBuffer } from "./render/quads";
import { screenToWorld, type View } from "./render/view";
import { createSoundPlayer } from "./audio/player";
import type { SoundMessage } from "./ecs/outbox";
import { gameLoot } from "./content/loot";
import { destination } from "./content/destinations";
import { workerGenerator } from "./dungeon/generator";

const TICKS_PER_SECOND = 20;
const TIME_PER_TICK_MS = (1 / TICKS_PER_SECOND) * 1000;
const TICK_SECONDS = 1 / TICKS_PER_SECOND;

const canvas = document.getElementById("game") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
if (!gl) throw new Error("WebGL2 isn't available");

// The world being played and where characters arrive in it: replaced when
// travelling to another level.
let level: LevelDef = levels.nexus;
let { world, spawn } = loadLevel(level, Math.random, gameLoot);
// Who's being played: replaced on respawn. Once they die, the entity has no
// components left, so everything reading it finds nothing.
let player = spawnCharacter(world, characters.wizard, spawn);
world.camera.target = player;

const manifest = createManifest(contentArt());
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

// One-off requests (number keys, the HUD, debug buttons) waiting for the
// next tick.
const pendingCommands: Command[] = [];

// Swaps to a fresh world for `to`, bringing the character along with all
// its gear. A dead character has nothing to bring; respawning puts a new one
// at the new spawn.
function enterLevel(to: LevelDef) {
  const next = loadLevel(to, Math.random, gameLoot);
  if (world.components.character.has(player)) {
    player = travel(world, next.world, player, next.spawn);
  }
  level = to;
  world = next.world;
  spawn = next.spawn;
  // Requests aimed at the old world, like moving a bag's item, mean nothing
  // here.
  pendingCommands.length = 0;
}

const debug = installDebugPanel(
  () => world,
  pendingCommands,
  () => player,
);
debug.characterSpawned(player);

// Shown while there's no character: brings a fresh one back at the spawn.
const respawnButton = document.getElementById("respawn") as HTMLButtonElement;
respawnButton.addEventListener("click", () => {
  player = spawnCharacter(world, characters.wizard, spawn);
  world.camera.target = player;
  debug.characterSpawned(player);
  respawnButton.blur();
});

const settings = installSettings(() => inputs.clear());

const quads = new QuadBuffer();
// Where saved panel positions live. Bumped when the layout changes shape,
// so an old save doesn't place panels for a layout that's gone.
const HUD_PANELS_KEY = "hudPanels.v2";
const hudState = createHudState();
try {
  hudState.panels = restorePanels(
    JSON.parse(localStorage.getItem(HUD_PANELS_KEY) ?? "null"),
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
  if (
    !event.repeat &&
    hudHotkey(hudState, settings.hudKeybinds(), event.code)
  ) {
    event.preventDefault();
    return;
  }
  inputs.add(event.code);
  const command = settings.commandKeys()[event.code];
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
// Whether the left button is held down on the game rather than the HUD,
// which shoots.
let shooting = false;
canvas.addEventListener("mousemove", (event) => {
  cursor = { x: event.clientX, y: event.clientY };
  toHud(event, "move");
});
canvas.addEventListener("mousedown", (event) => {
  if (event.button === 0) shooting = !toHud(event, "down");
});
// On the window so letting go outside the game still ends a drag.
window.addEventListener("mouseup", (event) => {
  if (event.button !== 0) return;
  shooting = false;
  toHud(event, "up");
});
window.addEventListener("blur", () => {
  shooting = false;
});
canvas.addEventListener("mouseleave", () => {
  hudPointer(hudState, { kind: "leave" }, [], { w: 0, h: 0 });
});

// Passes a mouse event to the HUD in UI pixels, queues whatever it asks for,
// and saves the layout when a panel is dropped. Returns whether the HUD used
// the event.
function toHud(event: MouseEvent, kind: "move" | "down" | "up"): boolean {
  const dpr = window.devicePixelRatio;
  const pixel = uiPixel(dpr);
  const screen = uiScreen(
    Math.round(canvas.clientWidth * dpr),
    Math.round(canvas.clientHeight * dpr),
    pixel,
  );
  const time = event.timeStamp / 1000;
  const panels = layoutHud(world, player, hudState, screen, time);
  const x = (event.clientX * dpr) / pixel;
  const y = (event.clientY * dpr) / pixel;
  const pointer: PointerEvent = { kind, x, y, time };
  const droppingPanel = kind === "up" && hudState.press?.panel?.id;

  const { commands, used } = hudPointer(hudState, pointer, panels, screen);
  pendingCommands.push(...commands);
  if (used) event.preventDefault();
  if (droppingPanel) {
    try {
      localStorage.setItem(HUD_PANELS_KEY, JSON.stringify(hudState.panels));
    } catch {
      // Not saved, but the panel still moved.
    }
  }
  return used;
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
    world.input.held = actionsFromKeys(inputs, settings.keybinds());
    if (shooting) world.input.held.add(Action.Shoot);
    world.input.commands = pendingCommands.splice(0);
    world.input.aim = cursorInWorld();
    runTick(world, TICK_SECONDS);
    accumulator -= TIME_PER_TICK_MS;
  }
  takeOutbox(currentTime / 1000);
  updateHpBars(hudState, world, player, currentTime / 1000);
  respawnButton.hidden = world.components.character.has(player);

  render(currentTime / 1000);

  lastFrameTime = currentTime;
  requestAnimationFrame(callback);
}

// Dungeons are built off the main thread, so entering one never stalls a
// frame.
const generateDungeons = workerGenerator();
// Whether a trip is being prepared: the player stays put until it's ready,
// and further requests wait until it's done.
let travelling = false;

// Takes the player to wherever a portal's `to` leads, once it's built. If
// it can't be built, says why and leaves the player where they are.
function travelTo(to: string) {
  if (travelling) return;
  travelling = true;
  destination(to, generateDungeons)
    .then((found) => {
      if (!found) console.error(`no destination "${to}"`);
      // Already there, like heading home from the nexus: nothing to do.
      else if (found !== level) enterLevel(found);
    })
    .catch((error) => console.error(`couldn't travel to "${to}":`, error))
    .finally(() => {
      travelling = false;
    });
}

// Reacts to what the simulation reported this frame: an item landing in one
// of the player's slots makes that slot flash, sounds play, and the player
// goes through any portal they entered.
function takeOutbox(time: number) {
  const sounds: SoundMessage[] = [];
  for (const message of world.outbox.splice(0)) {
    if (message.kind === "itemMoved" && message.entity === player) {
      hudState.flashes.push({ ref: message.to, at: time });
    } else if (message.kind === "sound") {
      sounds.push(message);
    } else if (message.kind === "travel" && message.entity === player) {
      travelTo(message.to);
    }
  }
  hudState.flashes = hudState.flashes.filter(
    (flash) => time - flash.at < FLASH_SECONDS,
  );
  // Heard from wherever the camera is, so a dead player still hears.
  const { target } = world.camera;
  const at =
    target === undefined ? undefined : world.components.position.get(target);
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
    debug.renderDebug,
    (out) => {
      // Under the panels, so a panel in the same corner covers the pointer.
      pushQuestPointer(out, frameArt, world, player, view, alpha, uiPixel(dpr));
      pushPortalPrompt(
        out,
        frameArt,
        world,
        player,
        width,
        height,
        uiPixel(dpr),
      );
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
      );
    },
  );
  renderer.draw(quads, sections, width, height, time);
}

requestAnimationFrame(callback);
