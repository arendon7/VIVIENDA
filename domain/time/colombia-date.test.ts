import { describe, expect, it } from "vitest";
import { colombiaTodayIso } from "./colombia-date";

describe("colombiaTodayIso", () => {
  it("keeps the prior Colombia calendar date before midnight in Bogota", () => {
    expect(colombiaTodayIso(new Date("2026-01-01T04:30:00.000Z"))).toBe("2025-12-31");
  });

  it("opens the Colombia calendar date exactly at midnight in Bogota", () => {
    expect(colombiaTodayIso(new Date("2026-01-01T05:00:00.000Z"))).toBe("2026-01-01");
  });

  it("keeps February open until Colombia reaches March", () => {
    expect(colombiaTodayIso(new Date("2026-03-01T04:59:59.000Z"))).toBe("2026-02-28");
  });

  it("moves to March only when Colombia reaches March", () => {
    expect(colombiaTodayIso(new Date("2026-03-01T05:00:00.000Z"))).toBe("2026-03-01");
  });
});
