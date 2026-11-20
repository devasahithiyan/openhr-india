import {
  EMPLOYEES,
  COMPANY,
  type AttendanceEntry,
  type LeavePolicy,
  type LeaveRequest,
  type BranchCalendar,
} from "../lib/data";
import { claimTotal, type Claim } from "../lib/expenses";
import { chargeableDays } from "../lib/time";
import { makeTasks, type OnboardingData } from "../onboarding/model";
import {
  transition,
  managerValid,
  shiftDate,
  type WorkData,
  type WorkPerson,
  type WorkRow,
  type WorkActor,
  type WorkCommand,
} from "./model";
export type WorkforceState = {
  today: string;
  people: WorkPerson[];
  records: WorkRow[];
};
type Related = {
  workforce: WorkforceState;
  onboarding: OnboardingData;
  claims: Claim[];
  policies: LeavePolicy[];
  leaves: LeaveRequest[];
  calendars: Record<string, BranchCalendar>;
  attendance: AttendanceEntry[];
};
const opts = (values: string[]) =>
  [...new Set(values)].map((name) => ({ id: name, name }));
export function demoWork(data: Related): WorkData {
  const { people, records, today } = data.workforce;
  return {
    today,
    people,
    records,
    company: COMPANY.name,
    branches: opts(EMPLOYEES.map((p) => p.branch)),
    departments: opts(EMPLOYEES.map((p) => p.department)),
    designations: opts(EMPLOYEES.map((p) => p.designation)),
    hr: [{ id: "e1", name: "Meenakshi · HR" }],
    templates: data.onboarding.templates,
    policies: data.policies.map((p) => ({ ...p, opening: p.openingDays })),
    claims: data.claims
      .filter((c) => c.status !== "Reimbursed")
      .map((c) => ({
        id: c.id,
        employeeId: c.owner,
        status: c.status,
        paise: claimTotal(c),
        owner:
          c.status === "Returned"
            ? (people.find((p) => p.id === c.owner)?.name ?? "Employee")
            : c.status === "Submitted"
              ? "Reporting manager"
              : "HR",
      })),
    issued: data.onboarding.plans.flatMap((p) =>
      (p.readiness?.equipment ?? []).map((i) => ({
        employeeId: p.employeeId,
        asset: i.asset,
        item: i.item,
      })),
    ),
    absences: data.leaves.map((l) => ({
      employeeId: l.employeeId,
      policy:
        data.policies.find(
          (p) => p.name === l.type && p.year === Number(l.from.slice(0, 4)),
        )?.id ?? "",
      status: l.status,
      days: chargeableDays(
        l.from,
        l.to,
        data.calendars[people.find((p) => p.id === l.employeeId)?.branch ?? ""],
      ),
    })),
    punches: data.attendance.map((p) => ({
      employeeId: p.employeeId,
      day: p.day,
      checkIn: p.day + "T" + p.checkIn + ":00+05:30",
      checkOut: p.checkOut
        ? (p.checkOut < p.checkIn ? shiftDate(p.day, 1) : p.day) +
          "T" +
          p.checkOut +
          ":00+05:30"
        : null,
    })),
  };
}
export function initialWork(): WorkforceState {
  const people = EMPLOYEES.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    joined: p.joined,
    manager: p.managerId ?? "",
    department: p.department,
    branch: p.branch,
    designation: p.designation,
    ended: null,
  }));
  const today = "2026-11-19";
  const seed = (
    id: string,
    kind: WorkRow["kind"],
    status: string,
    employeeId: string | null,
    action: string,
    values: Record<string, string>,
  ): WorkRow => ({
    id,
    kind,
    status,
    employeeId,
    assignedId: null,
    revision: 1,
    values,
    history: [{ action, at: today, actor: "e1", values }],
  });
  return {
    today,
    people,
    records: [
      seed("demo-exit", "exit", "Requested", "e3", "resign", {
        proposed: today,
        notice: "30",
        note: "Fictional studio handover",
      }),
      seed("demo-laptop", "asset", "Assigned", "e3", "issue", {
        name: "Design laptop",
        assetTag: "DEMO-LT-014",
        person: "e3",
      }),
      seed("demo-night", "shift", "Published", "e3", "roster", {
        person: "e3",
        day: "2026-11-20",
        start: "22:00",
        end: "06:00",
      }),
      seed("demo-swap", "shift", "Published", "e4", "roster", {
        person: "e4",
        day: "2026-11-21",
        start: "10:00",
        end: "18:00",
      }),
      seed("demo-positions", "position", "Recruiting", null, "position", {
        branch: "Coimbatore",
        department: "Design",
        designation: "Senior Textile Designer",
        seats: "2",
      }),
      seed("demo-policy", "accrual", "Active", "e3", "accrual", {
        policy: "p3",
        monthly: "1",
        cap: "5",
        expiry: "2026-03-31",
      }),
    ],
  };
}
export function applyDemo(data: Related, a: WorkActor, c: WorkCommand) {
  const d = demoWork(data);
  if (d.people.find((p) => p.id === a.employeeId)?.ended)
    throw Error("Company access has ended.");
  const { row, other } = transition(d, a, c, d.today + "T10:00:00+05:30"),
    v = row.values;
  let people = [...d.people],
    records = d.records.filter((r) => r.id !== row.id && r.id !== other?.id),
    onboarding = data.onboarding;
  if (c.action === "reassign")
    people = people.map((p) =>
      p.id === v.report ? { ...p, manager: v.manager } : p,
    );
  if (c.action === "closeExit")
    people = people.map((p) =>
      p.id === row.employeeId ? { ...p, ended: v.last } : p,
    );
  if (c.action === "returnAsset") {
    const prior = records.find(
      (r) => r.kind === "asset" && r.values.assetTag === v.asset,
    );
    const asset: WorkRow = {
      id: prior?.id ?? crypto.randomUUID(),
      kind: "asset",
      employeeId: null,
      assignedId: null,
      revision: (prior?.revision ?? 0) + 1,
      status: v.result === "Returned" ? "In stock" : "Exception",
      values: prior?.values ?? {
        assetTag: v.asset,
        name: d.issued.find((i) => i.asset === v.asset)?.item ?? v.asset,
      },
      history: [...(prior?.history ?? []), row.history.at(-1)!],
    };
    records = [...records.filter((i) => i.id !== asset.id), asset];
  }
  if (c.action === "hire") {
    const pos = records.find((r) => r.id === v.position)!,
      t = onboarding.templates.find((t) => t.id === v.template)!;
    if (
      (t.branchId && t.branchId !== pos.values.branch.toLowerCase()) ||
      (t.departmentId &&
        t.departmentId !== pos.values.department.toLowerCase()) ||
      (!v.manager && t.definitions.some((d) => d.owner === "Manager"))
    )
      throw Error("Check onboarding template scope and manager");
    const p = {
      id: crypto.randomUUID(),
      code: v.code,
      name: v.name,
      branch: pos.values.branch,
      department: pos.values.department,
      designation: pos.values.designation,
      manager: v.manager,
      joined: v.joined,
      ended: null,
    };
    people = [...people, p];
    row.employeeId = p.id;
    onboarding = {
      ...onboarding,
      people: [
        ...onboarding.people,
        {
          id: p.id,
          name: p.name,
          email: v.email,
          joined: p.joined,
          branchId: p.branch.toLowerCase(),
          departmentId: p.department.toLowerCase(),
          managerId: p.manager || null,
        },
      ],
      plans: [
        ...onboarding.plans,
        {
          employeeId: p.id,
          templateId: t.id,
          startedFor: p.joined,
          tasks: makeTasks(t, p.joined),
          revision: 1,
          closedAt: null,
          buddyId: null,
        },
      ],
    };
  }
  return {
    workforce: advanceDemo(
      {
        today: d.today,
        people,
        records: [...records, row, ...(other ? [other] : [])],
      },
      d.today,
    ),
    onboarding,
  };
}
export function advanceDemo(s: WorkforceState, today: string): WorkforceState {
  let people = s.people;
  const records = s.records.map((r) => {
    if (
      r.kind !== "transfer" ||
      r.status !== "Scheduled" ||
      r.values.day > today
    )
      return r;
    const v = r.values;
    let status = "Applied";
    try {
      managerValid({ people } as WorkData, r.employeeId!, v.manager);
      if (people.find((p) => p.id === r.employeeId)?.ended) throw Error();
      people = people.map((p) =>
        p.id === r.employeeId
          ? {
              ...p,
              branch: v.branch,
              department: v.department,
              designation: v.designation,
              manager: v.manager,
            }
          : p,
      );
    } catch {
      status = "Needs review";
    }
    return {
      ...r,
      status,
      revision: r.revision + 1,
      history: [
        ...r.history,
        { at: today, actor: "Scheduler", action: status, values: {} },
      ],
    };
  });
  return { people, records, today };
}

export function demoPunchDay(data: Related, id: string, time: string) {
  const day = data.workforce.today,
    prior = shiftDate(day, -1);
  const night = data.workforce.records.find(
    (r) =>
      r.kind === "shift" &&
      r.employeeId === id &&
      r.values.day === prior &&
      r.values.start > r.values.end,
  );
  const open = data.attendance.find(
    (p) => p.employeeId === id && p.day === prior && !p.checkOut,
  );
  return night &&
    (open || time < night.values.end) &&
    !data.attendance.some((p) => p.employeeId === id && p.day === day)
    ? prior
    : day;
}
