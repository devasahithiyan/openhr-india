import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PayslipSheet } from "../components/PayslipSheet";
import { Button, PageHeader, Pill, Section, fmtDate, fmtDay, fmtShort, statusTone } from "../components/ui";
import { type LeaveType } from "../lib/data";
import { annualTax, computePayslip, rupees, type Regime } from "../lib/payroll";
import { DEMO_TODAY, useDemo, useMe } from "../lib/store";
import {demoWork} from "../workforce/adapter";
import {ledger} from "../workforce/model";
import { chargeableDays } from "../lib/time";

/** Balances for this year's leave policies, as configured by HR. */
function useMyLeave() {
  const store=useDemo(), {leaves,policies}=store, data=demoWork(store);
  const me = useMe();
  const mine = leaves.filter((l) => l.employeeId === me.id);
  const balance = policies
    .filter((p) => p.year === Number(data.today.slice(0,4)))
    .map((p) => {
      const used = mine.filter((l) => l.type === p.name && l.status === "Approved").reduce((s, l) => s + l.days, 0);
      const pending = mine.filter((l) => l.type === p.name && l.status === "Pending").reduce((s, l) => s + l.days, 0);
      const left=ledger(data,me.id,p.id).reduce((sum,entry)=>sum+entry.days,0); return {type:p.name,total:left+used+pending,used,pending,left};
    });
  return { mine, balance };
}

function useMyHolidays() {
  const { calendars } = useDemo();
  const me = useMe();
  return calendars[me.branch].holidays.filter((h) => h.day >= DEMO_TODAY);
}

export function EmployeeHome() {
  const me = useMe();
  const { mine, balance } = useMyLeave();
  const holidays = useMyHolidays();
  const last = computePayslip(me, 10);
  const latest = mine[0];

  return (
    <>
      <header className="loom-hero employee-hero"><div className="loom-intro"><p>{me.designation} · {me.branch}</p><h1>Vanakkam,<br/>{me.name.split(" ")[0]}.</h1><Link className="loom-link" to="/me/profile">View profile <span aria-hidden="true">↗</span></Link></div><div className="loom-art" aria-hidden="true"/></header>

      <div className="grid gap-x-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Section title="October salary">
            <Link
              to="/me/payslips"
              className="block rounded-xl bg-indigo-deep px-6 py-5 text-white transition-colors hover:bg-indigo"
            >
              <p className="text-[15px] text-white/70">Credited to {me.bank} ••{me.accountLast4} on 31 Oct</p>
              <p className="num mt-1 text-[40px] leading-tight font-extrabold">{rupees(last.net)}</p>
              <p className="mt-2 text-[15px] font-semibold text-haldi">View payslip</p>
            </Link>
          </Section>

          <Section
            title="Leave balance"
            action={
              <Link to="/me/leave" className="text-[15px] font-semibold text-indigo hover:underline">
                Apply for leave
              </Link>
            }
          >
            <ul className="grid grid-cols-3 gap-3">
              {balance.map((b) => (
                <li key={b.type} className="rounded-xl bg-white px-4 py-4 ring-1 ring-line">
                  <p className="text-[14px] text-muted">{b.type}</p>
                  <p className="num text-[28px] leading-tight font-bold">{b.left}</p>
                  <p className="text-[13px] text-muted">of {b.total} days left</p>
                </li>
              ))}
            </ul>
            {latest && (
              <p className="mt-3 text-[15px] text-muted">
                Your latest request: {latest.type.toLowerCase()} leave from {fmtShort(latest.from)}{" "}
                <Pill tone={statusTone(latest.status)}>{latest.status}</Pill>
              </p>
            )}
          </Section>
        </div>

        <Section title={`Holidays at ${me.branch}`}>
          <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
            {holidays.length === 0 && <li className="px-5 py-3 text-muted">No upcoming holidays.</li>}
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center gap-4 px-5 py-3">
                <span className="num w-16 text-[15px] font-semibold">{fmtShort(h.day)}</span>
                <span className="flex-1">{h.name}</span>
                <span className="text-[14px] text-muted">{fmtDay(h.day)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}

const SLIP_MONTHS = [
  { month: 10, year: 2026, label: "October 2026" },
  { month: 9, year: 2026, label: "September 2026" },
  { month: 8, year: 2026, label: "August 2026" },
];

export function EmployeePayslips() {
  const me = useMe();
  const { published } = useDemo();
  const novSlip = published?.slips.find((s) => s.employeeId === me.id);
  const months = novSlip ? [{ month: 11, year: 2026, label: "November 2026" }, ...SLIP_MONTHS] : SLIP_MONTHS;
  const [idx, setIdx] = useState(0);
  const m = months[Math.min(idx, months.length - 1)];
  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Payslips"
          sub={
            novSlip
              ? "November's payroll is published. Your new payslip is ready."
              : "November's payslip appears once HR reviews payroll and an Admin publishes it."
          }
          action={
            <div className="flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="month">
                Month
              </label>
              <select
                id="month"
                value={idx}
                onChange={(e) => setIdx(Number(e.target.value))}
                className="rounded-lg border border-line bg-white px-3 py-2 text-[15px]"
              >
                {months.map((s, i) => (
                  <option key={s.label} value={i}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Button variant="ghost" onClick={() => window.print()}>
                Print or save as PDF
              </Button>
            </div>
          }
        />
      </div>
      <PayslipSheet employee={me} month={m.month} year={m.year} slip={m.month === 11 ? novSlip : undefined} />
    </>
  );
}

export function EmployeeLeave() {
  const store=useDemo(), { applyLeave, withdrawLeave, calendars } = store;
  const me = useMe();
  const { mine, balance } = useMyLeave();
  const [type, setType] = useState<LeaveType>("Casual");
  const [from, setFrom] = useState("2026-12-24");
  const [to, setTo] = useState("2026-12-28");
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);

  const cal = calendars[me.branch];
  const days = chargeableDays(from, to, cal).length;
  const data=demoWork(store),policy=data.policies.find(p=>p.name===type&&p.year===Number(from.slice(0,4)));
  const reserved=chargeableDays(from,to,cal);
  const asOf=to>data.today?to:data.today;
  const left=policy?days+ledger({...data,absences:[...data.absences,{employeeId:me.id,policy:policy.id,status:"Pending",days:reserved}]},me.id,policy.id,asOf).reduce((sum,item)=>sum+item.days,0):0;
  const workweek = cal.weekdays.length === 6 ? "Sundays" : cal.weekdays.length === 5 ? "weekends" : "weekly offs";
  const error =
    !from || !to
      ? "Pick both dates."
      : to < from
        ? "The end date is before the start date."
        : days === 0
          ? "Those dates are all holidays or weekly offs."
          : days > left
            ? `You have ${left} ${type.toLowerCase()} days left.`
            : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (error || !reason.trim()) return;
    applyLeave({ type, from, to, days, reason: reason.trim() });
    setReason("");
    setSent(true);
  };

  return (
    <>
      <PageHeader
        title="Leave"
        sub={`Requests go to your manager and HR. ${me.branch} holidays and ${workweek} aren't counted.`}
      />
      <div className="grid gap-x-10 lg:grid-cols-[1fr_1.1fr]">
        <Section title="Apply for leave">
          <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-line">
            <fieldset>
              <legend className="mb-1.5 text-[15px] font-semibold">Type</legend>
              <div className="flex flex-wrap gap-2">
                {balance.map((b) => (
                  <label
                    key={b.type}
                    className={`cursor-pointer rounded-lg px-3 py-2 text-[15px] ring-1 ${
                      type === b.type ? "bg-indigo-soft font-semibold text-indigo ring-indigo" : "ring-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      className="sr-only"
                      checked={type === b.type}
                      onChange={() => setType(b.type)}
                    />
                    {b.type} <span className="text-muted">({b.left} left)</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[15px] font-semibold">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
                />
              </label>
              <label className="text-[15px] font-semibold">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
                />
              </label>
            </div>
            <label className="block text-[15px] font-semibold">
              Reason
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                placeholder="For example, family function in Madurai"
                className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={`text-[15px] ${error ? "text-sindoor" : "text-muted"}`} role="status">
                {error || `${days} chargeable working ${days === 1 ? "day" : "days"}`}
              </p>
              <Button type="submit" disabled={!!error || !reason.trim()}>
                Send request
              </Button>
            </div>
            {sent && (
              <p className="rounded-lg bg-leaf-soft px-4 py-3 text-[15px] text-leaf">
                Request sent. Switch to the HR admin view to approve it.
              </p>
            )}
          </form>
        </Section>

        <Section title="Your requests">
          {mine.length === 0 ? (
            <p className="text-muted">You haven't applied for leave this year.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
              {mine.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div>
                    <p className="font-semibold">
                      {l.type}, {l.days} {l.days === 1 ? "day" : "days"}
                    </p>
                    <p className="text-[14px] text-muted">
                      {fmtDate(l.from)}
                      {l.from !== l.to && ` to ${fmtDate(l.to)}`}. {l.reason}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Pill tone={statusTone(l.status)}>{l.status}</Pill>
                    {l.status === "Pending" && (
                      <button className="text-[14px] font-semibold text-sindoor hover:underline" onClick={() => withdrawLeave(l.id)}>
                        Withdraw
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

export function EmployeeTax() {
  const me = useMe();
  const { setMyTax } = useDemo();
  const [c80, setC80] = useState(me.declarations.sec80C);
  const [d80, setD80] = useState(me.declarations.sec80D);
  const annual = me.monthlyGross * 12;
  const decl = { sec80C: c80, sec80D: d80 };
  const calc = (r: Regime) => annualTax(annual, r, decl);
  const oldT = calc("old");
  const newT = calc("new");
  const better: Regime = newT.tax <= oldT.tax ? "new" : "old";
  const saving = Math.abs(oldT.tax - newT.tax);

  return (
    <>
      <PageHeader title="Income tax, FY 2026–27" sub="Declare your investments and pick the regime that costs you less. HR deducts TDS based on your choice." />
      <div className="grid gap-x-10 lg:grid-cols-[1fr_1.2fr]">
        <Section title="Your declarations">
          <div className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-line">
            <p className="text-[15px] text-muted">
              Annual gross salary <span className="num font-semibold text-ink">{rupees(annual)}</span>
            </p>
            {[
              ["Section 80C", "PPF, ELSS, life insurance, EPF. Limit ₹1,50,000.", c80, setC80, 150000],
              ["Section 80D", "Health insurance premium. Limit ₹25,000.", d80, setD80, 25000],
            ].map(([label, help, value, set, max]) => (
              <label key={label as string} className="block">
                <span className="text-[15px] font-semibold">{label as string}</span>
                <span className="block text-[14px] text-muted">{help as string}</span>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={max as number}
                    step={1000}
                    value={value as number}
                    onChange={(e) => (set as (n: number) => void)(Number(e.target.value))}
                    className="flex-1 accent-indigo"
                  />
                  <span className="num w-24 text-right font-semibold">{rupees(value as number)}</span>
                </div>
              </label>
            ))}
            <p className="text-[14px] text-muted">The old regime also allows the ₹50,000 standard deduction. The new regime gives ₹75,000.</p>
          </div>
        </Section>

        <Section title="Compare regimes">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["old", "new"] as Regime[]).map((r) => {
              const t = r === "old" ? oldT : newT;
              const chosen = me.regime === r;
              return (
                <div
                  key={r}
                  className={`rounded-xl bg-white p-5 ring-1 ${chosen ? "ring-2 ring-indigo" : "ring-line"}`}
                >
                  <p className="flex items-center justify-between gap-2 font-semibold">
                    {r === "old" ? "Old regime" : "New regime"}
                    {better === r && <Pill tone="good">Lower tax</Pill>}
                  </p>
                  <p className="mt-3 text-[14px] text-muted">Taxable income</p>
                  <p className="num font-semibold">{rupees(t.taxable)}</p>
                  <p className="mt-2 text-[14px] text-muted">Tax for the year, incl. 4% cess</p>
                  <p className="num text-[26px] leading-tight font-bold">{rupees(t.tax)}</p>
                  <p className="num text-[14px] text-muted">{rupees(Math.round(t.tax / 12))} TDS per month</p>
                  <Button
                    className="mt-4 w-full"
                    variant={chosen ? "ghost" : "primary"}
                    disabled={chosen && me.declarations.sec80C === c80 && me.declarations.sec80D === d80}
                    onClick={() => setMyTax(r, decl)}
                  >
                    {chosen ? "Save declarations" : "Choose this regime"}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[15px]">
            {saving === 0
              ? "Both regimes cost the same for you."
              : `The ${better} regime saves you ${rupees(saving)} this year.`}{" "}
            You're on the <strong>{me.regime} regime</strong>.
          </p>
          <p className="mt-2 text-[13px] text-muted">Simplified, illustrative calculation. Check with a tax professional.</p>
        </Section>
      </div>
    </>
  );
}

export function EmployeeProfile() {
  const me = useMe();
  const rows: [string, string][] = [
    ["Employee code", me.code],
    ["Designation", me.designation],
    ["Department", me.department],
    ["Branch", `${me.branch}, ${me.state}`],
    ["Date of joining", fmtDate(me.joined)],
    ["Work email", me.email],
    ["PAN", me.panMasked],
    ["Aadhaar", `XXXX XXXX ${me.aadhaarLast4}`],
    ["UAN (PF)", me.uan],
    ["Bank account", `${me.bank} ••${me.accountLast4}`],
    ["IFSC", me.ifsc],
  ];
  return (
    <>
      <PageHeader title="Profile" sub="Need to change bank or ID details? Raise a request and HR will verify it." />
      <dl className="max-w-2xl divide-y divide-line rounded-xl bg-white text-[16px] ring-1 ring-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[10rem_1fr] gap-4 px-5 py-3">
            <dt className="text-muted">{k}</dt>
            <dd className="num font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[14px] text-muted">Your PAN, Aadhaar and account numbers are masked everywhere in the app.</p>
    </>
  );
}
