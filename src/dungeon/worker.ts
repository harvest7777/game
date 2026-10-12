import { generateDungeon } from "./generate";
import type { WorkerReply, WorkerRequest } from "./generator";

// The dungeon worker: generates each dungeon it's asked for and posts it
// back, or why it couldn't. See workerGenerator.
const scope = self as unknown as {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<WorkerRequest>) => void,
  ): void;
  postMessage(reply: WorkerReply): void;
};

scope.addEventListener("message", ({ data: { id, spec, seed } }) => {
  try {
    scope.postMessage({ id, dungeon: generateDungeon(spec, seed) });
  } catch (error) {
    scope.postMessage({ id, error: String(error) });
  }
});
