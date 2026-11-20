import { describe, it, expect } from "vitest";
import {
  transition,
  projectWork,
  shiftRange,
  exitTasks,
  ledger,
  handoverAsset,
  type WorkActor,
  type WorkData,
  type WorkValues,
} from "./workforce";
const hr: WorkActor = { role: "HR", employeeId: null, membershipId: "hr" };
const me: WorkActor = { role: "Employee", employeeId: "a", membershipId: "ma" };
const lead: WorkActor = {
  role: "Manager",
  employeeId: "m",
  membershipId: "mm",
};
const peer = { ...me, employeeId: "b", membershipId: "mb" };
function setup() {
  const today = "2026-03-31",
    options = [{ id: "x", name: "Example" }];
  const d: WorkData = {
    today,
    company: "Example",
    people: ["a", "b", "m"].map((id) => ({
      id,
      code: id,
      name: id,
      joined: "2025-02-01",
      ended: null,
      manager: id === "m" ? "" : "m",
      branch: "x",
      department: "x",
      designation: "x",
    })),
    branches: options,
    departments: options,
    designations: options,
    templates: options,
    hr: [{ id: "hr", name: "HR" }],
    records: [],
    issued: [],
    absences: [],
    punches: [],
    claims: [],
    policies: [
      { id: "old", name: "Leave", year: 2025, opening: 4 },
      { id: "new", name: "Leave", year: 2026, opening: 1 },
    ],
  };
  function run(
    id: string,
    action: string,
    values: WorkValues = {},
    actor = hr,
  ) {
    const result = transition(
      d,
      actor,
      {
        id,
        action,
        values,
        revision: d.records.find((r) => r.id === id)?.revision ?? 0,
      },
      today,
    );
    for (const row of [result.row, result.other])
      if (row) d.records = [...d.records.filter((r) => r.id !== row.id), row];
    return result.row;
  }
  return { d, run };
}
describe("Workforce lifecycle", () => {
  it("preserves completed deadlines, versions letters, protects feedback and gates closure", () => {
    const { d, run } = setup();
    run("t", "checklist", { name: "Standard" });
    run("t", "checklistTask", {
      name: "Return badge",
      role: "Employee",
      offset: "1",
    });
    run(
      "x",
      "resign",
      { person: "a", proposed: d.today, notice: "10", note: "Personal" },
      me,
    );
    run("f", "feedback", { note: "Confidential" }, me);
    expect(projectWork(d, lead).records.some((r) => r.id === "f")).toBe(false);
    run("x", "confirmExit", { last: d.today, note: "Agreed" });
    const r = run("x", "applyChecklist", { checklist: "t" });
    const task = exitTasks(r)[0]!;
    run("x", "finishTask", { task: task.id }, me);
    expect(
      exitTasks(
        run("x", "confirmExit", { last: "2026-03-29", note: "Updated" }),
      )[0]?.due,
    ).toBe("2026-03-30");
    const h = run("x", "handover", { name: "Quarter close", owner: "b" }, me);
    expect(() => run("x", "closeExit", { note: "Done" })).toThrow(
      /outstanding/,
    );
    run("x", "acknowledge", { handover: String(h.history.length - 1) }, peer);
    run("x", "letter", { document: "Relieving letter" });
    expect(
      run("x", "letter", { document: "Relieving letter" }).history.at(-1)
        ?.values.version,
    ).toBe("2");
    expect(run("x", "closeExit", { note: "Done" }).status).toBe("Closed");
  });
  it("requires recipient consent and approval for overnight roster swaps", () => {
    const { d, run } = setup();
    const a = run("s1", "roster", {
      person: "a",
      day: "2026-04-01",
      start: "22:00",
      end: "06:00",
    });
    const range = shiftRange(a.values);
    expect(range.end - range.start).toBe(8 * 3600000);
    run("s2", "roster", {
      person: "b",
      day: "2026-04-03",
      start: "09:00",
      end: "17:00",
    });
    run("s1", "swap", { other: "s2" }, me);
    expect(() => run("s1", "consent", {}, me)).toThrow();
    run("s1", "consent", {}, peer);
    run("s1", "decideSwap", {}, lead);
    expect(d.records.find((r) => r.id === "s2")?.employeeId).toBe("a");
  });
  it("caps carry, reserves pending leave and expires unused carry", () => {
    const { d, run } = setup();
    run("r", "accrual", {
      person: "a",
      policy: "new",
      cap: "3",
      monthly: "1",
      expiry: "2026-03-30",
    });
    d.absences.push({
      employeeId: "a",
      policy: "new",
      status: "Pending",
      days: ["2026-03-28"],
    });
    expect(ledger(d, "a", "new").reduce((sum, r) => sum + r.days, 0)).toBe(4);
  });
  it("protects unreleased reviews and private cases", () => {
    const { d, run } = setup();
    run("r", "review", {
      person: "a",
      cycle: "Q1",
      goals: "Quarter close",
      due: d.today,
      release: d.today,
    });
    run("r", "selfReview", { note: "Completed" }, me);
    run("r", "managerReview", { note: "Private draft" }, lead);
    expect(JSON.stringify(projectWork(d, me))).not.toContain("Private draft");
    run("r", "release");
    expect(JSON.stringify(projectWork(d, me))).toContain("Private draft");
    run(
      "q",
      "ticket",
      {
        name: "Example",
        category: "Sensitive",
        handler: "hr",
        note: "Private case",
      },
      me,
    );
    expect(
      projectWork(d, { ...hr, membershipId: "other" }).records.some(
        (r) => r.id === "q",
      ),
    ).toBe(false);
    run("q", "reply", { note: "Received" });
    run("q", "resolveTicket", { note: "Done" });
  });
  it("supports hiring, promotions, probation, certification and inventory repair", () => {
    const { d, run } = setup();
    run("p", "position", {
      branch: "x",
      department: "x",
      designation: "x",
      seats: "4",
    });
    run("p", "vacancy", { note: "Hiring" });
    run("c", "candidate", {
      name: "Demo Candidate",
      position: "p",
      email: "hire@example.test",
    });
    run("c", "interview", { day: d.today, note: "Complete" });
    run("c", "offer", { day: d.today, note: "Issued" });
    expect(
      run("c", "hire", { code: "DEMO4", joined: d.today, template: "x" })
        .status,
    ).toBe("Hired");
    run("p2", "probation", { person: "a", due: d.today });
    run("p2", "recommendation", { note: "Complete" }, lead);
    run("p2", "confirm", { day: d.today, note: "Confirmed" });
    expect(
      run("up", "transfer", {
        person: "a",
        day: "2026-04-01",
        branch: "x",
        department: "x",
        designation: "x",
        manager: "m",
      }).history[0]?.values.previousManager,
    ).toBe("m");
    run("req", "requirement", { designation: "x", skill: "First aid" });
    run("tr", "train", { person: "a", skill: "First aid", due: d.today });
    run("tr", "certify", { reference: "DEMO", expiry: "2027-03-31" });
    run("tr", "renew", { due: "2027-02-01" });
    const item = handoverAsset(
      [],
      "DEMO-001",
      "Demo laptop",
      "a",
      "hr",
      d.today,
      "asset",
    );
    d.records.push(item);
    expect(() =>
      handoverAsset(
        d.records,
        "demo-001",
        "Laptop",
        "b",
        "hr",
        d.today,
        "unused",
      ),
    ).toThrow();
    run("asset", "receive", { note: "Returned" });
    run("asset", "repair", { note: "Battery" });
    run("asset", "repaired", { note: "Ready" });
    expect(run("asset", "issue", { person: "b" }).employeeId).toBe("b");
  });
});
