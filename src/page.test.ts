import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import mainSource from "./main.ts?raw";
import observabilitySource from "./observability.ts?raw";

// The page's scripts look elements up by id and break on load if one is
// missing, which nothing else would catch outside a browser.
describe("index.html", () => {
  for (const [file, source] of [
    ["main.ts", mainSource],
    ["observability.ts", observabilitySource],
  ]) {
    it(`has every element ${file} looks up`, () => {
      const ids = [...source.matchAll(/getElementById\(\s*"([^"]+)"/g)].map(
        (match) => match[1],
      );
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(html, `#${id}`).toContain(`id="${id}"`);
      }
    });
  }
});
