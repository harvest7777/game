import { defineConfig } from "vitest/config";

// Performance suites only, one file at a time so they don't slow each
// other down. `npm run perf` runs them; `npm test` never does.
export default defineConfig({
  test: {
    include: ["perf/**/*.perf.ts"],
    fileParallelism: false,
    testTimeout: 300_000,
  },
});
