import { Link } from "react-router-dom";
import { Avatar, Button, PageHeader, Pill, Section, fmtShort, statusTone } from "../components/ui";
import { BRANCHES, EMPLOYEES, PAYROLL_MONTH, TODAY } from "../lib/data";
import { computePayslip, rupees } from "../lib/payroll";
import { useDemo } from "../lib/store";

const todayIso = "2026-11-19";
export const empById = (id: string) => EMPLOYEES.find((e) => e.id === id)!;

export function AdminOverview() {
  const { leaves, filings, payrollStage, setLeaveStatus } = useDemo();
  const slips = EMPLOYEES.map((e) => computePayslip(e, PAYROLL_MONTH.month));
  const gross = slips.reduce((s, p) => s + p.gross, 0);
  const employerCost = slips.reduce((s, p) => s + p.employerPf + p.employerEsi, 0);
  const pending = leaves.filter((l) => l.status === "Pending");
  const onLeave = leaves.filter((l) => l.status === "Approved" && l.from <= todayIso && l.to >= todayIso);
  const nextFilings = filings.filter((f) => f.status !== "Filed").sort((a, b) => a.due.localeCompare(b.due));
  const dateLabel = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(TODAY);

  const figures = [
    { label: "Employees", value: String(EMPLOYEES.length), note: `across ${BRANCHES.length} branches` },
    { label: `${PAYROLL_MONTH.label} payroll cost`, value: rupees(gross + employerCost), note: `incl. ${rupees(employerCost)} employer PF and ESI` },
    { label: "Leave requests waiting", value: String(pending.length), note: pending.length ? "needs your decision" : "all caught up" },
    { label: "Next filing", value: nextFilings[0] ? fmtShort(nextFilings[0].due) : "None", note: nextFilings[0]?.name ?? "" },
  ];

  return (
    <>
      <PageHeader
        title="Good morning, Meenakshi"
        sub={dateLabel}
        action={
          <Link to="/admin/payroll">
            <Button>{payrollStage === "paid" ? "View November payroll" : "Continue November payroll"}</Button>
          </Link>
        }
      />

      <dl className="mb-10 grid grid-cols-2 rounded-xl bg-white ring-1 ring-line lg:grid-cols-4 lg:divide-x lg:divide-line">
        {figures.map((f) => (
          <div key={f.label} className="px-5 py-5">
            <dt className="text-[14px] text-muted">{f.label}</dt>
            <dd className="num mt-1 text-[26px] leading-tight font-bold text-ink">{f.value}</dd>
            <dd className="mt-0.5 text-[13px] text-muted">{f.note}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-x-10 lg:grid-cols-[1.4fr_1fr]">
        <Section
          title="Leave waiting for approval"
          action={
            <Link className="text-[15px] font-semibold text-indigo hover:underline" to="/admin/leave">
              See all
            </Link>
          }
        >
          {pending.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-muted">
              No requests waiting. New ones from employees will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
              {pending.map((l) => {
                const e = empById(l.employeeId);
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <Avatar name={e.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{e.name}</p>
                      <p className="text-[14px] text-muted">
                        {l.type} leave, {l.days} {l.days === 1 ? "day" : "days"}: {fmtShort(l.from)}
                        {l.from !== l.to && ` to ${fmtShort(l.to)}`}
                      </p>
                    </div>
                    <div className="flex w-full gap-2 xl:w-auto [&>button]:flex-1 xl:[&>button]:flex-none">
                      <Button variant="danger" onClick={() => setLeaveStatus(l.id, "Rejected")}>
                        Reject
                      </Button>
                      <Button onClick={() => setLeaveStatus(l.id, "Approved")}>Approve</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <div>
          <Section title="Coming up">
            <ul className="space-y-3">
              {nextFilings.slice(0, 4).map((f) => (
                <li key={f.id} className="flex items-start gap-4">
                  <span className="num w-14 shrink-0 rounded-lg bg-white py-1.5 text-center text-[14px] leading-tight font-semibold ring-1 ring-line">
                    {fmtShort(f.due)}
                  </span>
                  <span className="pt-1 text-[15px]">{f.name}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="On leave today">
            {onLeave.length === 0 ? (
              <p className="text-muted">Everyone's in today.</p>
            ) : (
              <ul className="space-y-2">
                {onLeave.map((l) => {
                  const e = empById(l.employeeId);
                  return (
                    <li key={l.id} className="flex items-center gap-3">
                      <Avatar name={e.name} size="sm" />
                      <span>
                        {e.name} <span className="text-muted">({e.branch})</span>
                      </span>
                      <Pill tone={statusTone(l.status)}>{l.type}</Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Headcount by branch">
            <ul className="space-y-3">
              {BRANCHES.map((b) => {
                const n = EMPLOYEES.filter((e) => e.branch === b.name).length;
                return (
                  <li key={b.name}>
                    <div className="flex justify-between text-[15px]">
                      <span>
                        {b.name} <span className="text-muted">{b.state}</span>
                      </span>
                      <span className="num font-semibold">{n}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-line/70">
                      <div className="h-2 rounded-full bg-indigo" style={{ width: `${(n / EMPLOYEES.length) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
