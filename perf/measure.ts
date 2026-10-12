import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Times things and compares them with the last saved baseline. Results go
// to perf/latest.json; with PERF_BASELINE=1 they become perf/baseline.json.
// Baselines are only comparable on the machine that made them.

export type Stats = { mean: number; p50: number; p95: number };

// A measurement, and a count to show beside it (quads drawn, enemies...).
type Result = Stats & { note?: string };

const results: Record<string, Result> = {};

// Runs `run` a few times to warm up, then `runs` times, returning
// milliseconds per run.
export function measure(run: () => void, runs = 30, warmup = 5): Stats {
  for (let i = 0; i < warmup; i++) run();
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    mean: times.reduce((sum, t) => sum + t, 0) / times.length,
    p50: times[Math.floor(times.length / 2)],
    p95: times[Math.min(times.length - 1, Math.floor(times.length * 0.95))],
  };
}

export function record(name: string, stats: Stats, note?: string): void {
  results[name] = { ...stats, ...(note && { note }) };
}

// Slower than the baseline by more than this share is flagged.
const REGRESSION = 0.1;

// Writes this run's results and prints them beside the baseline's.
export function report(suite: string): void {
  const dir = new URL(".", import.meta.url);
  const baselinePath = new URL("baseline.json", dir);
  const latestPath = new URL("latest.json", dir);
  const saving = process.env.PERF_BASELINE === "1";
  const read = (path: URL): Record<string, Result> =>
    existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  const baseline = read(baselinePath);
  const target = saving ? baselinePath : latestPath;
  writeFileSync(
    target,
    JSON.stringify({ ...read(target), ...results }, null, 2) + "\n",
  );

  const lines = Object.entries(results).map(([name, r]) => {
    const before = baseline[name];
    const change = before ? (r.mean - before.mean) / before.mean : undefined;
    const flag =
      change !== undefined && change > REGRESSION ? "  ⚠ slower" : "";
    return [
      name.padEnd(44),
      `${r.mean.toFixed(2)} ms`.padStart(11),
      `p95 ${r.p95.toFixed(2)}`.padStart(11),
      change === undefined
        ? "".padStart(9)
        : `${change >= 0 ? "+" : ""}${(change * 100).toFixed(0)}%`.padStart(9),
      r.note ? `  ${r.note}` : "",
      flag,
    ].join(" ");
  });
  process.stdout.write(
    `\n${suite}${saving ? " (saved as baseline)" : ""}\n${lines.join("\n")}\n`,
  );
}
