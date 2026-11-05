import { describe, expect, it } from "vitest";
import { costaRicaInputValue, parseCostaRicaInput } from "@/lib/format";

describe("Costa Rica datetime input", () => {
  it("reads a local date as UTC-6", () => {
    expect(parseCostaRicaInput("2026-11-03T18:30")?.toISOString()).toBe("2026-11-04T00:30:00.000Z");
  });

  it("rejects a partial value", () => {
    expect(parseCostaRicaInput("2026-11-03")).toBeNull();
    expect(parseCostaRicaInput("")).toBeNull();
  });

  it("round-trips the current minute", () => {
    const value = costaRicaInputValue(new Date("2026-11-05T04:47:00.000Z"));
    expect(value).toBe("2026-11-04T22:47");
    expect(parseCostaRicaInput(value)?.toISOString()).toBe("2026-11-05T04:47:00.000Z");
  });
});
