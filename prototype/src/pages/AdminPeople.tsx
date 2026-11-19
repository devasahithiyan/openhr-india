import { useEffect, useMemo, useState } from "react";
import { Avatar, Button, PageHeader, Pill, fmtDate } from "../components/ui";
import { BRANCHES, EMPLOYEES, type Employee } from "../lib/data";
import { ESI_GROSS_LIMIT, rupees } from "../lib/payroll";
import { empById } from "./AdminOverview";

export function AdminPeople() {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("All");
  const [selected, setSelected] = useState<Employee | null>(null);

  const list = useMemo(
    () =>
      EMPLOYEES.filter(
        (e) =>
          (branch === "All" || e.branch === branch) &&
          `${e.name} ${e.code} ${e.designation} ${e.department}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, branch],
  );

  return (
    <>
      <PageHeader title="People" sub={`${EMPLOYEES.length} employees at Kaveri Textiles`} />

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="flex-1">
          <span className="sr-only">Search people</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, code or role"
            className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-[16px] outline-none focus:border-indigo"
          />
        </label>
        <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 ring-1 ring-line" role="group" aria-label="Filter by branch">
          {["All", ...BRANCHES.map((b) => b.name)].map((b) => (
            <button
              key={b}
              onClick={() => setBranch(b)}
              aria-pressed={branch === b}
              className={`rounded-md px-3 py-1.5 text-[15px] ${branch === b ? "bg-indigo text-white" : "text-muted hover:text-ink"}`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-line text-[14px] text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Department</th>
              <th className="px-3 py-3 font-medium">Branch</th>
              <th className="px-3 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 text-right font-medium">Monthly gross</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((e) => (
              <tr key={e.id} className="cursor-pointer hover:bg-paper" onClick={() => setSelected(e)}>
                <td className="px-5 py-3">
                  <button className="flex items-center gap-3 text-left" onClick={() => setSelected(e)}>
                    <Avatar name={e.name} size="sm" />
                    <span>
                      <span className="block font-semibold">{e.name}</span>
                      <span className="text-[14px] text-muted">
                        {e.code}, {e.designation}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-3">{e.department}</td>
                <td className="px-3 py-3">{e.branch}</td>
                <td className="px-3 py-3">{fmtDate(e.joined)}</td>
                <td className="num px-5 py-3 text-right">{rupees(e.monthlyGross)}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted">
                  No one matches “{q}”. Try a name, employee code or role.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <EmployeeDrawer e={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function EmployeeDrawer({ e, onClose }: { e: Employee; onClose: () => void }) {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const manager = e.managerId ? empById(e.managerId) : null;

  const groups: [string, [string, string][]][] = [
    [
      "Job",
      [
        ["Designation", e.designation],
        ["Department", e.department],
        ["Branch", `${e.branch}, ${e.state}`],
        ["Reports to", manager?.name ?? "Board of directors"],
        ["Date of joining", fmtDate(e.joined)],
        ["Work email", e.email],
      ],
    ],
    [
      "Statutory",
      [
        ["PAN", e.panMasked],
        ["Aadhaar", `XXXX XXXX ${e.aadhaarLast4}`],
        ["UAN (PF)", e.uan],
        ["ESI", e.monthlyGross <= ESI_GROSS_LIMIT ? "Covered" : "Not applicable (gross above ₹21,000)"],
        ["Tax regime", e.regime === "new" ? "New regime" : "Old regime"],
      ],
    ],
    [
      "Pay",
      [
        ["Monthly gross", rupees(e.monthlyGross)],
        ["Annual CTC (approx.)", rupees(e.monthlyGross * 12 + Math.min(e.monthlyGross / 2, 15000) * 0.12 * 12)],
        ["Bank", `${e.bank} ••${e.accountLast4}`],
        ["IFSC", e.ifsc],
      ],
    ],
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={e.name}>
      <button className="absolute inset-0 bg-indigo-deep/40" aria-label="Close" onClick={onClose} tabIndex={-1} />
      <div className="relative h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={e.name} size="lg" />
            <div>
              <h2 className="text-[22px] leading-tight font-bold">{e.name}</h2>
              <p className="text-muted">{e.code}</p>
            </div>
          </div>
          <Button autoFocus variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-3">
          <Pill tone="info">Sensitive IDs are masked</Pill>
        </div>
        {groups.map(([title, rows]) => (
          <section key={title} className="mt-7">
            <h3 className="mb-2 text-[16px] font-bold">{title}</h3>
            <dl className="divide-y divide-line border-y border-line text-[15px]">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="num text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
