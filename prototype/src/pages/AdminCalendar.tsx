import { useState } from "react";
import { Avatar, Button, PageHeader, fmtDate } from "../components/ui";
import { BRANCHES, EMPLOYEES } from "../lib/data";
import { DEMO_TODAY, useDemo } from "../lib/store";
import { WEEKDAY_SHORT, chargeableDays, weekdayOf } from "../lib/time";

const monthFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const empById = new Map(EMPLOYEES.map((e) => [e.id, e]));

function shiftMonth(month: string, by: number) {
  const d = new Date(month + "-01T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + by);
  return d.toISOString().slice(0, 7);
}

export function AdminCalendar() {
  const { leaves, calendars } = useDemo();
  const [month, setMonth] = useState(DEMO_TODAY.slice(0, 7));
  const [branch, setBranch] = useState("All");
  const [selected, setSelected] = useState(DEMO_TODAY);

  const first = new Date(month + "-01T00:00:00Z");
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const branches = branch === "All" ? BRANCHES.map((b) => b.name) : [branch];

  // Approved leave, counted only on days the person's branch actually works.
  const awayOn = (day: string) =>
    leaves.filter((l) => {
      const e = empById.get(l.employeeId);
      if (!e || l.status !== "Approved" || !branches.includes(e.branch)) return false;
      return chargeableDays(l.from, l.to, calendars[e.branch]).includes(day);
    });
  const holidaysOn = (day: string) =>
    branches.flatMap((b) => calendars[b].holidays.filter((h) => h.day === day).map((h) => ({ ...h, branch: b })));
  const isOff = (day: string) => branches.every((b) => !calendars[b].weekdays.includes(weekdayOf(day)));

  const selAway = awayOn(selected);
  const selHolidays = holidaysOn(selected);

  return (
    <>
      <PageHeader title="Team calendar" sub="Approved absences and branch holidays. Weekly offs follow each branch's workweek." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
            ‹
          </Button>
          <h2 className="min-w-44 text-center text-[19px] font-bold" aria-live="polite">
            {monthFmt.format(first)}
          </h2>
          <Button variant="ghost" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
            ›
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-white p-1 ring-1 ring-line" role="group" aria-label="Branch">
          {["All", ...BRANCHES.map((b) => b.name)].map((b) => (
            <button
              key={b}
              aria-pressed={branch === b}
              onClick={() => setBranch(b)}
              className={`rounded-md px-3 py-1.5 text-[15px] ${branch === b ? "bg-indigo text-white" : "text-muted hover:text-ink"}`}
            >
              {b === "All" ? "All branches" : b}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-line">
          <div className="grid grid-cols-7 border-b border-line text-center text-[13px] font-semibold text-muted">
            {WEEKDAY_SHORT.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: first.getUTCDay() }, (_, i) => (
              <div key={"pad" + i} className="min-h-16 border-r border-b border-line/60 bg-paper/60 sm:min-h-24" />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const day = `${month}-${String(i + 1).padStart(2, "0")}`;
              const away = awayOn(day);
              const hols = holidaysOn(day);
              const off = isOff(day);
              const isSel = day === selected;
              return (
                <button
                  key={day}
                  onClick={() => setSelected(day)}
                  aria-pressed={isSel}
                  aria-label={`${fmtDate(day)}: ${hols.length ? hols.map((h) => h.name).join(", ") + ". " : ""}${away.length} away`}
                  className={`flex min-h-16 flex-col items-start gap-0.5 border-r border-b border-line/60 p-1.5 text-left sm:min-h-24 sm:p-2 ${
                    off ? "bg-paper/70" : "bg-white"
                  } ${isSel ? "ring-2 ring-indigo ring-inset" : "hover:bg-indigo-soft/50"}`}
                >
                  <span
                    className={`num text-[14px] font-semibold ${
                      day === DEMO_TODAY ? "rounded-full bg-haldi px-1.5 text-ink" : off ? "text-muted" : "text-ink"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {hols.slice(0, 1).map((h) => (
                    <span key={h.id} className="hidden w-full truncate rounded bg-haldi-soft px-1 text-[12px] text-[#8a5a00] sm:block">
                      {h.name}
                    </span>
                  ))}
                  {away.slice(0, 2).map((l) => (
                    <span key={l.id} className="hidden w-full truncate rounded bg-indigo-soft px-1 text-[12px] text-indigo sm:block">
                      {empById.get(l.employeeId)!.name.split(" ")[0]}
                    </span>
                  ))}
                  {(away.length > 2 || hols.length > 1) && (
                    <span className="hidden text-[12px] text-muted sm:block">+{away.length - 2 > 0 ? away.length - 2 : hols.length - 1} more</span>
                  )}
                  {/* Compact markers on phones */}
                  <span className="flex gap-1 sm:hidden" aria-hidden>
                    {hols.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-haldi" />}
                    {away.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-indigo" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-xl bg-white p-5 ring-1 ring-line">
          <h3 className="text-[17px] font-bold">{fmtDate(selected)}</h3>
          <p className="text-[14px] text-muted">
            {isOff(selected) ? "Weekly off" : selected === DEMO_TODAY ? "Today" : "Working day"}
          </p>
          {selHolidays.length > 0 && (
            <ul className="mt-3 space-y-1">
              {selHolidays.map((h) => (
                <li key={h.id} className="rounded-lg bg-haldi-soft px-3 py-2 text-[15px]">
                  <strong>{h.name}</strong> <span className="text-muted">({h.branch})</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 mb-2 text-[15px] font-semibold">
            {selAway.length === 0 ? "No one is on approved leave." : `${selAway.length} on approved leave`}
          </p>
          <ul className="space-y-2">
            {selAway.map((l) => {
              const e = empById.get(l.employeeId)!;
              return (
                <li key={l.id} className="flex items-center gap-3">
                  <Avatar name={e.name} size="sm" />
                  <span className="text-[15px] leading-tight">
                    {e.name}
                    <span className="block text-[13px] text-muted">
                      {l.type} leave, {e.branch}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <BranchSettings />
    </>
  );
}

function BranchSettings() {
  const { calendars, setWorkweek, addHoliday, removeHoliday } = useDemo();
  const [branch, setBranch] = useState(BRANCHES[0].name);
  const cal = calendars[branch];
  const [name, setName] = useState("");
  const [day, setDay] = useState("");
  const [saved, setSaved] = useState("");

  return (
    <section className="mt-12">
      <h2 className="text-[19px] font-bold">Branch calendar</h2>
      <p className="mb-3 text-[15px] text-muted">
        Working days and holidays decide which days count against leave, and appear on everyone's calendar.
      </p>
      <label className="mb-4 block max-w-xs text-[15px] font-semibold">
        Branch
        <select
          value={branch}
          onChange={(e) => {
            setBranch(e.target.value);
            setSaved("");
          }}
          className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 font-normal"
        >
          {BRANCHES.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}, {b.state}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-6 lg:grid-cols-2">
        <fieldset className="rounded-xl bg-white p-5 ring-1 ring-line">
          <legend className="sr-only">Working days</legend>
          <p className="mb-3 font-semibold">Working days</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_SHORT.map((d, i) => {
              const on = cal.weekdays.includes(i);
              return (
                <label
                  key={d}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-[15px] ring-1 ${
                    on ? "bg-indigo-soft font-semibold text-indigo ring-indigo" : "ring-line"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => {
                      const next = on ? cal.weekdays.filter((x) => x !== i) : [...cal.weekdays, i];
                      if (next.length === 0) return;
                      setWorkweek(branch, next);
                      setSaved(`${branch} workweek saved.`);
                    }}
                  />
                  {d}
                </label>
              );
            })}
          </div>
          <p className="mt-3 text-[14px] text-muted" role="status">
            {saved || `${cal.weekdays.length}-day week. At least one working day is required.`}
          </p>
        </fieldset>

        <div className="rounded-xl bg-white p-5 ring-1 ring-line">
          <p className="mb-3 font-semibold">Holidays</p>
          <form
            className="mb-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !day) return;
              addHoliday(branch, day, name.trim());
              setSaved(`${name.trim()} added for ${branch}.`);
              setName("");
              setDay("");
            }}
          >
            <label className="text-[15px] font-semibold">
              Holiday name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
              />
            </label>
            <label className="text-[15px] font-semibold">
              Date
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-line px-3 py-2 font-normal"
              />
            </label>
            <Button type="submit" disabled={!name.trim() || !day}>
              Save holiday
            </Button>
          </form>
          <ul className="divide-y divide-line border-y border-line">
            {cal.holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-[15px]">
                <span>
                  <span className="num inline-block w-28 font-semibold">{fmtDate(h.day)}</span> {h.name}
                </span>
                <button
                  className="text-[14px] font-semibold text-sindoor hover:underline"
                  onClick={() => {
                    removeHoliday(branch, h.id);
                    setSaved(`${h.name} removed from ${branch}.`);
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
            {cal.holidays.length === 0 && <li className="py-3 text-muted">No holidays yet. Add one above.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
