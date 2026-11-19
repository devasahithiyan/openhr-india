import { describe, expect, it } from "vitest";
import { earnings, employeePF, monthEnd } from "./payroll-calculation";
const salary = (effective: string, monthly = 3100000) => ({
  effective,
  components: [{ name: "Basic", pfWage: true, monthly }],
});
describe("calendar day pay in integer paise", () => {
  it("reconciles full month, joiner and approved loss of pay", () => {
    const calc = (joined: string, leave: string[]) =>
      earnings("2025-03", joined, leave, [salary("2024-04-01")]);
    expect(calc("2024-04-01", [])).toMatchObject({
      gross: 3100000,
      payableDays: 31,
      pf: 180000,
    });
    expect(calc("2025-03-16", [])).toMatchObject({
      gross: 1600000,
      payableDays: 16,
    });
    expect(calc("2025-03-01", ["2025-03-10", "2025-03-10"])).toMatchObject({
      gross: 3000000,
      payableDays: 30,
    });
  });
  it("splits an effective-dated raise and flags a salary gap even on unpaid days", () => {
    expect(
      earnings(
        "2025-03",
        "2025-03-01",
        [],
        [salary("2025-03-01"), salary("2025-03-16", 6200000)],
      ),
    ).toMatchObject({ gross: 4700000, missingSalary: false });
    expect(
      earnings("2025-03", "2025-03-01", ["2025-03-01"], [salary("2025-03-02")])
        .missingSalary,
    ).toBe(true);
    expect(monthEnd("2024-02")).toBe("2024-02-29");
  });
  it("excludes non-PF components, rounds prorated earnings to paise", () => {
    expect(
      earnings(
        "2025-03",
        "2025-03-31",
        [],
        [
          {
            effective: "2025-03-01",
            components: [{ name: "HRA", pfWage: false, monthly: 1000 }],
          },
        ],
      ),
    ).toMatchObject({ gross: 32, pfBasis: 0 });
  });
  it.each([
    [0, 0],
    [1249, 100],
    [1250, 200],
    [1499999, 180000],
    [1500000, 180000],
    [1505000, 180000],
  ])("caps and rounds employee PF for %i paise", (basis, expected) =>
    expect(employeePF(basis)).toBe(expected),
  );
});
