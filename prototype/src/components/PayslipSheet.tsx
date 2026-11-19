import { COMPANY, type Employee } from "../lib/data";
import { computePayslip, inWords, indian, rupees } from "../lib/payroll";
import { PF_RULE, type PublishedSlip } from "../lib/payrollRun";
import { fmtDate } from "./ui";

const MONTHS = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * A payslip document. Pass `slip` for a published (frozen) statement from the payroll
 * review; without it, older months are illustrated from the employee's standard pay.
 */
export function PayslipSheet({
  employee,
  month,
  year,
  slip,
}: {
  employee: Employee;
  month: number;
  year: number;
  slip?: PublishedSlip;
}) {
  const est = computePayslip(employee, month);
  const daysInMonth = new Date(year, month, 0).getDate();
  const earnings: [string, number][] = slip
    ? slip.lines.map((l) => [l.name, l.earned])
    : [
        ["Basic", est.basic],
        ["House rent allowance", est.hra],
        ["Special allowance", est.special],
      ];
  const deductions: [string, number][] = slip
    ? [
        ["Provident fund (employee)", slip.pf],
        ["ESI (employee)", slip.assessment.esi],
        ["Professional tax", slip.assessment.pt],
        ["Labour welfare fund", slip.assessment.lwf],
        ["Income tax (TDS)", slip.assessment.tds],
      ]
    : [
        ["Provident fund (employee)", est.pf],
        ["ESI (employee)", est.esi],
        ["Professional tax", est.pt],
        ["Income tax (TDS)", est.tds],
      ];
  const p = slip
    ? { gross: slip.gross, totalDeductions: slip.gross - slip.net, net: slip.net }
    : est;
  const rows = Math.max(earnings.length, deductions.length);

  return (
    <article className="print-sheet relative overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_0_#dcdfea,0_12px_32px_-18px_rgba(30,39,102,0.35)]">
      <div className="h-1.5 bg-indigo" />
      <div className="px-5 py-6 sm:px-9 sm:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="text-[20px] font-bold text-ink">{COMPANY.name}</p>
            <p className="max-w-sm text-[14px] text-muted">{COMPANY.address}</p>
          </div>
          <div className="text-right">
            <p className="text-[14px] text-muted">Payslip for</p>
            <p className="text-[20px] font-bold text-indigo">
              {MONTHS[month]} {year}
            </p>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-line py-5 text-[15px] sm:grid-cols-4">
          {[
            ["Employee", employee.name],
            ["Employee code", employee.code],
            ["Designation", employee.designation],
            ["Date of joining", fmtDate(employee.joined)],
            ["PAN", employee.panMasked],
            ["UAN", employee.uan],
            ["Bank account", `${employee.bank} ••${employee.accountLast4}`],
            ["Paid days", slip ? `${slip.payableDays} of ${slip.calendarDays}` : `${daysInMonth} of ${daysInMonth}`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="overflow-x-auto">
          <table className="num w-full min-w-[520px] text-[15px]">
            <thead>
              <tr className="border-b border-line text-left text-[14px] text-muted">
                <th className="py-3 font-medium">Earnings</th>
                <th className="py-3 pr-6 text-right font-medium">Amount</th>
                <th className="border-l border-line py-3 pl-6 font-medium">Deductions</th>
                <th className="py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i}>
                  <td className="py-1.5">{earnings[i]?.[0]}</td>
                  <td className="py-1.5 pr-6 text-right">{earnings[i] ? indian(earnings[i][1]) : ""}</td>
                  <td className="border-l border-line py-1.5 pl-6">{deductions[i]?.[0]}</td>
                  <td className="py-1.5 text-right">{deductions[i] ? indian(deductions[i][1]) : ""}</td>
                </tr>
              ))}
              <tr className="border-t border-line font-semibold">
                <td className="py-3">Gross earnings</td>
                <td className="py-3 pr-6 text-right">{indian(p.gross)}</td>
                <td className="border-l border-line py-3 pl-6">Total deductions</td>
                <td className="py-3 text-right">{indian(p.totalDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4 rounded-lg bg-indigo-soft px-5 py-4">
          <div>
            <p className="text-[14px] text-muted">Net pay</p>
            <p className="num text-[34px] leading-none font-extrabold text-indigo-deep">{rupees(p.net)}</p>
          </div>
          <p className="max-w-md text-right text-[15px] font-medium text-ink italic">{inWords(p.net)}</p>
        </div>

        <footer className="mt-5 flex flex-wrap justify-between gap-2 text-[13px] text-muted">
          {slip ? (
            <p>
              Employee PF under {PF_RULE.version}. Other deductions from assessment {slip.assessment.reference}.
            </p>
          ) : (
            <p>
              Employer contributions, not deducted from pay: PF {rupees(est.employerPf)}
              {est.employerEsi ? `, ESI ${rupees(est.employerEsi)}` : ""}.
            </p>
          )}
          <p>Tax regime: {employee.regime === "new" ? "New" : "Old"}. This is a computer-generated payslip.</p>
        </footer>
      </div>
    </article>
  );
}
