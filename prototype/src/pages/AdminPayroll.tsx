import { Button, PageHeader, Section } from "../components/ui";
import { BRANCHES, EMPLOYEES, PAYROLL_MONTH } from "../lib/data";
import { computePayslip, indian, rupees } from "../lib/payroll";
import { useDemo, type PayrollStage } from "../lib/store";

const STEPS: { id: PayrollStage; label: string; detail: string }[] = [
  { id: "review", label: "Review inputs", detail: "Attendance, leave and new joiners" },
  { id: "calculated", label: "Calculate", detail: "Earnings, PF, ESI, PT and TDS" },
  { id: "approved", label: "Approve", detail: "Lock payroll for the month" },
  { id: "paid", label: "Pay and file", detail: "Bank transfer file and challans" },
];

export function AdminPayroll() {
  const { payrollStage, setPayrollStage, leaves } = useDemo();
  const stageIdx = STEPS.findIndex((s) => s.id === payrollStage);
  const rows = EMPLOYEES.map((e) => ({ e, p: computePayslip(e, PAYROLL_MONTH.month) }));
  const sum = (k: keyof ReturnType<typeof computePayslip>) => rows.reduce((s, r) => s + r.p[k], 0);
  const showNumbers = stageIdx >= 1;
  const pendingLeaves = leaves.filter((l) => l.status === "Pending").length;

  const downloadBankFile = () => {
    const header = "Employee code,Name,Bank,Account,IFSC,Net pay\n";
    const body = rows
      .map(({ e, p }) => `${e.code},${e.name},${e.bank},XXXXXX${e.accountLast4},${e.ifsc},${p.net}`)
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "kaveri-salary-transfer-nov-2026-SAMPLE.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const next: Record<PayrollStage, { label: string; to: PayrollStage } | null> = {
    review: { label: "Calculate payroll", to: "calculated" },
    calculated: { label: "Approve and lock", to: "approved" },
    approved: { label: "Mark salaries as paid", to: "paid" },
    paid: null,
  };
  const action = next[payrollStage];

  return (
    <>
      <PageHeader
        title={`Payroll for ${PAYROLL_MONTH.label}`}
        sub={`${EMPLOYEES.length} employees in ${BRANCHES.length} states. Pay date 30 November.`}
        action={
          <div className="flex gap-2">
            {stageIdx > 0 && payrollStage !== "paid" && (
              <Button variant="ghost" onClick={() => setPayrollStage(STEPS[stageIdx - 1].id)}>
                Go back
              </Button>
            )}
            {action && (
              <Button onClick={() => setPayrollStage(action.to)}>
                {action.label}
              </Button>
            )}
            {payrollStage === "paid" && (
              <span className="stamp mr-3 inline-flex items-center rounded-md border-[3px] border-leaf px-3 text-[20px] font-extrabold tracking-wide text-leaf">
                PAID 30 NOV
              </span>
            )}
            {payrollStage === "paid" && (
              <Button variant="ghost" onClick={() => setPayrollStage("review")}>
                Run again
              </Button>
            )}
          </div>
        }
      />

      <ol className="mb-8 grid gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const done = i < stageIdx || payrollStage === "paid";
          const current = i === stageIdx && payrollStage !== "paid";
          return (
            <li
              key={s.id}
              aria-current={current ? "step" : undefined}
              className={`rounded-lg border-t-4 bg-white px-4 py-3 ring-1 ring-line ${
                done ? "border-t-leaf" : current ? "border-t-haldi" : "border-t-line"
              }`}
            >
              <p className="text-[13px] text-muted">
                Step {i + 1} {done ? "done" : current ? "in progress" : ""}
              </p>
              <p className="font-semibold">{s.label}</p>
              <p className="text-[14px] text-muted">{s.detail}</p>
            </li>
          );
        })}
      </ol>

      {payrollStage === "review" && (
        <div className="mb-8 rounded-xl bg-white px-5 py-4 ring-1 ring-line">
          <p className="font-semibold">Before you calculate</p>
          <ul className="mt-2 space-y-1 text-[15px] text-muted">
            <li>Attendance is synced for 1–30 November. No loss-of-pay days this month.</li>
            <li>
              {pendingLeaves > 0
                ? `${pendingLeaves} leave ${pendingLeaves === 1 ? "request is" : "requests are"} still waiting. Approved leave is paid, so this won't change pay.`
                : "All leave requests are decided."}
            </li>
            <li>One new joiner since last month: Vikram Gowda, Bengaluru (prorated from 13 October, now full month).</li>
          </ul>
        </div>
      )}

      <div>
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
          <table className="num w-full min-w-[860px] text-[15px]">
            <thead className="border-b border-line text-right text-[14px] text-muted">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Employee</th>
                <th className="px-3 py-3 text-left font-medium">State</th>
                <th className="px-3 py-3 font-medium">Gross</th>
                <th className="px-3 py-3 font-medium">PF</th>
                <th className="px-3 py-3 font-medium">ESI</th>
                <th className="px-3 py-3 font-medium">PT</th>
                <th className="px-3 py-3 font-medium">TDS</th>
                <th className="px-5 py-3 font-medium">Net pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-right">
              {rows.map(({ e, p }) => (
                <tr key={e.id}>
                  <td className="px-5 py-2.5 text-left">
                    <span className="font-medium">{e.name}</span> <span className="text-[13px] text-muted">{e.code}</span>
                  </td>
                  <td className="px-3 py-2.5 text-left text-muted">{e.state}</td>
                  <td className="px-3 py-2.5">{indian(p.gross)}</td>
                  {showNumbers ? (
                    <>
                      <td className="px-3 py-2.5">{indian(p.pf)}</td>
                      <td className="px-3 py-2.5">{p.esi ? indian(p.esi) : <span className="text-muted">–</span>}</td>
                      <td className="px-3 py-2.5">{p.pt ? indian(p.pt) : <span className="text-muted">–</span>}</td>
                      <td className="px-3 py-2.5">{p.tds ? indian(p.tds) : <span className="text-muted">–</span>}</td>
                      <td className="px-5 py-2.5 font-semibold">{indian(p.net)}</td>
                    </>
                  ) : (
                    <td colSpan={5} className="px-5 py-2.5 text-center text-[14px] text-muted">
                      Calculated in the next step
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {showNumbers && (
              <tfoot className="border-t-2 border-ink/80 text-right font-bold">
                <tr>
                  <td className="px-5 py-3 text-left" colSpan={2}>
                    Total
                  </td>
                  <td className="px-3 py-3">{indian(sum("gross"))}</td>
                  <td className="px-3 py-3">{indian(sum("pf"))}</td>
                  <td className="px-3 py-3">{indian(sum("esi"))}</td>
                  <td className="px-3 py-3">{indian(sum("pt"))}</td>
                  <td className="px-3 py-3">{indian(sum("tds"))}</td>
                  <td className="px-5 py-3">{indian(sum("net"))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showNumbers && (
        <div className="mt-10 grid gap-x-10 lg:grid-cols-2">
          <Section title="What you'll deposit">
            <dl className="divide-y divide-line rounded-xl bg-white text-[15px] ring-1 ring-line">
              {[
                ["PF to EPFO", sum("pf") + sum("employerPf"), "Employee 12% plus employer 12%, due 15 Dec"],
                ["ESI to ESIC", sum("esi") + sum("employerEsi"), "Employee 0.75% plus employer 3.25%, due 15 Dec"],
                ["TDS to Income Tax Dept.", sum("tds"), "Challan ITNS 281, due 7 Dec"],
                ["Professional Tax", sum("pt"), "Tamil Nadu, Karnataka and Maharashtra"],
              ].map(([k, v, note]) => (
                <div key={k as string} className="flex items-start justify-between gap-4 px-5 py-3">
                  <dt>
                    <span className="font-semibold">{k}</span>
                    <span className="block text-[14px] text-muted">{note}</span>
                  </dt>
                  <dd className="num font-semibold">{rupees(v as number)}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <Section title="Pay employees">
            <div className="rounded-xl bg-white px-5 py-5 ring-1 ring-line">
              <p className="text-[15px] text-muted">Net salary to transfer</p>
              <p className="num text-[32px] font-extrabold text-indigo-deep">{rupees(sum("net"))}</p>
              <p className="mt-1 text-[15px] text-muted">
                {stageIdx >= 2
                  ? "Payroll is locked. Download the bank file to upload to your bank's bulk payment portal."
                  : "Approve and lock payroll to generate the bank transfer file."}
              </p>
              <Button className="mt-4" variant="accent" disabled={stageIdx < 2} onClick={downloadBankFile}>
                Download bank file (sample CSV)
              </Button>
            </div>
          </Section>
        </div>
      )}
    </>
  );
}
