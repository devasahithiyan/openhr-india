// Demo version of the real app's monthly payroll review (apps/api/src/payroll*.ts).
// Earnings are prorated by calendar days; employee PF comes from rule data; HR enters
// the other assessed deductions and an Admin publishes. Amounts are whole rupees and
// the figures are illustrative, not tax or legal advice.

import type { BranchCalendar, Correction, Employee, LeavePolicy, LeaveRequest } from "./data";
import { annualTax, professionalTax } from "./payroll";
import { chargeableDays, eachDay } from "./time";

export const PAY_MONTH = "2026-11";

/** Mirrors packages/compliance rule files: version, rate in basis points, wage ceiling, rounding. */
export const PF_RULE = {
  version: "DEMO-FY2026-27-employee-epf",
  basisPoints: 1200,
  ceiling: 15000,
  rounding: 1,
};

/** Punches before this date count as synced from the biometric readers. */
const PUNCH_REVIEW_FROM = "2026-11-16";
const TODAY = "2026-11-19";

export interface SalaryComponent {
  name: string;
  monthly: number;
  pfWage: boolean;
}

export interface PayLine extends SalaryComponent {
  earned: number;
}

export interface Assessment {
  esi: number;
  pt: number;
  lwf: number;
  tds: number;
  reference: string;
}

export interface PayRow {
  employeeId: string;
  calendarDays: number;
  payableDays: number;
  joinedThisMonth: boolean;
  unpaid: string[];
  missingPunches: string[];
  issues: { text: string; to?: string }[];
  lines: PayLine[];
  pfBasis: number;
  pf: number;
  gross: number;
  /** Changes whenever the inputs change, so an older review goes stale. */
  hash: string;
  suggested: Assessment;
}

export const DEDUCTION_KEYS = ["esi", "pt", "lwf", "tds"] as const;
export const DEDUCTION_LABEL: Record<(typeof DEDUCTION_KEYS)[number], string> = {
  esi: "ESI",
  pt: "Professional Tax",
  lwf: "Labour Welfare Fund",
  tds: "Income tax (TDS)",
};

export function defaultComponents(e: Employee): SalaryComponent[] {
  const basic = Math.round(e.monthlyGross * 0.5);
  const hra = Math.round(basic * 0.4);
  return [
    { name: "Basic", monthly: basic, pfWage: true },
    { name: "House rent allowance", monthly: hra, pfWage: false },
    { name: "Special allowance", monthly: e.monthlyGross - basic - hra, pfWage: false },
  ];
}

export function employeePF(basis: number) {
  const r = PF_RULE.rounding;
  return Math.round((Math.min(basis, PF_RULE.ceiling) * PF_RULE.basisPoints) / (10000 * r)) * r;
}

export const totalDeductions = (pf: number, a: Assessment) => pf + a.esi + a.pt + a.lwf + a.tds;

export function buildRow(
  e: Employee,
  inputs: {
    components: SalaryComponent[];
    leaves: LeaveRequest[];
    policies: LeavePolicy[];
    corrections: Correction[];
    attendance: { employeeId: string; day: string; checkOut?: string }[];
    calendar: BranchCalendar;
  },
): PayRow {
  const { components, leaves, policies, corrections, attendance, calendar } = inputs;
  const [y, m] = PAY_MONTH.split("-").map(Number);
  const calendarDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = eachDay(`${PAY_MONTH}-01`, `${PAY_MONTH}-${calendarDays}`);
  const employed = days.filter((d) => d >= e.joined);

  const unpaidTypes = new Set(policies.filter((p) => p.unpaid).map((p) => p.name));
  const mine = leaves.filter((l) => l.employeeId === e.id);
  const unpaid = mine
    .filter((l) => l.status === "Approved" && unpaidTypes.has(l.type))
    .flatMap((l) => chargeableDays(l.from, l.to, calendar))
    .filter((d) => d.startsWith(PAY_MONTH) && d >= e.joined);
  const payableDays = employed.length - new Set(unpaid).size;

  const lines = components.map((c) => ({ ...c, earned: Math.round((c.monthly * payableDays) / calendarDays) }));
  const gross = lines.reduce((s, l) => s + l.earned, 0);
  const pfBasis = lines.reduce((s, l) => s + (l.pfWage ? l.earned : 0), 0);
  const pf = employeePF(pfBasis);

  const approvedLeaveDays = new Set(
    mine.filter((l) => l.status === "Approved").flatMap((l) => chargeableDays(l.from, l.to, calendar)),
  );
  const missingPunches = chargeableDays(PUNCH_REVIEW_FROM, "2026-11-18", calendar).filter(
    (d) =>
      d >= e.joined &&
      d < TODAY &&
      !approvedLeaveDays.has(d) &&
      !attendance.some((a) => a.employeeId === e.id && a.day === d && a.checkOut),
  );

  const issues: PayRow["issues"] = [];
  const overlapsMonth = (from: string, to: string) => from <= `${PAY_MONTH}-31` && to >= `${PAY_MONTH}-01`;
  if (mine.some((l) => l.status === "Pending" && overlapsMonth(l.from, l.to)))
    issues.push({ text: "Resolve pending leave for this month", to: "/admin/leave" });
  if (corrections.some((c) => c.employeeId === e.id && c.status === "Pending" && c.day.startsWith(PAY_MONTH)))
    issues.push({ text: "Resolve pending attendance corrections", to: "/admin/attendance" });
  if (components.length === 0) issues.push({ text: "Assign a salary structure" });
  else if (!components.some((c) => c.pfWage)) issues.push({ text: "Check PF wage components for this covered employee" });

  // Sample worksheet values HR would normally bring from their assessment.
  const tax = annualTax(e.monthlyGross * 12, e.regime, e.declarations).tax;
  const suggested: Assessment = {
    esi: gross <= 21000 ? Math.ceil(gross * 0.0075) : 0,
    pt: professionalTax(e.state, gross, m),
    lwf: 0,
    tds: Math.round(tax / 12),
    reference: `KT-${PAY_MONTH}-WS/${e.code}`,
  };

  const hash = JSON.stringify([lines, unpaid, payableDays, pf]);
  return { employeeId: e.id, calendarDays, payableDays, joinedThisMonth: e.joined > `${PAY_MONTH}-01`, unpaid, missingPunches, issues, lines, pfBasis, pf, gross, hash, suggested };
}

/** A frozen payslip, stored when an Admin publishes. Later changes don't alter it. */
export interface PublishedSlip {
  employeeId: string;
  payableDays: number;
  calendarDays: number;
  lines: PayLine[];
  gross: number;
  pf: number;
  assessment: Assessment;
  net: number;
}

export interface PublishedRun {
  month: string;
  publishedOn: string;
  slips: PublishedSlip[];
}
