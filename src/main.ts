import "./style.css";
import { drawDebugStats } from "./observability";
import { addControllable, addMovable } from "./ecs/bundles";
import { actionsFromKeys, playerKeybinds } from "./ecs/input/actions";
import { runTick } from "./ecs/tick";
import { createTiles } from "./ecs/tiles";
import { createWorld, spawn } from "./ecs/world";

const TEST_BUTTON = document.getElementById("test");

const TICKS_PER_SECOND = 20;
const TIME_PER_TICK_MS = (1 / TICKS_PER_SECOND) * 1000;
const TICK_SECONDS = 1 / TICKS_PER_SECOND;

const world = createWorld(createTiles(20, 20));
const player = spawn(world);
addMovable(world, player, { at: { x: 10, y: 10 }, r: 0.4 });
addControllable(world, player, { speed: 5 });

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
    runTick(world, TICK_SECONDS);
    logPlayer();
    accumulator -= TIME_PER_TICK_MS;
  }

  lastFrameTime = currentTime;
  requestAnimationFrame(callback);
}

// Smoke test until there's rendering: log the player whenever it moves or
// the camera turns.
let lastLogged = "";
function logPlayer() {
  const position = world.components.position.get(player)!;
  const degrees = (world.camera.angle * 180) / Math.PI;
  const line = `player (${position.x.toFixed(2)}, ${position.y.toFixed(2)}) camera ${degrees.toFixed(0)}°`;
  if (line !== lastLogged) console.log(line);
  lastLogged = line;
}

function TEST_FUNCTION() {
  console.log(inputs);
}

TEST_BUTTON?.addEventListener("click", TEST_FUNCTION);

requestAnimationFrame(callback);
