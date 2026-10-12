import { describe, expect, it } from "vitest";
import { createErrorLog } from "./observability";

describe("createErrorLog", () => {
  it("logs each distinct error once", () => {
    const logged: unknown[] = [];
    const report = createErrorLog((_message, error) => logged.push(error));
    const broken = new Error("no clip");

    report(broken);
    report(new Error("no clip"));
    report(new Error("out of map"));

    expect(logged).toEqual([broken, new Error("out of map")]);
  });
});
