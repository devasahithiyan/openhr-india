import { useState } from "react";
import { Avatar, Button, PageHeader, Pill, fmtDate, fmtShort, statusTone } from "../components/ui";
import { EMPLOYEES } from "../lib/data";
import { DEMO_TODAY, useDemo } from "../lib/store";
import { chargeableDays, clock, duration, weekdayOf } from "../lib/time";

type Row = {
  id: string;
  name: string;
  branch: string;
  status: "Present" | "Checked in" | "On leave" | "Holiday" | "Weekly off" | "No punch";
  checkIn?: string;
  checkOut?: string;
};

const tone = (s: Row["status"]) =>
  s === "Present" ? "good" : s === "Checked in" ? "info" : s === "No punch" ? "bad" : s === "On leave" ? "warn" : "neutral";

export function AdminAttendance() {
  const { attendance, leaves, calendars, corrections, setCorrectionStatus } = useDemo();
  const [day, setDay] = useState(DEMO_TODAY);
  const [showAll, setShowAll] = useState(false);

  const rows: Row[] = EMPLOYEES.map((e) => {
    const cal = calendars[e.branch];
    const entry = attendance.find((a) => a.employeeId === e.id && a.day === day);
    const onLeave = leaves.some(
      (l) => l.employeeId === e.id && l.status === "Approved" && chargeableDays(l.from, l.to, cal).includes(day),
    );
    const base = { id: e.id, name: e.name, branch: e.branch };
    if (entry) return { ...base, status: entry.checkOut ? "Present" : "Checked in", checkIn: entry.checkIn, checkOut: entry.checkOut };
    if (onLeave) return { ...base, status: "On leave" };
    if (cal.holidays.some((h) => h.day === day)) return { ...base, status: "Holiday" };
    if (!cal.weekdays.includes(weekdayOf(day))) return { ...base, status: "Weekly off" };
    return { ...base, status: "No punch" };
  });

  const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;
  const figures: [string, number][] = [
    ["Present", count("Present") + count("Checked in")],
    ["On leave", count("On leave")],
    ["No punch", count("No punch")],
  ];
  const pending = corrections.filter((c) => c.status === "Pending");
  const list = showAll ? corrections : pending;

  return (
    <>
      <PageHeader
        title="Attendance"
        sub="Daily punches in India Standard Time. Approved leave, holidays and weekly offs are filled in automatically."
        action={
          <label className="text-[15px] font-semibold">
            Date
            <input
              type="date"
              value={day}
              max={DEMO_TODAY}
              onChange={(e) => e.target.value && setDay(e.target.value)}
              className="ml-2 rounded-lg border border-line bg-white px-3 py-2 font-normal"
            />
          </label>
        }
      />

      <dl className="mb-6 grid grid-cols-3 rounded-xl bg-white ring-1 ring-line sm:divide-x sm:divide-line">
        {figures.map(([k, v]) => (
          <div key={k} className="px-5 py-4">
            <dt className="text-[14px] text-muted">{k}</dt>
            <dd className={`num text-[26px] leading-tight font-bold ${k === "No punch" && v > 0 ? "text-sindoor" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-line">
        <table className="num w-full min-w-[640px] text-left text-[15px]">
          <caption className="sr-only">Attendance register for {fmtDate(day)}</caption>
          <thead className="border-b border-line text-[14px] text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Employee</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">In</th>
              <th className="px-3 py-3 font-medium">Out</th>
              <th className="px-5 py-3 text-right font-medium">Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-2.5">
                  <span className="font-medium">{r.name}</span> <span className="text-[13px] text-muted">{r.branch}</span>
                </td>
                <td className="px-3 py-2.5">
                  <Pill tone={tone(r.status)}>{r.status}</Pill>
                </td>
                <td className="px-3 py-2.5">{r.checkIn ? clock(r.checkIn) : <span className="text-muted">–</span>}</td>
                <td className="px-3 py-2.5">
                  {r.checkOut ? clock(r.checkOut) : r.checkIn ? <span className="text-muted">Open</span> : <span className="text-muted">–</span>}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {r.checkIn && r.checkOut ? duration(r.checkIn, r.checkOut) : <span className="text-muted">–</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-12">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[19px] font-bold">Correction requests</h2>
          <button className="text-[15px] font-semibold text-indigo hover:underline" onClick={() => setShowAll(!showAll)} aria-pressed={showAll}>
            {showAll ? "Show awaiting review" : "Show full history"}
          </button>
        </div>
        {list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-5 py-8 text-center text-muted">
            No corrections awaiting review. Switch to the employee view and request one to see it arrive here.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
            {list.map((c) => {
              const e = EMPLOYEES.find((x) => x.id === c.employeeId)!;
              return (
                <li key={c.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex gap-4">
                    <Avatar name={e.name} />
                    <div>
                      <p className="font-semibold">
                        {e.name} <span className="font-normal text-muted">{e.branch}</span>
                      </p>
                      <p className="text-[15px]">
                        {fmtDate(c.day)}: {clock(c.checkIn)} to {clock(c.checkOut)} ({duration(c.checkIn, c.checkOut)})
                      </p>
                      <p className="text-[14px] text-muted">
                        “{c.reason}” Requested {fmtShort(c.appliedOn)}.
                      </p>
                    </div>
                  </div>
                  {c.status === "Pending" ? (
                    <div className="flex gap-2 sm:justify-end">
                      <Button variant="danger" onClick={() => setCorrectionStatus(c.id, "Rejected")}>
                        Reject
                      </Button>
                      <Button onClick={() => setCorrectionStatus(c.id, "Approved")}>Approve</Button>
                    </div>
                  ) : (
                    <div className="sm:text-right">
                      <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[14px] text-muted">Approving a correction replaces that day's punches in the register.</p>
      </section>
    </>
  );
}
