"use client";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import {
  canManageEmployees,
  chargeableDays,
  type TimeAction,
  type TimeView,
} from "@openhr/shared";
import { useSession } from "./session";
import { api } from "./api";
type Section = "leave" | "attendance" | "calendar";
type Send = (command: TimeAction) => Promise<boolean>;
const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const clock = (v: string) =>
  new Date(v).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="time-sheet">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function values(e: FormEvent<HTMLFormElement>) {
  e.preventDefault();
  return new FormData(e.currentTarget);
}
function value(f: FormData, k: string) {
  return String(f.get(k) ?? "");
}
function Stamp({ status }: { status: string }) {
  return <span className={"stamp stamp-" + status}>{status}</span>;
}
export function TimeWorkspace({ section }: { section: Section }) {
  const user = useSession();
  const [queueOnly, setQueueOnly] = useState(false);
  const [data, setData] = useState<TimeView | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    api<TimeView>(`/time?section=${section}`)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [section]);
  const send: Send = async (command) => {
    if (!user || busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/time", {
        method: "POST",
        headers: { "x-csrf-token": user.csrfToken },
        body: JSON.stringify(command),
      });
      setData(await api<TimeView>(`/time?section=${section}`));
      setMessage("Changes saved.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
      return false;
    } finally {
      setBusy(false);
    }
  };
  if (!data || !user)
    return <p role="status">{error || "Loading workspace…"}</p>;
  const hr = canManageEmployees(user.role),
    review = hr || user.role === "Manager";
  const requests =
    queueOnly && review
      ? data.leaves.filter(
          (r) => r.status === "Pending" && r.employeeId !== user.employeeId,
        )
      : data.leaves;
  const pending = section === "attendance" ? data.corrections : data.leaves;
  return (
    <div className="time-workspace">
      <header className="time-head">
        <div>
          <h1>
            {
              {
                leave: "Leave requests",
                attendance: "Attendance",
                calendar: "Team calendar",
              }[section]
            }
          </h1>
          <p>
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "full",
              timeZone: "Asia/Kolkata",
            }).format(new Date())}
          </p>
        </div>
        {review && section !== "calendar" && (
          <span>
            {
              pending.filter(
                (r) =>
                  r.status === "Pending" && r.employeeId !== user.employeeId,
              ).length
            }{" "}
            awaiting review
          </span>
        )}
      </header>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p role="status" className="save-feedback">
        {message}
      </p>
      <fieldset disabled={busy} className="workspace-grid">
        {section === "leave" && (
          <>
            {user.employeeId && <LeaveForm data={data} send={send} />}
            <Sheet
              title={queueOnly && review ? "Approval queue" : "Request history"}
            >
              {review && (
                <button
                  className="secondary"
                  aria-pressed={queueOnly}
                  onClick={() => setQueueOnly(!queueOnly)}
                >
                  {queueOnly ? "Show full history" : "Show awaiting review"}
                </button>
              )}
              {!requests.length && (
                <p>
                  {queueOnly
                    ? "No requests awaiting review."
                    : "No leave requests yet."}
                </p>
              )}
              {requests.map((r) => (
                <article key={r.id}>
                  <Stamp status={r.status} />
                  <h3>
                    {r.name} · {r.type}
                  </h3>
                  <p>
                    {r.start} to {r.end} · {r.days.length} working days
                  </p>
                  {r.reason && <p>{r.reason}</p>}
                  {r.decider && (
                    <small>
                      {r.decider} · {r.decidedAt?.slice(0, 10)}
                    </small>
                  )}
                  {r.status === "Pending" &&
                    (r.employeeId === user.employeeId ? (
                      <button
                        className="secondary"
                        onClick={() => send({ action: "withdraw", id: r.id })}
                      >
                        Withdraw
                      </button>
                    ) : (
                      review && (
                        <Decision
                          submit={(approve) =>
                            send({ action: "leaveDecision", id: r.id, approve })
                          }
                        />
                      )
                    ))}
                </article>
              ))}
            </Sheet>
            {hr && <Policy data={data} send={send} />}
          </>
        )}
        {section === "calendar" && (
          <>
            <Calendar data={data} />
            {hr && <Schedule data={data} send={send} />}
          </>
        )}
        {section === "attendance" && (
          <Attendance
            data={data}
            send={send}
            own={user.employeeId}
            review={review}
          />
        )}
      </fieldset>
    </div>
  );
}
function Decision({
  submit,
}: {
  submit: (approve: boolean) => Promise<boolean>;
}) {
  return (
    <div className="actions">
      <button onClick={() => submit(true)}>Approve</button>
      <button className="secondary" onClick={() => submit(false)}>
        Reject
      </button>
    </div>
  );
}
function LeaveForm({ data, send }: { data: TimeView; send: Send }) {
  const [start, from] = useState(data.today),
    [end, to] = useState(data.today),
    [selected, choose] = useState("");
  const branch = data.branches.find((b) => b.id === data.branchId),
    types = data.types.filter((t) => t.year === Number(start.slice(0, 4))),
    policy = types.find((t) => t.id === selected) ?? types[0];
  const charged = chargeableDays(
    start,
    end,
    branch?.weekdays ?? [],
    branch?.holidays.map((h) => h.day) ?? [],
  );
  return (
    <Sheet title="Request time off">
      {policy ? (
        <div className="balance">
          <strong>{policy.openingDays - policy.used - policy.pending}</strong>
          <div>
            days available
            <small>
              {policy.name} · {policy.used} taken · {policy.pending} reserved
            </small>
          </div>
        </div>
      ) : (
        <p>Ask HR to configure a leave type for the selected year.</p>
      )}
      <form
        onSubmit={async (e) => {
          const f = values(e);
          if (policy)
            await send({
              action: "apply",
              typeId: policy.id,
              start,
              end,
              reason: value(f, "reason"),
            });
        }}
      >
        <label>
          From
          <input
            type="date"
            required
            value={start}
            onChange={(e) => {
              from(e.target.value);
              if (end < e.target.value) to(e.target.value);
            }}
          />
        </label>
        <label>
          Through
          <input
            type="date"
            required
            min={start}
            value={end}
            onChange={(e) => to(e.target.value)}
          />
        </label>
        <label>
          Leave type
          <select
            required
            value={policy?.id ?? ""}
            onChange={(e) => choose(e.target.value)}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reason (optional)
          <input name="reason" maxLength={500} />
        </label>
        <p aria-live="polite">{charged.length} chargeable working days</p>
        <button disabled={!policy || !charged.length}>Submit request</button>
      </form>
    </Sheet>
  );
}
function Policy({ data, send }: { data: TimeView; send: Send }) {
  return (
    <Sheet title="Leave policies">
      <p>Opening days apply to each employee for the calendar year.</p>
      {data.types.map((t) => (
        <p key={t.id}>
          {t.name} · {t.year} · {t.openingDays} days ·{" "}
          {t.unpaid ? "Unpaid" : "Paid"}
        </p>
      ))}
      <form
        onSubmit={async (e) => {
          const form = e.currentTarget,
            f = values(e);
          if (
            await send({
              action: "type",
              name: value(f, "name"),
              year: Number(f.get("year")),
              openingDays: Number(f.get("days")),
              unpaid: f.get("unpaid") === "on",
            })
          )
            form.reset();
        }}
      >
        <label>
          Type name
          <input name="name" required maxLength={100} />
        </label>
        <label>
          Calendar year
          <input
            type="number"
            name="year"
            defaultValue={data.today.slice(0, 4)}
            min="2000"
            max="2200"
            required
          />
        </label>
        <label>
          Opening days
          <input type="number" name="days" min="0" max="366" required />
        </label>
        <label>
          <input type="checkbox" name="unpaid" className="w-auto" /> Unpaid
          leave (deduct approved days from payroll)
        </label>
        <button>Add policy</button>
      </form>
    </Sheet>
  );
}
function Calendar({ data }: { data: TimeView }) {
  const [month, setMonth] = useState(data.today.slice(0, 7));
  const first = new Date(month + "-01T00:00:00Z"),
    count = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
  return (
    <Sheet title="Approved absences">
      <label>
        Month
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) setMonth(e.target.value);
          }}
        />
      </label>
      <div className="month-grid">
        {days.map((d) => (
          <b key={d}>{d}</b>
        ))}
        {Array.from({ length: first.getUTCDay() }, (_, i) => (
          <i key={"space" + i} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = month + "-" + String(i + 1).padStart(2, "0");
          const away = data.leaves.filter(
            (r) => r.status === "Approved" && r.days.includes(day),
          );
          return (
            <div key={day} className={day === data.today ? "today" : ""}>
              <strong>{i + 1}</strong>
              {away.map((r) => (
                <small key={r.id}>{r.name}</small>
              ))}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
function Schedule({ data, send }: { data: TimeView; send: Send }) {
  const [id, setId] = useState(data.branches[0]?.id ?? "");
  const branch = data.branches.find((b) => b.id === id);
  return (
    <Sheet title="Branch calendar">
      <label>
        Branch
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {data.branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {branch ? (
        <>
          <form
            key={id}
            onSubmit={async (e) => {
              const f = values(e);
              await send({
                action: "week",
                branchId: id,
                weekdays: f.getAll("weekday").map(Number),
              });
            }}
          >
            <fieldset>
              <legend>Working days</legend>
              <div className="weekdays">
                {days.map((d, i) => (
                  <label key={d}>
                    <input
                      type="checkbox"
                      name="weekday"
                      value={i}
                      defaultChecked={branch.weekdays.includes(i)}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </fieldset>
            <button>Save workweek</button>
          </form>
          <form
            onSubmit={async (e) => {
              const f = values(e);
              await send({
                action: "holiday",
                branchId: id,
                name: value(f, "name"),
                day: value(f, "day"),
              });
            }}
          >
            <label>
              Holiday name
              <input name="name" required />
            </label>
            <label>
              Holiday date
              <input type="date" name="day" required />
            </label>
            <button>Save holiday</button>
          </form>
          {branch.holidays.map((h) => (
            <article key={h.id}>
              {h.day} · {h.name}{" "}
              <button
                className="secondary"
                onClick={() => send({ action: "removeHoliday", id: h.id })}
              >
                Remove
              </button>
            </article>
          ))}
        </>
      ) : (
        <p>Create a branch in People to configure its calendar.</p>
      )}
    </Sheet>
  );
}
function Attendance({
  data,
  send,
  own,
  review,
}: {
  data: TimeView;
  send: Send;
  own: string | null;
  review: boolean;
}) {
  const entry = data.attendance.find(
    (a) => a.employeeId === own && a.day === data.today,
  );
  const [day, setDay] = useState(data.today);
  const absent = data.leaves.filter(
    (l) => l.status === "Approved" && l.days.includes(day),
  );
  return (
    <>
      {own && (
        <Sheet title="Today’s attendance">
          <div className="balance">
            <div
              className={"dial " + (entry && !entry.checkOut ? "active" : "")}
              aria-hidden="true"
            />
            <div>
              {entry
                ? entry.checkOut
                  ? "Day completed"
                  : "Checked in"
                : "Ready to check in"}
              <small>
                {entry ? clock(entry.checkIn) + " IST" : "India Standard Time"}
              </small>
            </div>
          </div>
          <button
            disabled={!!entry?.checkOut}
            onClick={() =>
              send({ action: "clock", direction: entry ? "out" : "in" })
            }
          >
            {entry ? "Check out" : "Check in"}
          </button>
        </Sheet>
      )}
      <Sheet title="Daily register">
        <label>
          Attendance date
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        {data.attendance
          .filter((a) => a.day === day)
          .map((a) => (
            <article key={a.employeeId}>
              <h3>{a.name}</h3>
              {clock(a.checkIn)} – {a.checkOut ? clock(a.checkOut) : "Open"} IST
            </article>
          ))}
        {absent.map((l) => (
          <article key={l.id}>
            <h3>{l.name}</h3>Approved leave
          </article>
        ))}
        {!absent.length && !data.attendance.some((a) => a.day === day) && (
          <p>No entries for this day.</p>
        )}
      </Sheet>
      {own && (
        <Sheet title="Correct an entry">
          <form
            onSubmit={async (e) => {
              const f = values(e),
                day = value(f, "day");
              await send({
                action: "correct",
                day,
                checkIn: day + "T" + value(f, "in") + ":00+05:30",
                checkOut: day + "T" + value(f, "out") + ":00+05:30",
                reason: value(f, "reason"),
              });
            }}
          >
            <label>
              Work date
              <input
                type="date"
                name="day"
                max={data.today}
                defaultValue={data.today}
                required
              />
            </label>
            <label>
              Check-in (IST)
              <input type="time" name="in" required />
            </label>
            <label>
              Check-out (IST)
              <input type="time" name="out" required />
            </label>
            <label>
              Reason for correction
              <input name="reason" maxLength={500} required />
            </label>
            <button>Request correction</button>
          </form>
        </Sheet>
      )}
      <Sheet title="Corrections">
        {!data.corrections.length && <p>No correction requests yet.</p>}
        {data.corrections.map((r) => (
          <article key={r.id}>
            <Stamp status={r.status} />
            <h3>{r.name}</h3>
            <p>
              {r.day} · {clock(r.checkIn)} – {clock(r.checkOut)} IST
            </p>
            <p>{r.reason}</p>
            {r.decider && (
              <small>
                {r.decider} · {r.decidedAt?.slice(0, 10)}
              </small>
            )}
            {review && r.employeeId !== own && r.status === "Pending" && (
              <Decision
                submit={(approve) =>
                  send({ action: "correctionDecision", id: r.id, approve })
                }
              />
            )}
          </article>
        ))}
      </Sheet>
    </>
  );
}
