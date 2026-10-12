import { generateDungeon, type Dungeon, type DungeonSpec } from "./generate";

// Somewhere dungeons get generated, answering when one's ready, so callers
// don't care whether it happens right here or off the main thread. Rejects
// when the spec can't be built.
export type DungeonGenerator = (
  spec: DungeonSpec,
  seed: number,
) => Promise<Dungeon>;

// Generates on the calling thread. For tests, and anywhere without workers.
export const generateHere: DungeonGenerator = async (spec, seed) =>
  generateDungeon(spec, seed);

// A request to the dungeon worker, and its answer.
export type WorkerRequest = { id: number; spec: DungeonSpec; seed: number };
export type WorkerReply =
  { id: number; dungeon: Dungeon } | { id: number; error: string };

// Generates in a Web Worker, so building a big dungeon never stalls a
// frame. One worker serves every request, answered in turn.
export function workerGenerator(): DungeonGenerator {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
  const waiting = new Map<
    number,
    { resolve: (dungeon: Dungeon) => void; reject: (error: Error) => void }
  >();
  let nextId = 0;
  worker.addEventListener("message", (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    const request = waiting.get(reply.id);
    if (!request) return;
    waiting.delete(reply.id);
    if ("error" in reply) request.reject(new Error(reply.error));
    else request.resolve(reply.dungeon);
  });
  return (spec, seed) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      waiting.set(id, { resolve, reject });
      worker.postMessage({ id, spec, seed } satisfies WorkerRequest);
    });
}
