import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, PageHeader, Pill, fmtDate, fmtShort } from "../components/ui";
import { EMPLOYEES, type Employee } from "../lib/data";
import { indian, rupees } from "../lib/payroll";
import {
  DEDUCTION_KEYS,
  DEDUCTION_LABEL,
  PAY_MONTH,
  PF_RULE,
  buildRow,
  defaultComponents,
  totalDeductions,
  type Assessment,
  type PayRow,
  type SalaryComponent,
} from "../lib/payrollRun";
import { DEMO_TODAY, useDemo } from "../lib/store";

type Status = "Blocked" | "Needs review" | "Inputs changed" | "Reviewed" | "Published";
const TONE = { Blocked: "bad", "Needs review": "warn", "Inputs changed": "warn", Reviewed: "good", Published: "good" } as const;
const FILTERS = ["All", "Blocked", "Needs review", "Reviewed"] as const;

export function AdminPayroll() {
  const demo = useDemo();
  const { salaries, reviews, published, saveReview, publishPayroll, reopenPayroll } = demo;
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);

  const rows = EMPLOYEES.map((e) => {
    const row = buildRow(e, {
      components: salaries[e.id] ?? defaultComponents(e),
      leaves: demo.leaves,
      policies: demo.policies,
      corrections: demo.corrections,
      attendance: demo.attendance,
      calendar: demo.calendars[e.branch],
    });
    const review = reviews[e.id];
    const status: Status = published
      ? "Published"
      : row.issues.length
        ? "Blocked"
        : !review
          ? "Needs review"
          : review.hash !== row.hash
            ? "Inputs changed"
            : "Reviewed";
    const net = review && status === "Reviewed" ? row.gross - totalDeductions(row.pf, review) : null;
    return { e, row, review, status, net };
  });

  const blocked = rows.filter((r) => r.status === "Blocked").length;
  const reviewed = rows.filter((r) => r.status === "Reviewed").length;
  const gross = rows.reduce((s, r) => s + r.row.gross, 0);
  const allReady = reviewed === rows.length;
  const pubNet = published?.slips.reduce((s, x) => s + x.net, 0) ?? 0;
  const netSoFar = rows.reduce((s, r) => s + (r.status === "Reviewed" ? r.net ?? 0 : 0), 0);

  const visible = rows.filter((r) =>
    filter === "All"
      ? true
      : filter === "Needs review"
        ? r.status === "Needs review" || r.status === "Inputs changed"
        : r.status === filter,
  );

  const reviewReady = () => {
    for (const r of rows)
      if (r.status === "Needs review" || r.status === "Inputs changed")
        saveReview(r.e.id, { ...r.row.suggested, hash: r.row.hash });
  };

  const publish = () =>
    publishPayroll({
      month: PAY_MONTH,
      publishedOn: DEMO_TODAY,
      slips: rows.map(({ e, row, review }) => ({
        employeeId: e.id,
        payableDays: row.payableDays,
        calendarDays: row.calendarDays,
        lines: row.lines,
        gross: row.gross,
        pf: row.pf,
        assessment: { esi: review!.esi, pt: review!.pt, lwf: review!.lwf, tds: review!.tds, reference: review!.reference },
        net: row.gross - totalDeductions(row.pf, review!),
      })),
    });

  const downloadBankFile = () => {
    if (!published) return;
    const body = published.slips
      .map((s) => {
        const e = EMPLOYEES.find((x) => x.id === s.employeeId)!;
        return `${e.code},${e.name},${e.bank},XXXXXX${e.accountLast4},${e.ifsc},${s.net}`;
      })
      .join("\n");
    const url = URL.createObjectURL(new Blob(["Employee code,Name,Bank,Account,IFSC,Net pay\n" + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "kaveri-salary-transfer-nov-2026-SAMPLE.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const figures: [string, string, string?][] = [
    ["Employees", String(rows.length)],
    ["Gross earnings", rupees(gross), "after proration and loss of pay"],
    published
      ? ["Net pay", rupees(pubNet), `published ${fmtShort(published.publishedOn)}`]
      : ["Reviewed", `${reviewed} of ${rows.length}`, reviewed ? `${rupees(netSoFar)} net so far` : "none yet"],
    ["Blocked", String(published ? 0 : blocked), blocked && !published ? "resolve before publishing" : "nothing blocking"],
  ];

  return (
    <>
      <PageHeader
        title="Payroll for November 2026"
        sub="Check earnings and attendance exceptions, enter assessed deductions for each person, then publish payslips."
        action={
          published ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="stamp inline-flex items-center rounded-md border-[3px] border-leaf px-3 text-[20px] font-extrabold tracking-wide text-leaf">
                PUBLISHED
              </span>
              <Button variant="ghost" onClick={() => confirm("Reopen the demo payroll? Reviews will be cleared.") && reopenPayroll()}>
                Reopen demo payroll
              </Button>
            </div>
          ) : undefined
        }
      />

      <dl className="mb-6 grid grid-cols-2 rounded-xl bg-white ring-1 ring-line lg:grid-cols-4 lg:divide-x lg:divide-line">
        {figures.map(([k, v, note]) => (
          <div key={k} className="px-5 py-4">
            <dt className="text-[14px] text-muted">{k}</dt>
            <dd className={`num mt-0.5 text-[24px] leading-tight font-bold ${k === "Blocked" && v !== "0" ? "text-sindoor" : ""}`}>{v}</dd>
            {note && <dd className="text-[13px] text-muted">{note}</dd>}
          </div>
        ))}
      </dl>

      {!published && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white px-5 py-4 ring-1 ring-line">
          <p className="max-w-xl text-[15px]">
            {blocked
              ? `${blocked} ${blocked === 1 ? "person is" : "people are"} blocked by pending leave or corrections. Resolve those first; the register updates straight away.`
              : allReady
                ? "Every row is reviewed. An Admin can approve and publish the payslips."
                : `${rows.length - reviewed} ${rows.length - reviewed === 1 ? "row needs" : "rows need"} a deduction review.`}
          </p>
          <div className="flex flex-wrap gap-2">
            {rows.some((r) => r.status === "Needs review" || r.status === "Inputs changed") && (
              <Button variant="ghost" onClick={reviewReady}>
                Review ready rows from sample worksheet
              </Button>
            )}
            <Button onClick={publish} disabled={!allReady}>
              Approve and publish payslips
            </Button>
          </div>
        </div>
      )}

      {published && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl bg-white px-5 py-4 ring-1 ring-line">
            <p className="font-semibold">Payslips are published and frozen</p>
            <p className="text-[15px] text-muted">
              Employees can see them now. Later salary or attendance changes won't alter these slips.
            </p>
            <Button className="mt-3" variant="accent" onClick={downloadBankFile}>
              Download bank file (sample CSV)
            </Button>
          </div>
          <dl className="divide-y divide-line rounded-xl bg-white text-[15px] ring-1 ring-line">
            {(
              [
                ["Employee PF withheld", published.slips.reduce((s, x) => s + x.pf, 0)],
                ["ESI withheld", published.slips.reduce((s, x) => s + x.assessment.esi, 0)],
                ["Professional Tax withheld", published.slips.reduce((s, x) => s + x.assessment.pt, 0)],
                ["TDS withheld", published.slips.reduce((s, x) => s + x.assessment.tds, 0)],
              ] as [string, number][]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-2">
                <dt>{k}</dt>
                <dd className="num font-semibold">{rupees(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1 rounded-lg bg-white p-1 ring-1 ring-line sm:inline-flex" role="group" aria-label="Filter rows">
        {FILTERS.map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-[15px] ${filter === f ? "bg-indigo text-white" : "text-muted hover:text-ink"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {visible.map(({ e, row, review, status, net }) => {
          const isOpen = open === e.id;
          const slip = published?.slips.find((s) => s.employeeId === e.id);
          const shownNet = slip ? slip.net : net;
          return (
            <li key={e.id} className="rounded-xl bg-white ring-1 ring-line">
              <button
                className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 text-left sm:grid-cols-[1fr_8rem_8rem_9rem]"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : e.id)}
              >
                <span>
                  <span className="font-semibold">{e.name}</span>{" "}
                  <span className="text-[13px] text-muted">
                    {e.code}, {e.state}
                  </span>
                </span>
                <span className="num hidden text-right sm:block">
                  <span className="block text-[12px] text-muted">Gross</span>
                  {indian(row.gross)}
                </span>
                <span className="num hidden text-right sm:block">
                  <span className="block text-[12px] text-muted">Net</span>
                  {shownNet === null ? <span className="text-muted">–</span> : indian(shownNet)}
                </span>
                <span className="flex items-center justify-end gap-2">
                  <Pill tone={TONE[status]}>{status}</Pill>
                  <span aria-hidden className="text-muted">
                    {isOpen ? "▾" : "▸"}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-line px-5 py-5">
                  <Statement e={e} row={
                      slip
                        ? {
                            ...row,
                            lines: slip.lines,
                            gross: slip.gross,
                            pf: slip.pf,
                            payableDays: slip.payableDays,
                            pfBasis: slip.lines.reduce((s, l) => s + (l.pfWage ? l.earned : 0), 0),
                          }
                        : row
                    } assessment={slip?.assessment ?? (status === "Reviewed" ? review : undefined)} />
                  {!published && (
                    <>
                      {row.issues.map((i) => (
                        <p key={i.text} className="mt-3 rounded-lg bg-sindoor-soft px-4 py-2 text-[15px] text-sindoor">
                          {i.text}.{" "}
                          {i.to && (
                            <Link className="font-semibold underline" to={i.to}>
                              Go there
                            </Link>
                          )}
                        </p>
                      ))}
                      {status === "Inputs changed" && (
                        <p className="mt-3 rounded-lg bg-haldi-soft px-4 py-2 text-[15px] text-[#8a5a00]">
                          Earnings changed after this row was reviewed. Review the deductions again.
                        </p>
                      )}
                      {row.missingPunches.length > 0 && (
                        <p className="mt-3 rounded-lg bg-paper px-4 py-2 text-[15px]">
                          <strong>Missing or incomplete punches:</strong> {row.missingPunches.map(fmtShort).join(", ")}. These days are paid unless covered
                          by approved unpaid leave.
                        </p>
                      )}
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <SalaryEditor key={"s" + row.hash} e={e} />
                        {row.issues.length === 0 ? (
                          <ReviewForm key={"r" + row.hash + (review?.hash ?? "")} e={e} row={row} existing={review} />
                        ) : (
                          <p className="self-start rounded-xl border border-dashed border-line px-4 py-6 text-center text-[15px] text-muted">
                            The deduction review opens once nothing is blocking this row.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[13px] text-muted">
        Employee PF follows {PF_RULE.version}: {PF_RULE.basisPoints / 100}% of PF wages, capped at {rupees(PF_RULE.ceiling)}. Other figures are
        illustrative sample values.
      </p>
    </>
  );
}

function Statement({ e, row, assessment }: { e: Employee; row: PayRow; assessment?: Assessment }) {
  return (
    <div className="text-[15px]">
      <p className="text-muted">
        {row.payableDays} payable of {row.calendarDays} calendar days.
        {row.joinedThisMonth && ` Joined ${fmtDate(e.joined)}.`}
        {row.unpaid.length > 0 && ` Loss of pay on ${row.unpaid.map(fmtShort).join(", ")}.`}
      </p>
      <table className="num mt-2 w-full text-[15px]">
        <tbody className="divide-y divide-line">
          {row.lines.map((l) => (
            <tr key={l.name}>
              <td className="py-1.5">
                {l.name}
                {l.pfWage && <span className="ml-2 text-[12px] text-indigo">PF wage</span>}
              </td>
              <td className="py-1.5 text-right text-muted">
                {indian(l.monthly)} × {row.payableDays}/{row.calendarDays}
              </td>
              <td className="w-28 py-1.5 text-right">{indian(l.earned)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-1.5">Gross earnings</td>
            <td />
            <td className="py-1.5 text-right">{rupees(row.gross)}</td>
          </tr>
          <tr>
            <td className="py-1.5">Employee PF</td>
            <td className="py-1.5 text-right text-muted">
              {PF_RULE.basisPoints / 100}% × {indian(Math.min(row.pfBasis, PF_RULE.ceiling))}
            </td>
            <td className="py-1.5 text-right">− {indian(row.pf)}</td>
          </tr>
          {assessment &&
            DEDUCTION_KEYS.map((k) => (
              <tr key={k}>
                <td className="py-1.5">{DEDUCTION_LABEL[k]}</td>
                <td className="py-1.5 text-right text-[13px] text-muted">{k === "esi" ? assessment.reference : ""}</td>
                <td className="py-1.5 text-right">− {indian(assessment[k])}</td>
              </tr>
            ))}
          {assessment && (
            <tr className="text-[17px] font-bold">
              <td className="py-2">Net pay</td>
              <td />
              <td className="py-2 text-right text-indigo-deep">{rupees(row.gross - totalDeductions(row.pf, assessment))}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SalaryEditor({ e }: { e: Employee }) {
  const { salaries, setSalary } = useDemo();
  const [lines, setLines] = useState<SalaryComponent[]>(salaries[e.id] ?? defaultComponents(e));
  const update = (i: number, patch: Partial<SalaryComponent>) => setLines(lines.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const names = lines.map((l) => l.name.trim().toLowerCase());
  const error = lines.some((l) => !l.name.trim() || !(l.monthly > 0))
    ? "Every component needs a name and a monthly amount."
    : new Set(names).size !== names.length
      ? "Component names must be unique."
      : "";
  return (
    <details className="self-start rounded-xl ring-1 ring-line">
      <summary className="cursor-pointer px-4 py-3 font-semibold">Salary structure</summary>
      <form
        className="space-y-3 px-4 pb-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!error) setSalary(e.id, lines.map((l) => ({ ...l, name: l.name.trim() })));
        }}
      >
        <p className="text-[14px] text-muted">Monthly amounts. Saving recalculates the row, so a saved review must be redone.</p>
        {lines.map((l, i) => (
          <fieldset key={i} className="grid grid-cols-[1fr_7rem] gap-2 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
            <legend className="sr-only">Component {i + 1}</legend>
            <label className="text-[14px] font-semibold">
              Name
              <input
                value={l.name}
                maxLength={60}
                onChange={(ev) => update(i, { name: ev.target.value })}
                className="mt-1 block w-full rounded-lg border border-line px-2 py-1.5 font-normal"
              />
            </label>
            <label className="text-[14px] font-semibold">
              ₹ / month
              <input
                type="number"
                min={1}
                value={l.monthly || ""}
                onChange={(ev) => update(i, { monthly: Number(ev.target.value) })}
                className="num mt-1 block w-full rounded-lg border border-line px-2 py-1.5 font-normal"
              />
            </label>
            <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:pb-1.5">
              <label className="flex items-center gap-1.5 text-[14px]">
                <input type="checkbox" checked={l.pfWage} onChange={(ev) => update(i, { pfWage: ev.target.checked })} className="accent-indigo" />
                PF wage
              </label>
              {lines.length > 1 && (
                <button type="button" className="text-[14px] font-semibold text-sindoor" onClick={() => setLines(lines.filter((_, n) => n !== i))}>
                  Remove
                </button>
              )}
            </div>
          </fieldset>
        ))}
        {error && <p className="text-[14px] text-sindoor">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => setLines([...lines, { name: "", monthly: 0, pfWage: false }])}>
            Add component
          </Button>
          <Button type="submit" disabled={!!error}>
            Save salary structure
          </Button>
        </div>
      </form>
    </details>
  );
}

function ReviewForm({ e, row, existing }: { e: Employee; row: PayRow; existing?: Assessment }) {
  const { saveReview } = useDemo();
  const [vals, setVals] = useState<Record<(typeof DEDUCTION_KEYS)[number], string>>(() =>
    Object.fromEntries(DEDUCTION_KEYS.map((k) => [k, existing ? String(existing[k]) : ""])) as never,
  );
  const [reference, setReference] = useState(existing?.reference ?? "");
  const [checked, setChecked] = useState(false);
  const amounts = Object.fromEntries(DEDUCTION_KEYS.map((k) => [k, Number(vals[k])])) as Record<(typeof DEDUCTION_KEYS)[number], number>;
  const filled = DEDUCTION_KEYS.every((k) => vals[k] !== "" && amounts[k] >= 0);
  const over = filled && totalDeductions(row.pf, { ...amounts, reference }) > row.gross;
  const valid = filled && !over && reference.trim().length >= 3 && checked;

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (valid) saveReview(e.id, { ...amounts, reference: reference.trim(), hash: row.hash });
  };

  return (
    <details open={!existing} className="self-start rounded-xl ring-1 ring-line">
      <summary className="cursor-pointer px-4 py-3 font-semibold">{existing ? "Edit deduction review" : "Review deductions"}</summary>
      <form className="space-y-3 px-4 pb-4" onSubmit={submit}>
        <p className="text-[14px] text-muted">Enter employee deductions from the assessed worksheet, in rupees. Enter 0 only for a verified zero.</p>
        <div className="grid grid-cols-2 gap-3">
          {DEDUCTION_KEYS.map((k) => (
            <label key={k} className="text-[14px] font-semibold">
              {DEDUCTION_LABEL[k]}
              <input
                type="number"
                min={0}
                required
                value={vals[k]}
                onChange={(ev) => setVals({ ...vals, [k]: ev.target.value })}
                className="num mt-1 block w-full rounded-lg border border-line px-2 py-1.5 font-normal"
              />
            </label>
          ))}
        </div>
        <label className="block text-[14px] font-semibold">
          Assessment reference (shown on the payslip)
          <input
            value={reference}
            onChange={(ev) => setReference(ev.target.value)}
            maxLength={160}
            placeholder="Worksheet reference, no personal identifiers"
            className="mt-1 block w-full rounded-lg border border-line px-2 py-1.5 font-normal"
          />
        </label>
        <button
          type="button"
          className="text-[14px] font-semibold text-indigo hover:underline"
          onClick={() => {
            setVals(Object.fromEntries(DEDUCTION_KEYS.map((k) => [k, String(row.suggested[k])])) as never);
            setReference(row.suggested.reference);
          }}
        >
          Fill from sample worksheet
        </button>
        <label className="flex items-start gap-2 text-[14px]">
          <input type="checkbox" checked={checked} onChange={(ev) => setChecked(ev.target.checked)} className="mt-1 accent-indigo" />I verified
          attendance exceptions, these amounts, PF wages and standard capped employee PF.
        </label>
        {over && <p className="text-[14px] text-sindoor">Deductions exceed gross earnings of {rupees(row.gross)}.</p>}
        <Button type="submit" disabled={!valid}>
          Save review
        </Button>
      </form>
    </details>
  );
}
