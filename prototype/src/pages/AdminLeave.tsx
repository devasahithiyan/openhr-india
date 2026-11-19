import { useState } from "react";
import { Avatar, Button, PageHeader, Pill, fmtDate, fmtShort, statusTone } from "../components/ui";
import { useDemo } from "../lib/store";
import { empById } from "./AdminOverview";

export function AdminLeave() {
  const { leaves, setLeaveStatus } = useDemo();
  const [tab, setTab] = useState<"Pending" | "All">("Pending");
  const list = tab === "Pending" ? leaves.filter((l) => l.status === "Pending") : leaves;

  return (
    <>
      <PageHeader title="Leave requests" sub="Approve or reject requests from your team. Employees see the decision straight away." />

      <div className="mb-4 inline-flex rounded-lg bg-white p-1 ring-1 ring-line" role="tablist">
        {(["Pending", "All"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-[15px] ${tab === t ? "bg-indigo text-white" : "text-muted hover:text-ink"}`}
          >
            {t === "Pending" ? `Waiting (${leaves.filter((l) => l.status === "Pending").length})` : "All requests"}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-5 py-12 text-center text-muted">
          Nothing waiting. Switch to the employee view and apply for leave to see a request arrive here.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
          {list.map((l) => {
            const e = empById(l.employeeId);
            return (
              <li key={l.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex gap-4">
                  <Avatar name={e.name} />
                  <div>
                    <p className="font-semibold">
                      {e.name} <span className="font-normal text-muted">{e.designation}, {e.branch}</span>
                    </p>
                    <p className="text-[15px]">
                      {l.type} leave for {l.days} {l.days === 1 ? "day" : "days"}, {fmtShort(l.from)}
                      {l.from !== l.to && ` to ${fmtDate(l.to)}`}
                    </p>
                    <p className="text-[14px] text-muted">
                      “{l.reason}” Applied {fmtShort(l.appliedOn)}.
                    </p>
                  </div>
                </div>
                {l.status === "Pending" ? (
                  <div className="flex gap-2 sm:justify-end">
                    <Button variant="danger" onClick={() => setLeaveStatus(l.id, "Rejected")}>
                      Reject
                    </Button>
                    <Button onClick={() => setLeaveStatus(l.id, "Approved")}>Approve</Button>
                  </div>
                ) : (
                  <div className="sm:text-right">
                    <Pill tone={statusTone(l.status)}>{l.status}</Pill>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Policies />
    </>
  );
}

function Policies() {
  const { policies, leaves, addPolicy } = useDemo();
  const [name, setName] = useState("");
  const [year, setYear] = useState(2026);
  const [days, setDays] = useState("");
  const duplicate = policies.some((p) => p.year === year && p.name.toLowerCase() === name.trim().toLowerCase());
  const valid = name.trim() && days !== "" && Number(days) >= 0 && Number(days) <= 366 && !duplicate;

  return (
    <section className="mt-12">
      <h2 className="text-[19px] font-bold">Leave policies</h2>
      <p className="mb-3 text-[15px] text-muted">
        Opening days apply to each employee for the calendar year. Balances update as requests are approved.
      </p>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
          <table className="num w-full min-w-[420px] text-left text-[15px]">
            <thead className="border-b border-line text-[14px] text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Policy</th>
                <th className="px-3 py-3 font-medium">Year</th>
                <th className="px-3 py-3 text-right font-medium">Opening days</th>
                <th className="px-5 py-3 text-right font-medium">Days approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {policies.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-3 font-semibold">{p.name}</td>
                  <td className="px-3 py-3">{p.year}</td>
                  <td className="px-3 py-3 text-right">{p.openingDays}</td>
                  <td className="px-5 py-3 text-right">
                    {leaves
                      .filter((l) => l.type === p.name && l.status === "Approved" && l.from.startsWith(String(p.year)))
                      .reduce((s, l) => s + l.days, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          className="space-y-3 rounded-xl bg-white p-5 ring-1 ring-line"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            addPolicy({ name: name.trim(), year, openingDays: Number(days) });
            setName("");
            setDays("");
          }}
        >
          <p className="font-semibold">Add a policy</p>
          <label className="block text-[15px] font-semibold">
            Policy name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="For example, Bereavement"
              className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[15px] font-semibold">
              Calendar year
              <input
                type="number"
                min={2000}
                max={2200}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
              />
            </label>
            <label className="text-[15px] font-semibold">
              Opening days
              <input
                type="number"
                min={0}
                max={366}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
              />
            </label>
          </div>
          {duplicate && <p className="text-[14px] text-sindoor">A {name.trim()} policy already exists for {year}.</p>}
          <Button type="submit" disabled={!valid}>
            Add policy
          </Button>
        </form>
      </div>
    </section>
  );
}
