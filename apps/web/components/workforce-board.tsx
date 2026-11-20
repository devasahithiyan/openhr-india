"use client";
import { useState } from "react";
import {
  operations,
  workTitles,
  workHR,
  authorized,
  optionsFor,
  clearance,
  exitTasks,
  handovers,
  pendingClaims,
  pendingAssets,
  exitDocument,
  shiftDate,
  shiftRange,
  filled,
  ledger,
  type WorkData,
  type WorkActor,
  type WorkRow,
  type WorkKind,
  type WorkCommand,
  type WorkValues,
} from "@openhr/shared";
export type WorkSend = (c: WorkCommand) => Promise<boolean>;
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n / 100,
  );
function display(d: WorkData, key: string, value: string) {
  if (!value) return "—";
  const refs = [
    ...d.people,
    ...d.branches,
    ...d.departments,
    ...d.designations,
    ...d.hr,
    ...d.templates,
    ...d.policies,
  ];
  if (
    [
      "person",
      "owner",
      "employee",
      "manager",
      "handler",
      "branch",
      "department",
      "designation",
      "template",
      "policy",
      "report",
      "previousBranch",
      "previousManager",
      "previousDepartment",
      "previousDesignation",
      "from",
      "to",
    ].includes(key)
  )
    return refs.find((i) => i.id === value)?.name ?? value;
  return value;
}
function ActionForm({
  action,
  r,
  data,
  viewer,
  send,
}: {
  action: string;
  r?: WorkRow;
  data: WorkData;
  viewer: WorkActor;
  send: WorkSend;
}) {
  const spec = operations[action]!,
    [vals, set] = useState<WorkValues>({});
  const get = (key: string) => vals[key] ?? "";
  const inputs = spec.fields.map((field) => {
    let choices = optionsFor(field, data, viewer, r);
    if (field.key === "person")
      choices = choices.filter((o) =>
        authorized(
          spec.access,
          viewer,
          data.people.find((p) => p.id === o.id),
          r,
        ),
      );
    const select = !["text", "date", "number", "time"].includes(field.type);
    const props = {
      name: field.key,
      required: !field.optional,
      value: get(field.key),
      onChange: (e: { target: { value: string } }) =>
        set({ ...vals, [field.key]: e.target.value }),
    };
    return (
      <label key={field.key}>
        {field.label}
        {select ? (
          <select {...props}>
            <option value="">{field.optional ? "None" : "Choose…"}</option>
            {choices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...props}
            type={field.type}
            maxLength={1200}
            min={field.type === "number" ? 0 : undefined}
            max={field.type === "number" ? 9999 : undefined}
          />
        )}
      </label>
    );
  });
  return (
    <details className="work-action">
      <summary>{spec.label}</summary>
      <form
        className="grid gap-3 py-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await send({
              action,
              id: r?.id ?? crypto.randomUUID(),
              revision: r?.revision ?? 0,
              values: vals,
            })
          )
            set({});
        }}
      >
        {inputs}
        {action === "feedback" && (
          <p>
            Only you and company HR administrators can read this feedback.
            Submitting it is optional.
          </p>
        )}
        {action === "confirmExit" && r && get("last") && (
          <ul>
            {exitTasks(r)
              .filter((t) => !t.done)
              .map((t) => (
                <li key={t.id}>
                  {t.name}: {t.due} →{" "}
                  {shiftDate(
                    get("last"),
                    -Number(r.history[Number(t.id)]?.values.offset),
                  )}
                </li>
              ))}
          </ul>
        )}
        {action === "letter" && r && get("document") && (
          <pre className="whitespace-pre-wrap">
            {exitDocument(data, r, get("document"))}
          </pre>
        )}
        {action === "transfer" && get("person") && (
          <p>
            Current assignment ·{" "}
            {["branch", "department", "designation", "manager"]
              .map((k) =>
                display(
                  data,
                  k,
                  String(
                    data.people.find((p) => p.id === get("person"))?.[
                      k as "branch"
                    ] ?? "",
                  ),
                ),
              )
              .join(" · ")}
          </p>
        )}
        {action === "closeExit" && (
          <label>
            <input required type="checkbox" className="w-auto" /> I reviewed the
            case and authorize ending this employee’s company access.
          </label>
        )}
        <button>{spec.label}</button>
      </form>
    </details>
  );
}
function Details({
  r,
  d,
  viewer,
}: {
  r: WorkRow;
  d: WorkData;
  viewer: WorkActor;
}) {
  if (r.kind === "exit")
    return (
      <div className="space-y-2">
        <p>
          Last working day · {r.values.last ?? r.values.proposed} ·{" "}
          {r.values.notice && (
            <>
              {" "}
              {r.values.notice} notice days · Notice ends{" "}
              {shiftDate(
                r.history[0]!.at.slice(0, 10),
                Number(r.values.notice),
              )}
            </>
          )}
        </p>
        <ul>
          {exitTasks(r).map((t) => (
            <li key={t.id}>
              {t.name} ·{" "}
              {t.role === "Named owner" ? display(d, "owner", t.owner) : t.role}{" "}
              · {t.due} · {t.done ? "Complete" : "Open"}
            </li>
          ))}
        </ul>
        <ul>
          {handovers(r).map((h) => (
            <li key={h.id}>
              {h.name} · {display(d, "owner", h.owner)} ·{" "}
              {h.done ? "Acknowledged" : "Awaiting acknowledgement"}{" "}
              {h.link && (
                <a href={h.link} rel="noreferrer" target="_blank">
                  Open document
                </a>
              )}
            </li>
          ))}
        </ul>
        {pendingAssets(d, r).map((i) => (
          <p key={i.id}>
            Awaiting return · {i.name} · {i.id}
          </p>
        ))}
        {pendingClaims(d, r.employeeId).map((c) => (
          <p key={c.id}>
            Expense {c.id} · {money(c.paise)} · {c.status} · {c.owner}
          </p>
        ))}
        {r.status === "Confirmed" && (
          <p>{clearance(d, r).length} outstanding clearance items</p>
        )}
        {r.history
          .filter((h) => h.action === "letter")
          .map((h, i) => (
            <details key={i}>
              <summary>
                {h.values.document} · version {h.values.version}
              </summary>
              <pre className="whitespace-pre-wrap">{h.values.text}</pre>
              <a
                download={h.values.document + "-v" + h.values.version + ".txt"}
                href={
                  "data:text/plain;charset=utf-8," +
                  encodeURIComponent(h.values.text!)
                }
              >
                Download issued document
              </a>
            </details>
          ))}
      </div>
    );
  if (r.kind === "position")
    return (
      <p>
        {filled(d, r)} filled / {r.values.seats} approved ·{" "}
        {display(d, "branch", r.values.branch!)} ·{" "}
        {display(d, "department", r.values.department!)}
      </p>
    );
  if (r.kind === "accrual") {
    const entries = ledger(d, r.employeeId!, r.values.policy!);
    return (
      <details open>
        <summary>
          Available balance · {entries.reduce((n, e) => n + e.days, 0)} days
        </summary>
        <ul>
          {entries.map((e, i) => (
            <li key={i}>
              {e.day} · {e.label} · {e.days > 0 ? "+" : ""}
              {e.days}
            </li>
          ))}
        </ul>
      </details>
    );
  }
  if (r.kind === "shift") {
    const range = shiftRange(r.values),
      punch = d.punches.find(
        (p) => p.employeeId === r.employeeId && p.day === r.values.day,
      );
    return (
      <p>
        {r.values.day} · {r.values.start}–{r.values.end} IST{" "}
        {r.values.end! < r.values.start! ? "(+1 day)" : ""} ·{" "}
        {punch
          ? "In " +
            new Date(punch.checkIn).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
            }) +
            (punch.checkOut
              ? " · Out " +
                new Date(punch.checkOut).toLocaleTimeString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })
              : " · Open punch")
          : range.end < Date.parse(d.today + "T00:00:00+05:30")
            ? "No punch"
            : "Scheduled"}
      </p>
    );
  }
  if (r.kind === "training" && r.status === "Required") {
    const gaps = d.people.filter(
      (p) =>
        (workHR(viewer) ||
          viewer.employeeId === p.id ||
          (viewer.role === "Manager" && p.manager === viewer.employeeId)) &&
        p.designation === r.values.designation &&
        !p.ended &&
        !d.records.some(
          (x) =>
            x.kind === "training" &&
            x.employeeId === p.id &&
            x.status === "Certified" &&
            x.values.skill === r.values.skill &&
            x.values.expiry! >= d.today,
        ),
    );
    return (
      <p>Qualification gaps · {gaps.map((p) => p.name).join(", ") || "None"}</p>
    );
  }
  return null;
}
export function WorkBoard({
  data,
  viewer,
  send,
}: {
  data: WorkData;
  viewer: WorkActor;
  send: WorkSend;
}) {
  const [kind, set] = useState<WorkKind>("exit");
  const all = Object.entries(operations).filter(([, s]) => s.kind === kind);
  const available = (r?: WorkRow) =>
    all.filter(([action, s]) => {
      if (
        r &&
        action === "resolveTicket" &&
        r.values.handler !== viewer.membershipId
      )
        return false;
      if ((r && !s.from.includes(r.status)) || (!r && s.from.length))
        return false;
      if (!r && s.fields.some((f) => f.key === "person"))
        return data.people.some(
          (p) => !p.ended && authorized(s.access, viewer, p),
        );
      return authorized(
        s.access,
        viewer,
        data.people.find((p) => p.id === (r?.employeeId ?? viewer.employeeId)),
        r,
      );
    });
  const records = data.records
    .filter((r) => r.kind === kind)
    .sort((a, b) =>
      (a.values.last ?? a.values.due ?? a.values.day ?? "").localeCompare(
        b.values.last ?? b.values.due ?? b.values.day ?? "",
      ),
    );
  return (
    <section className="workforce space-y-4">
      <header className="hr-work-heading">
        <h1 className="text-3xl font-bold">Workforce operations</h1>
        <label>
          Workspace
          <select
            value={kind}
            onChange={(e) => set(e.target.value as WorkKind)}
          >
            {Object.entries(workTitles)
              .filter(
                ([k]) =>
                  workHR(viewer) ||
                  !["recruit", "position", "clearanceTemplate"].includes(k),
              )
              .map(([k, n]) => (
                <option key={k} value={k}>
                  {n}
                </option>
              ))}
          </select>
        </label>
      </header>
      <h2 key={kind} className="workflow-group-title">
        {workTitles[kind]}{" "}
        <small>
          {records.length} {records.length === 1 ? "record" : "records"}
        </small>
      </h2>
      <div className="space-y-2">
        {available().map(([action]) => (
          <ActionForm
            key={action}
            action={action}
            data={data}
            viewer={viewer}
            send={send}
          />
        ))}
      </div>
      {!records.length && (
        <p className="hr-empty">No records in this workspace yet.</p>
      )}
      {records.map((r) => (
        <article className="hr-record panel space-y-3" key={r.id}>
          <h3 className="font-bold">
            {r.values.name ??
              r.values.skill ??
              r.values.cycle ??
              workTitles[r.kind]}
            {r.employeeId ? " · " + display(data, "person", r.employeeId) : ""}
          </h3>
          <p>
            <span className="hr-status">{r.status}</span>
            {r.values.due ? " · Due " + r.values.due : ""}
            {r.values.due! < data.today &&
            [
              "Under review",
              "Extended",
              "Assigned",
              "Manager review",
              "Self-assessment",
            ].includes(r.status)
              ? " · Overdue"
              : ""}
            {r.values.expiry ? " · Expires " + r.values.expiry : ""}
          </p>
          <Details r={r} d={data} viewer={viewer} />
          {r.kind === "ticket" && (
            <p>
              Case {r.id} · Recipient{" "}
              {display(data, "handler", r.values.handler!)}
            </p>
          )}
          <details>
            <summary>Record history</summary>
            <ol>
              {r.history
                .filter((h) => h.action !== "private")
                .map((h, i) => (
                  <li key={i} className="border-b border-line py-2">
                    <strong>{operations[h.action]?.label ?? h.action}</strong> ·{" "}
                    {h.at.slice(0, 10)}
                    <dl>
                      {Object.entries(h.values)
                        .filter(([k, v]) => k !== "text" && v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <dt className="inline font-semibold">
                              {operations[h.action]?.fields.find(
                                (f) => f.key === k,
                              )?.label ?? k}{" "}
                              ·{" "}
                            </dt>
                            <dd className="inline">{display(data, k, v)}</dd>
                          </div>
                        ))}
                    </dl>
                  </li>
                ))}
            </ol>
          </details>
          {available(r).map(([action]) => (
            <ActionForm
              key={action + r.revision}
              action={action}
              r={r}
              data={data}
              viewer={viewer}
              send={send}
            />
          ))}
        </article>
      ))}
    </section>
  );
}
