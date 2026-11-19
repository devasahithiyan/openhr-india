import { Link } from "react-router-dom";
import { Logo } from "../components/Shells";
import { EMPLOYEES } from "../lib/data";
import { computePayslip, inWords, rupees } from "../lib/payroll";

const priya = EMPLOYEES.find((e) => e.id === "e3")!;
const slip = computePayslip(priya, 10);

export function Landing() {
  return (
    <div className="demo-landing min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <a
          className="text-[15px] font-semibold text-indigo underline-offset-4 hover:underline"
          href="https://github.com/devasahithiyan/openhr-india"
        >
          Source on GitHub
        </a>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-8 sm:pt-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-tight text-ink sm:text-[56px]">
              HR and payroll that already knows PF, ESI and TDS.
            </h1>
            <p className="mt-5 max-w-xl text-[19px] leading-relaxed text-muted">
              OpenHR India is a free, open-source platform for Indian companies. This demo runs on sample data for a
              fictional textile company with offices in Coimbatore, Bengaluru and Pune. Pick a side and click around.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                to="/admin"
                className="group rounded-xl bg-indigo-deep p-5 text-white transition-colors hover:bg-indigo"
              >
                <span className="block text-[20px] font-bold">Open the HR admin view</span>
                <span className="mt-1 block text-[15px] text-white/75">
                  Run November payroll, approve leave and track filings.
                </span>
              </Link>
              <Link
                to="/me"
                className="group rounded-xl border-2 border-indigo-deep bg-white p-5 text-ink transition-colors hover:bg-indigo-soft"
              >
                <span className="block text-[20px] font-bold">Open the employee view</span>
                <span className="mt-1 block text-[15px] text-muted">
                  See a payslip, apply for leave and compare tax regimes.
                </span>
              </Link>
            </div>
            <p className="mt-4 text-[14px] text-muted">
              Changes you make are saved in your browser only. Tax and statutory figures are illustrative.
            </p>
          </div>

          {/* The memorable bit: a real-looking payslip fragment */}
          <figure className="relative">
            <div className="rotate-[1.5deg] rounded-xl border border-line bg-white p-6 shadow-[0_24px_60px_-28px_rgba(30,39,102,0.45)] sm:p-8">
              <div className="flex items-baseline justify-between border-b border-line pb-3">
                <p className="font-bold">Kaveri Textiles Pvt Ltd</p>
                <p className="text-[14px] text-muted">Payslip, October 2026</p>
              </div>
              <dl className="num divide-y divide-line/70 text-[15px]">
                {[
                  ["Gross earnings", slip.gross],
                  ["Provident fund", -slip.pf],
                  ["Professional tax", -slip.pt],
                  ["Income tax (TDS)", -slip.tds],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between py-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className={(v as number) < 0 ? "text-sindoor" : ""}>
                      {(v as number) < 0 ? "− " : ""}
                      {rupees(Math.abs(v as number))}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 rounded-lg bg-indigo-soft px-4 py-3">
                <p className="text-[13px] text-muted">Net pay to Priya Raman</p>
                <p className="num text-[36px] leading-tight font-extrabold text-indigo-deep">{rupees(slip.net)}</p>
                <p className="text-[14px] text-ink italic">{inWords(slip.net)}</p>
              </div>
            </div>
            <figcaption className="mt-5 text-center text-[14px] text-muted">
              Indian number grouping, rupees in words and statutory deductions built in.
            </figcaption>
          </figure>
        </div>

        <section className="mt-20 grid gap-8 border-t border-line pt-10 sm:grid-cols-3">
          {[
            ["Statutory compliance", "PF, ESI, Professional Tax by state, LWF and TDS under the old and new regimes."],
            ["Self-hosted", "Run it on your own server. Employee data stays with you, designed with the DPDP Act in mind."],
            ["Open source", "MIT licensed. HR, payroll and CA folks are as welcome to contribute as developers."],
          ].map(([t, b]) => (
            <div key={t}>
              <h2 className="text-[18px] font-bold">{t}</h2>
              <p className="mt-1 text-[16px] leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
