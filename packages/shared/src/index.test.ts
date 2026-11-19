import { describe, it, expect } from "vitest";
import {
  panSchema,
  ifscSchema,
  employeeSchema,
  employeePatchSchema,
  canManageEmployees,
  canReadEmployee,
  indianStates,
  roles,
} from "./index";
const base = {
  code: "DEMO_1",
  name: "Demo Person",
  dateOfJoining: "2026-11-19",
  branchId: "11111111-1111-4111-8111-111111111111",
  departmentId: "22222222-2222-4222-8222-222222222222",
  designationId: "33333333-3333-4333-8333-333333333333",
};
describe("Indian identifiers and employee input", () => {
  it("normalises PAN and IFSC, and accepts only structural formats", () => {
    expect(panSchema.parse(" testp0000a ")).toBe("TESTP0000A");
    expect(ifscSchema.parse("test0000000")).toBe("TEST0000000");
    expect(panSchema.safeParse("12345ABCDE").success).toBe(false);
    expect(ifscSchema.safeParse("TEST1000000").success).toBe(false);
  });
  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "19/11/2026"])(
    "rejects invalid joining date %s",
    (date) => {
      expect(
        employeeSchema.safeParse({ ...base, dateOfJoining: date }).success,
      ).toBe(false);
    },
  );
  it("accepts leap dates and all 36 states and UTs", () => {
    expect(
      employeeSchema.safeParse({ ...base, dateOfJoining: "2024-02-29" })
        .success,
    ).toBe(true);
    expect(new Set(indianStates).size).toBe(36);
  });
  it.each([
    ["pan", "bad"],
    ["aadhaarLast4", "123456789012"],
    ["uan", "123"],
    ["esic", "123"],
    ["bankAccount", "123"],
    ["ifsc", "bad"],
    ["managerId", "other-company-id"],
  ])("rejects malformed %s", (key, value) => {
    expect(employeeSchema.safeParse({ ...base, [key]: value }).success).toBe(
      false,
    );
  });
  it("rejects unexpected tenant identifiers and empty patches", () => {
    expect(
      employeeSchema.safeParse({ ...base, companyId: base.branchId }).success,
    ).toBe(false);
    expect(employeePatchSchema.safeParse({}).success).toBe(false);
  });
  it("distinguishes omitted private values from explicit clearing", () => {
    expect(employeePatchSchema.parse({ pan: null })).toEqual({ pan: null });
    expect(employeePatchSchema.parse({ name: "New Name" })).not.toHaveProperty(
      "pan",
    );
  });
});
describe("role permissions", () => {
  it.each(roles)("%s permissions fail closed", (role) => {
    expect(canManageEmployees(role)).toBe(role === "Admin" || role === "HR");
    expect(canReadEmployee(role, "self", { id: "self", managerId: null })).toBe(
      true,
    );
    expect(
      canReadEmployee(role, "self", { id: "other", managerId: null }),
    ).toBe(role === "Admin" || role === "HR");
    expect(
      canReadEmployee(role, "self", { id: "report", managerId: "self" }),
    ).toBe(role !== "Employee");
  });
  it("does not match unlinked accounts to unassigned employees", () => {
    expect(
      canReadEmployee("Manager", null, { id: "other", managerId: null }),
    ).toBe(false);
  });
});
