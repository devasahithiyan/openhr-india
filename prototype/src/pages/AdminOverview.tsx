import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Pill, Section, fmtShort, statusTone } from "../components/ui";
import { BRANCHES, EMPLOYEES, PAYROLL_MONTH, TODAY } from "../lib/data";
import { computePayslip, rupees } from "../lib/payroll";
import { useDemo, useDirectory } from "../lib/store";

const todayIso = "2026-11-19";
export const empById = (id: string) => EMPLOYEES.find((e) => e.id === id)!;

export function AdminOverview() {
  const { leaves, filings, published, setLeaveStatus } = useDemo();
  const directory = useDirectory();
  const [decision, setDecision] = useState("");
  const decide = (id: string, name: string, status: "Approved" | "Rejected") => {
    setLeaveStatus(id, status);
    setDecision(name + "’s leave request was " + status.toLowerCase() + ".");
  };
  const slips = EMPLOYEES.map((e) => computePayslip(e, PAYROLL_MONTH.month));
  const gross = slips.reduce((s, p) => s + p.gross, 0);
  const employerCost = slips.reduce((s, p) => s + p.employerPf + p.employerEsi, 0);
  const pending = leaves.filter((l) => l.status === "Pending");
  const onLeave = leaves.filter((l) => l.status === "Approved" && l.from <= todayIso && l.to >= todayIso);
  const nextFilings = filings.filter((f) => f.status !== "Filed").sort((a, b) => a.due.localeCompare(b.due));
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(TODAY);

  return (
    <>
      <header className="loom-hero">
        <div className="loom-intro">
          <p>{dateLabel}</p>
          <h1>
            Good morning,
            <br />
            Meenakshi.
          </h1>
          <Link className="loom-link" to="/admin/payroll">
            {published ? "View November payroll" : "Review November payroll"} <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div aria-hidden="true" className="loom-art" />
      </header>
      <div className="overview-ledger">
        <section className="pay-summary">
          <h2>{PAYROLL_MONTH.label} payroll cost</h2>
          <strong className="num">{rupees(gross + employerCost)}</strong>
          <div className="pay-split" aria-hidden="true">
            <i style={{ width: (100 * gross) / (gross + employerCost) + "%" }} />
          </div>
          <dl>
            <div>
              <dt>Gross pay</dt>
              <dd>{rupees(gross)}</dd>
            </div>
            <div>
              <dt>Employer PF &amp; ESI</dt>
              <dd>{rupees(employerCost)}</dd>
            </div>
          </dl>
        </section>
        <section className="team-summary">
          <h2>Headcount by branch</h2>
          <strong className="num">
            {directory.length} <small>employees</small>
          </strong>
          <ul>
            {BRANCHES.map((b) => {
              const n = directory.filter((e) => e.branch === b.name).length;
              return (
                <li key={b.name}>
                  <span>{b.name}</span>
                  <i aria-hidden="true">
                    <b style={{ width: (100 * n) / Math.max(1, directory.length) + "%" }} />
                  </i>
                  <strong>{n}</strong>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <div className="overview-queues grid gap-x-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="decision-feedback" role="status">
            {decision}
          </p>
          <Section
            title={`Leave waiting for approval (${pending.length})`}
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
                        <Button variant="danger" onClick={() => decide(l.id, e.name, "Rejected")}>
                          Reject
                        </Button>
                        <Button onClick={() => decide(l.id, e.name, "Approved")}>Approve</Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

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
        </div>
      </div>
    </>
  );
}
