"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  canManageEmployees,
  type PayRow,
  type PayrollCommand,
  type PayrollView,
} from "@openhr/shared";
import { api } from "../../components/api";
import { useSession } from "../../components/session";

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    paise / 100,
  );
const fields = ["esi", "pt", "lwf", "tds"] as const;
type Send = (command: PayrollCommand) => Promise<void>;

function SalaryForm({ row, send }: { row: PayRow; send: Send }) {
  const last = row.lines.at(-1)?.effective;
  const initial = row.lines
    .filter((l) => l.effective === last)
    .map((l) => ({
      name: l.name,
      amount: String(l.monthly / 100),
      pfWage: l.pfWage,
    }));
  const [lines, setLines] = useState(
    initial.length ? initial : [{ name: "Basic", amount: "", pfWage: true }],
  );
  const update = (i: number, patch: Partial<(typeof lines)[number]>) =>
    setLines(lines.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const effective = String(
      new FormData(event.currentTarget).get("effective"),
    );
    void send({
      action: "salary",
      employeeId: row.employeeId,
      effective,
      components: lines.map((l) => ({
        name: l.name,
        monthly: Math.round(Number(l.amount) * 100),
        pfWage: l.pfWage,
      })),
    });
  }
  return (
    <details className="my-4">
      <summary className="cursor-pointer font-semibold">
        Set salary structure
      </summary>
      <form className="grid gap-3 py-3" onSubmit={save}>
        <label>
          Effective from
          <input
            name="effective"
            type="date"
            required
            defaultValue={
              last ??
              (row.joined > row.month + "-01" ? row.joined : row.month + "-01")
            }
          />
        </label>
        <p className="text-sm text-muted">
          A new date starts a salary revision. Saving an existing date replaces
          that revision’s components.
        </p>
        {lines.map((line, i) => (
          <fieldset className="grid gap-2 sm:grid-cols-2" key={i}>
            <legend>Component {i + 1}</legend>
            <label>
              Component name
              <input
                required
                maxLength={60}
                value={line.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </label>
            <label>
              Monthly amount (₹)
              <input
                type="number"
                required
                min="0.01"
                max="10000000"
                step="0.01"
                value={line.amount}
                onChange={(e) => update(i, { amount: e.target.value })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                className="w-auto"
                checked={line.pfWage}
                onChange={(e) => update(i, { pfWage: e.target.checked })}
              />{" "}
              Include in PF wages
            </label>
            {lines.length > 1 && (
              <button
                className="secondary"
                type="button"
                onClick={() => setLines(lines.filter((_, n) => n !== i))}
              >
                Remove component {i + 1}
              </button>
            )}
          </fieldset>
        ))}
        {lines.length < 20 && (
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setLines([...lines, { name: "", amount: "", pfWage: false }])
            }
          >
            Add component
          </button>
        )}
        <button>Save salary structure</button>
      </form>
    </details>
  );
}
function Review({ row, send }: { row: PayRow; send: Send }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const amount = (key: string) => Math.round(Number(f.get(key)) * 100);
    void send({
      action: "review",
      month: row.month,
      employeeId: row.employeeId,
      hash: row.hash,
      assessment: {
        esi: amount("esi"),
        pt: amount("pt"),
        lwf: amount("lwf"),
        tds: amount("tds"),
        reference: String(f.get("reference")),
        standardCappedPF: true,
      },
    });
  }
  return (
    <details>
      <summary className="cursor-pointer font-semibold">
        {row.assessment
          ? "Edit deduction review"
          : "Review deductions and attendance"}
      </summary>
      <form className="grid gap-3 py-3" onSubmit={submit}>
        <p>
          Enter employee deductions from the assessed payroll worksheet in
          rupees. Enter zero only for a verified zero liability.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((key) => (
            <label key={key}>
              {key.toUpperCase()} (₹)
              <input
                name={key}
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={row.assessment ? row.assessment[key] / 100 : ""}
              />
            </label>
          ))}
        </div>
        <label>
          Assessment reference (visible on payslip)
          <input
            name="reference"
            minLength={3}
            maxLength={160}
            required
            defaultValue={row.assessment?.reference}
            placeholder="Worksheet reference, without personal identifiers"
          />
        </label>
        <label>
          <input required className="w-auto" type="checkbox" /> I verified
          attendance exceptions, the deduction amounts, PF wages and standard
          capped employee PF coverage. Special rates and higher contributions
          are outside this pilot.
        </label>
        <button>Save review</button>
      </form>
    </details>
  );
}
function Statement({ row }: { row: PayRow }) {
  return (
    <>
      <p className="text-muted">
        Joined {row.joined} · {row.payableDays} payable / {row.calendarDays}{" "}
        calendar days
      </p>
      {row.unpaid.length > 0 && (
        <p>Approved unpaid leave · {row.unpaid.join(", ")}</p>
      )}
      <dl className="my-3">
        {row.lines.map((l) => (
          <div key={l.effective + l.name} className="border-b border-line py-1">
            <dt>
              {l.name} · effective {l.effective}
            </dt>
            <dd>
              {money(l.monthly)} × {l.days} / {row.calendarDays} ={" "}
              {money(l.earned)}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        Gross earnings <strong>{money(row.gross)}</strong>
      </p>
      {row.rule && row.pf !== null && (
        <p>
          Employee PF · {row.rule.basisPoints / 100}% ×{" "}
          {money(Math.min(row.pfBasis, row.rule.ceilingPaise))} ={" "}
          {money(row.pf)} after rounding to {money(row.rule.roundingPaise)}.
          Eligible wages {money(row.pfBasis)}, ceiling{" "}
          {money(row.rule.ceilingPaise)} · {row.rule.version}
        </p>
      )}
      {row.assessment && (
        <>
          <p>
            {fields
              .map((k) => k.toUpperCase() + " " + money(row.assessment![k]))
              .join(" · ")}
          </p>
          <p>Assessment · {row.assessment.reference}</p>
          <p className="font-bold">Net pay {money(row.net!)}</p>
        </>
      )}
    </>
  );
}
function Period({ month }: { month: string }) {
  const user = useSession();
  const writer = !!user && canManageEmployees(user.role);
  const [data, setData] = useState<PayrollView | null>(null),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api<PayrollView>("/payroll?month=" + month)
      .then((v) => {
        if (active) {
          setData(v);
          setError("");
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [month, reload]);
  async function send(command: PayrollCommand) {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/payroll", {
        method: "POST",
        headers: { "x-csrf-token": user.csrfToken },
        body: JSON.stringify(command),
      });
      setData(await api<PayrollView>("/payroll?month=" + month));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payroll update failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div role="alert" className="error">
          {error}{" "}
          <button onClick={() => setReload((n) => n + 1)}>
            Reload register
          </button>
        </div>
      )}
      {!data && !error && <p role="status">Loading pay period…</p>}
      {data && (
        <fieldset disabled={busy} className="space-y-4">
          {writer && (
            <div className="register-ledger">
              <h2 className="text-xl font-semibold">
                {data.published ? "Published register" : "Draft register"}
              </h2>
              <dl>
                <div>
                  <dt>Employees</dt>
                  <dd>{data.rows.length}</dd>
                </div>
                <div>
                  <dt>Gross pay</dt>
                  <dd>{money(data.gross)}</dd>
                </div>
                {data.rows.length > 0 && data.net !== null && (
                  <div>
                    <dt>Net pay</dt>
                    <dd>{money(data.net)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          {!data.rows.length && (
            <p>
              {writer
                ? "No eligible employees in this month."
                : "No published payslip for this month."}
            </p>
          )}
          {data.rows.map((row) => (
            <article className="panel" key={row.employeeId}>
              <h2 className="text-xl font-semibold">
                {row.name} · {row.code}
              </h2>
              <Statement row={row} />
              {writer && !data.published && (
                <>
                  {row.issues.map((i) => (
                    <p key={i} className="field-error">
                      {i}
                    </p>
                  ))}
                  {row.missingPunches.length > 0 && (
                    <details>
                      <summary>
                        Review {row.missingPunches.length} working days with
                        missing or incomplete punches
                      </summary>
                      <p>
                        {row.missingPunches.join(", ")}. These days are included
                        in pay unless covered by approved unpaid leave.
                      </p>
                    </details>
                  )}
                  <SalaryForm key={row.hash} row={row} send={send} />
                  {!row.issues.length && (
                    <Review key={"review-" + row.hash} row={row} send={send} />
                  )}
                </>
              )}
            </article>
          ))}
          {user?.role === "Admin" && !data.published && (
            <button
              disabled={
                !data.rows.length ||
                data.rows.some((r) => r.issues.length || !r.assessment)
              }
              onClick={() =>
                send({ action: "publish", month, hash: data.hash })
              }
            >
              Approve and publish payslips
            </button>
          )}
        </fieldset>
      )}
    </>
  );
}
export default function Payroll() {
  const user = useSession();
  const writer = !!user && canManageEmployees(user.role);
  const [month, setMonth] = useState("2025-03");
  return (
    <section className="max-w-4xl space-y-5">
      <h1 className="text-3xl font-bold">
        {writer ? "Monthly payroll" : "My payslip"}
      </h1>
      {writer && (
        <p>
          Review earnings, attendance exceptions and assessed deductions for the
          Tamil Nadu FY 2024–25 pilot.
        </p>
      )}
      <label className="max-w-xs">
        Pay month
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </label>
      {month && <Period key={month} month={month} />}
    </section>
  );
}
