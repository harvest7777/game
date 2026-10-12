import { describe, expect, it } from "vitest";
import { soundFiles, sounds } from "./assets";

describe("sound assets", () => {
  it("lists each file once", () => {
    expect(new Set(soundFiles()).size).toBe(soundFiles().length);
  });

  it("has a wav file for every sound", () => {
    const onDisk = new Set(
      Object.keys(import.meta.glob("../../public/sounds/**/*.wav")).map(
        (path) => path.replace("../../public/sounds/", "").replace(".wav", ""),
      ),
    );
    expect(onDisk.size).toBeGreaterThan(0);
    for (const file of Object.values(sounds)) {
      expect(onDisk.has(file), file).toBe(true);
    }
  });
});
