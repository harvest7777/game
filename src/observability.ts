export function drawDebugStats(frameTimes: Array<Array<number>>) {
  const fps = frameTimes.length;
  const average =
    frameTimes.reduce(
      (accumulator, currentValue) => accumulator + currentValue[0],
      0,
    ) / frameTimes.length;
  const highestFrameTime = frameTimes.reduce(
    (accumulator, currentValue) => Math.max(accumulator, currentValue[0]),
    -Infinity,
  );

  const fpsText = document.getElementById("fps");
  const highestFrameTimeText = document.getElementById("maxFrameTime");
  const averageText = document.getElementById("avgFrameTime");

  if (!fpsText || !highestFrameTimeText || !averageText) {
    throw new Error("Could not calculate debug stats");
  }

  fpsText.textContent = fps.toFixed(0);
  highestFrameTimeText.textContent = highestFrameTime.toFixed(2);
  averageText.textContent = average.toFixed(2);
}

// Smoothed costs of the simulation, drawing and sound, shown beside the fps
// so slow spots show up while playing, in milliseconds: per tick, to build
// each frame's quads, to hand them to the GPU (`draw`), for the GPU to draw
// them (`gpu`, NaN where the browser can't time it), and to handle the
// frame's sounds; plus how many quads it drew.
export type PerfMeter = {
  tick: number;
  build: number;
  draw: number;
  gpu: number;
  sound: number;
  quads: number;
};

export function createPerfMeter(): PerfMeter {
  return { tick: 0, build: 0, draw: 0, gpu: NaN, sound: 0, quads: 0 };
}

// How much each new sample moves the average: small, so it reads steadily.
const SMOOTHING = 0.05;

export function sample(
  meter: PerfMeter,
  what: keyof PerfMeter,
  value: number,
): void {
  // The first sample of something not measured yet starts the average.
  if (Number.isNaN(meter[what])) meter[what] = value;
  else meter[what] += (value - meter[what]) * SMOOTHING;
}

export function drawPerfMeter(meter: PerfMeter): void {
  const show = (id: string, text: string) => {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
  };
  show("tickTime", meter.tick.toFixed(2));
  show("buildTime", meter.build.toFixed(2));
  show("drawTime", meter.draw.toFixed(2));
  show("gpuTime", Number.isNaN(meter.gpu) ? "n/a" : meter.gpu.toFixed(2));
  show("soundTime", meter.sound.toFixed(2));
  show("quadCount", Math.round(meter.quads).toString());
}

// Logs each distinct error once, so an error that happens every frame
// doesn't flood the console, then counts how often it's repeated.
export function createErrorLog(
  log: (message: string, error: unknown) => void = console.error,
): (error: unknown) => void {
  const seen = new Map<string, number>();
  return (error) => {
    const message = error instanceof Error ? error.message : String(error);
    const times = (seen.get(message) ?? 0) + 1;
    seen.set(message, times);
    if (times === 1)
      log("game error (logged once, the game keeps going):", error);
  };
}
