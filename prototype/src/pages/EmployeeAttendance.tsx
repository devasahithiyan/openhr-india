import { useState, type FormEvent } from "react";
import { Button, PageHeader, Pill, Section, fmtDate, fmtDay, statusTone } from "../components/ui";
import { DEMO_TODAY, useDemo, useMe } from "../lib/store";
import { clock, duration, eachDay, nowIST } from "../lib/time";

export function EmployeeAttendance() {
  const me = useMe();
  const { attendance, corrections, calendars, leaves, clock: punch, requestCorrection } = useDemo();
  const cal = calendars[me.branch];
  const today = attendance.find((a) => a.employeeId === me.id && a.day === DEMO_TODAY);
  const mine = corrections.filter((c) => c.employeeId === me.id);

  const week = eachDay("2026-11-16", DEMO_TODAY).reverse();

  const [day, setDay] = useState("2026-11-18");
  const [inT, setIn] = useState("09:00");
  const [outT, setOut] = useState("18:00");
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const error = outT <= inT ? "Check-out must be after check-in." : day > DEMO_TODAY ? "You can only correct past days." : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (error || !reason.trim()) return;
    requestCorrection({ day, checkIn: inT, checkOut: outT, reason: reason.trim() });
    setReason("");
    setSent(true);
  };

  const state = today ? (today.checkOut ? "Day completed" : "Checked in") : "Ready to check in";

  return (
    <>
      <PageHeader title="Attendance" sub={`${me.branch} branch. Times are India Standard Time.`} />

      <div className="grid gap-x-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Section title="Today">
            <div className="rounded-xl bg-white p-6 ring-1 ring-line">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden
                  className={`grid h-14 w-14 place-items-center rounded-full ring-4 ${
                    today && !today.checkOut ? "bg-leaf-soft ring-leaf/30" : today ? "bg-indigo-soft ring-indigo/20" : "bg-haldi-soft ring-haldi/30"
                  }`}
                >
                  <span className={`h-3 w-3 rounded-full ${today && !today.checkOut ? "bg-leaf" : today ? "bg-indigo" : "bg-haldi"}`} />
                </span>
                <div>
                  <p className="text-[20px] font-bold" role="status">
                    {state}
                  </p>
                  <p className="text-[15px] text-muted">
                    {today
                      ? `In at ${clock(today.checkIn)}${today.checkOut ? `, out at ${clock(today.checkOut)} (${duration(today.checkIn, today.checkOut)})` : ""}`
                      : `${fmtDay(DEMO_TODAY)}, ${fmtDate(DEMO_TODAY)}`}
                  </p>
                </div>
              </div>
              <Button className="mt-5 w-full" disabled={!!today?.checkOut} onClick={() => punch(nowIST())}>
                {today ? (today.checkOut ? "Checked out for today" : "Check out") : "Check in"}
              </Button>
              <p className="mt-2 text-[13px] text-muted">The demo uses your current time in India for the punch.</p>
            </div>
          </Section>

          <Section title="This week">
            <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
              {week.map((d) => {
                const a = attendance.find((x) => x.employeeId === me.id && x.day === d);
                const leave = leaves.find((l) => l.employeeId === me.id && l.status === "Approved" && l.from <= d && l.to >= d);
                const hol = cal.holidays.find((h) => h.day === d);
                return (
                  <li key={d} className="flex items-center justify-between gap-3 px-5 py-3 text-[15px]">
                    <span>
                      <span className="font-semibold">{fmtDay(d)}</span> <span className="text-muted">{fmtDate(d)}</span>
                    </span>
                    <span className="num text-right">
                      {a ? (
                        a.checkOut ? (
                          `${clock(a.checkIn)} to ${clock(a.checkOut)}`
                        ) : (
                          `${clock(a.checkIn)}, open`
                        )
                      ) : leave ? (
                        <Pill tone="warn">On leave</Pill>
                      ) : hol ? (
                        <Pill>{hol.name}</Pill>
                      ) : (
                        <span className="text-muted">No punch</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <div>
          <Section title="Correct an entry">
            <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-5 ring-1 ring-line">
              <p className="text-[15px] text-muted">Missed a punch or punched at the wrong time? Your manager reviews corrections.</p>
              <label className="block text-[15px] font-semibold">
                Work date
                <input
                  type="date"
                  value={day}
                  max={DEMO_TODAY}
                  onChange={(e) => setDay(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[15px] font-semibold">
                  Check-in
                  <input
                    type="time"
                    value={inT}
                    onChange={(e) => setIn(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
                  />
                </label>
                <label className="text-[15px] font-semibold">
                  Check-out
                  <input
                    type="time"
                    value={outT}
                    onChange={(e) => setOut(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
                  />
                </label>
              </div>
              <label className="block text-[15px] font-semibold">
                Reason for correction
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                  required
                  placeholder="For example, biometric reader was down at the gate"
                  className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={`text-[15px] ${error ? "text-sindoor" : "text-muted"}`} role="status">
                  {error || (inT && outT ? `${duration(inT, outT)} worked` : "")}
                </p>
                <Button type="submit" disabled={!!error || !reason.trim()}>
                  Request correction
                </Button>
              </div>
              {sent && (
                <p className="rounded-lg bg-leaf-soft px-4 py-3 text-[15px] text-leaf">
                  Correction requested. Switch to the HR admin view and open Attendance to approve it.
                </p>
              )}
            </form>
          </Section>

          <Section title="Your corrections">
            {mine.length === 0 ? (
              <p className="text-muted">No correction requests yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl bg-white ring-1 ring-line">
                {mine.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-4 px-5 py-3">
                    <div>
                      <p className="font-semibold">
                        {fmtDate(c.day)}: {clock(c.checkIn)} to {clock(c.checkOut)}
                      </p>
                      <p className="text-[14px] text-muted">{c.reason}</p>
                    </div>
                    <Pill tone={statusTone(c.status)}>{c.status}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
