import { describe, expect, it } from "vitest";

// Every source file in the dungeon generator, keyed like "./graph.ts".
const sources = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("the dungeon generator", () => {
  it("finds its source files", () => {
    expect(sources["./generate.ts"]).toBeDefined();
  });

  it("only imports itself, so it knows nothing about the game", () => {
    for (const [file, source] of Object.entries(sources)) {
      for (const [, path] of source.matchAll(/ from "([^"]+)";/g)) {
        expect(path.startsWith("./"), `${file} imports ${path}`).toBe(true);
      }
    }
  });
});
