import { it, expect } from "vitest";
import { chargeableDays, indiaDay } from "./time";
it("counts inclusive working days and excludes branch holidays", () => {
  expect(
    chargeableDays("2026-11-20", "2026-11-23", [1, 2, 3, 4, 5], ["2026-11-23"]),
  ).toEqual(["2026-11-20"]);
  expect(chargeableDays("2026-11-21", "2026-11-22", [0, 6], [])).toHaveLength(
    2,
  );
});
it("rejects impossible, reversed and cross-year ranges", () => {
  for (const [from, to] of [
    ["2026-02-30", "2026-03-01"],
    ["2026-11-23", "2026-11-22"],
    ["2026-12-31", "2027-01-01"],
  ] as const)
    expect(chargeableDays(from, to, [1, 2, 3, 4, 5], [])).toEqual([]);
});
it("uses Indian midnight for a daily punch", () => {
  expect(indiaDay(new Date("2026-11-18T18:30:00Z"))).toBe("2026-11-19");
});
