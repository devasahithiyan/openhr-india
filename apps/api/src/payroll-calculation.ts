import pilot from "@openhr/compliance/rules/tn-2024-25.json";
import type { SalaryComponent, PayLine } from "@openhr/shared";
export { pilot };
export function monthEnd(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, number!, 0)).toISOString().slice(0, 10);
}
export function employeePF(basis: number) {
  return (
    Math.round(
      (Math.min(basis, pilot.ceilingPaise) * pilot.basisPoints) /
        (10000 * pilot.roundingPaise),
    ) * pilot.roundingPaise
  );
}
export function earnings(
  month: string,
  joined: string,
  unpaid: string[],
  salaries: { effective: string; components: SalaryComponent[] }[],
) {
  const calendarDays = Number(monthEnd(month).slice(-2));
  const byEffective = [...salaries].sort((a, b) =>
    b.effective.localeCompare(a.effective),
  );
  const segments = new Map<
    string,
    { components: SalaryComponent[]; days: number }
  >();
  const leave = new Set(unpaid);
  let missingSalary = false,
    payableDays = 0;
  for (let n = 1; n <= calendarDays; n++) {
    const day = month + "-" + String(n).padStart(2, "0");
    if (day < joined) continue;
    const salary = byEffective.find((s) => s.effective <= day);
    if (!salary) missingSalary = true;
    if (!leave.has(day)) payableDays++;
    if (!salary) continue;
    const segment = segments.get(salary.effective) ?? {
      components: salary.components,
      days: 0,
    };
    if (!leave.has(day)) segment.days++;
    segments.set(salary.effective, segment);
  }
  const lines: PayLine[] = [];
  for (const [effective, { components, days }] of segments)
    for (const component of components)
      lines.push({
        ...component,
        effective,
        days,
        earned: Math.round((component.monthly * days) / calendarDays),
      });
  const gross = lines.reduce((n, l) => n + l.earned, 0);
  const pfBasis = lines.reduce((n, l) => n + (l.pfWage ? l.earned : 0), 0);
  return {
    lines,
    gross,
    pfBasis,
    pf: employeePF(pfBasis),
    calendarDays,
    payableDays,
    missingSalary,
  };
}
