import "./style.css";
import { drawDebugStats } from "./observability";
import { playerKeybinds, Action } from "./models/controller";

const TEST_BUTTON = document.getElementById("test");

const TICKS_PER_SECOND = 10;
const TIME_PER_TICK_MS = (1 / TICKS_PER_SECOND) * 1000;

let accumulator: number = 0;
let lastRenderTime: number = performance.now();
let lastRequestAnimationFrameTime: number = performance.now();

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

  const deltaTime: number = currentTime - lastRequestAnimationFrameTime;
  frameTimesInTheLastSecond.push([deltaTime, currentTime]);

  drawDebugStats(frameTimesInTheLastSecond);
  const controls = new Set<Action>();
  while (accumulator >= TIME_PER_TICK_MS) {
    for (const input of inputs) {
      if (input in playerKeybinds) {
        controls.add(playerKeybinds[input]);
      }
    }

    lastRenderTime = currentTime;
    accumulator -= TIME_PER_TICK_MS;
  }

  accumulator = currentTime - lastRenderTime;
  lastRequestAnimationFrameTime = currentTime;
  requestAnimationFrame(callback);
}

function TEST_FUNCTION() {
  console.log(inputs);
}

TEST_BUTTON?.addEventListener("click", TEST_FUNCTION);

requestAnimationFrame(callback);
