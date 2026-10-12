import { describe, expect, it } from "vitest";

// Every non-test source file in the ECS, keyed like "./enemy/brain.ts".
const sources = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// A system module is any file that exports a system.
const isSystemModule = (source: string) =>
  /export function \w+System\(/.test(source);

// Where each value (not type-only) import of `file` points within the ECS,
// as a key into `sources`. Imports from outside it, like the dungeon
// generator, can't be systems.
function valueImports(file: string): string[] {
  const dir = file.slice(0, file.lastIndexOf("/"));
  const imports = sources[file].matchAll(
    /^import (?!type )[^;]*? from "(\.[^"]+)";/gms,
  );
  return [...imports]
    .map(([, path]) => resolve(dir, path))
    .filter((path) => path.startsWith("."))
    .map((path) => path + ".ts");
}

function resolve(dir: string, path: string): string {
  const parts = dir.split("/");
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part !== ".") parts.push(part);
  }
  return parts.join("/");
}

describe("the ECS", () => {
  it("finds its source files", () => {
    expect(sources["./tick.ts"]).toBeDefined();
    expect(isSystemModule(sources["./enemy/brain.ts"])).toBe(true);
  });

  it("only imports systems from tick.ts, so they share helpers instead", () => {
    for (const file of Object.keys(sources)) {
      if (file === "./tick.ts") continue;
      for (const imported of valueImports(file)) {
        const source = sources[imported];
        expect(source, `${file} imports ${imported}`).toBeDefined();
        expect(isSystemModule(source), `${file} imports ${imported}`).toBe(
          false,
        );
      }
    }
  });
});
