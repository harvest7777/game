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
