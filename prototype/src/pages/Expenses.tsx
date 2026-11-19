import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Pill } from "../components/ui";
import { DEMO_EMPLOYEE_ID, EMPLOYEES } from "../lib/data";
import {
  allowedReview,
  categories,
  claimTotal,
  managerId,
  type Claim,
  type Item,
  type Role,
} from "../lib/expenses";
import { DEMO_TODAY, useDemo } from "../lib/store";
const money = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    v / 100,
  );
const primary = "rounded-lg bg-indigo px-4 py-2 font-semibold text-white";
const secondary =
  "rounded-lg border border-line px-4 py-2 font-semibold text-indigo";
function Edit({ claim }: { claim?: Claim }) {
  const { expense } = useDemo();
  const empty = () => ({
    day: DEMO_TODAY,
    category: "Travel" as Item["category"],
    amount: "",
    purpose: "",
  });
  const [rows, setRows] = useState(
    () =>
      claim?.items.map((i) => ({ ...i, amount: String(i.paise / 100) })) ?? [
        empty(),
      ],
  );
  const set = (i: number, patch: Partial<ReturnType<typeof empty>>) =>
    setRows(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const items = rows.map((r) => ({
    day: r.day,
    category: r.category,
    paise: Math.round(Number(r.amount) * 100),
    purpose: r.purpose.trim(),
  }));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (items.some((i) => !i.purpose)) return;
        expense(
          "employee",
          claim
            ? { kind: "resubmit", id: claim.id, items }
            : { kind: "submit", items },
        );
        setRows([empty()]);
      }}
    >
      {rows.map((r, i) => (
        <fieldset
          key={i}
          className="grid gap-3 border-b border-line py-3 sm:grid-cols-2"
        >
          <legend className="font-bold">Expense {i + 1}</legend>
          <label>
            Expense date
            <input
              type="date"
              required
              value={r.day}
              onChange={(e) => set(i, { day: e.target.value })}
            />
          </label>
          <label>
            Category
            <select
              value={r.category}
              onChange={(e) =>
                set(i, { category: e.target.value as Item["category"] })
              }
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Amount (₹)
            <input
              type="number"
              step=".01"
              min=".01"
              max="10000000"
              required
              value={r.amount}
              onChange={(e) => set(i, { amount: e.target.value })}
            />
          </label>
          <label>
            Business purpose
            <input
              required
              maxLength={500}
              value={r.purpose}
              onChange={(e) => set(i, { purpose: e.target.value })}
            />
          </label>
          {rows.length > 1 && (
            <button
              className={secondary}
              type="button"
              onClick={() => setRows(rows.filter((_, n) => i !== n))}
            >
              Remove expense {i + 1}
            </button>
          )}
        </fieldset>
      ))}
      <p className="font-bold">
        Total {money(items.reduce((n, i) => n + i.paise, 0))}
      </p>
      <div className="flex flex-wrap gap-2">
        {rows.length < 40 && (
          <button
            type="button"
            className={secondary}
            onClick={() => setRows([...rows, empty()])}
          >
            Add another expense
          </button>
        )}
        <button className={primary}>
          {claim ? "Resubmit claim" : "Submit claim"}
        </button>
      </div>
    </form>
  );
}
export function Expenses({ admin = false }: { admin?: boolean }) {
  const { claims, expense } = useDemo(),
    [reviewer, setReviewer] = useState<Role>("manager");
  const role = admin ? reviewer : "employee";
  const visible = claims.filter(
    (c) =>
      role === "hr" ||
      (role === "employee"
        ? c.owner === DEMO_EMPLOYEE_ID
        : EMPLOYEES.find((e) => e.id === c.owner)?.managerId === managerId ||
          c.owner === managerId),
  );
  return (
    <div className="expense-demo max-w-4xl space-y-4">
      <PageHeader
        title="Expenses"
        sub={
          admin
            ? "Review claims and record reimbursements."
            : "Submit business expenses and track your reimbursements."
        }
      />
      <Link
        className="font-semibold text-indigo underline"
        to={admin ? "/me/expenses" : "/admin/expenses"}
      >
        {admin ? "Open employee demo" : "Open reviewer demo"}
      </Link>
      {admin ? (
        <label className="block max-w-md">
          Demo role
          <select
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value as Role)}
          >
            <option value="manager">Reporting manager · Arjun</option>
            <option value="hr">HR · Meenakshi</option>
          </select>
        </label>
      ) : (
        <details className="rounded-xl bg-white p-5 ring-1 ring-line">
          <summary className="cursor-pointer font-bold">
            New expense claim
          </summary>
          <Edit />
        </details>
      )}
      {role === "hr" && (
        <p className="rounded-xl bg-indigo-deep p-4 text-white">
          Approved and awaiting reimbursement{" "}
          <strong>
            {money(
              claims
                .filter((c) => c.status === "Approved")
                .reduce((n, c) => n + claimTotal(c), 0),
            )}
          </strong>
        </p>
      )}
      {!visible.length && <p>No claims to show.</p>}
      {visible.map((c) => (
        <article
          key={c.id}
          className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-line"
        >
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">
              {EMPLOYEES.find((e) => e.id === c.owner)?.name} ·{" "}
              {money(claimTotal(c))}
            </h2>
            <Pill
              tone={
                c.status === "Returned"
                  ? "warn"
                  : c.status === "Submitted"
                    ? "info"
                    : "good"
              }
            >
              {c.status}
            </Pill>
          </header>
          <ul>
            {c.items.map((i, n) => (
              <li key={n} className="border-b border-line py-2">
                {i.day} · {i.category} · {money(i.paise)}
                <p>{i.purpose}</p>
              </li>
            ))}
          </ul>
          {c.status === "Returned" && (
            <p>Return reason · {c.history.at(-1)?.note}</p>
          )}
          {c.payment && (
            <p>
              Paid {c.payment.day} · {c.payment.reference}
            </p>
          )}
          <details>
            <summary>Status history</summary>
            <ol>
              {c.history.map((e, n) => (
                <li key={n}>
                  {e.day} · {e.status} {e.note}
                </li>
              ))}
            </ol>
          </details>
          {role === "employee" && c.status === "Returned" && <Edit claim={c} />}
          {allowedReview(c, role) && (
            <>
              <button
                className={primary}
                onClick={() => expense(role, { kind: "approve", id: c.id })}
              >
                Approve claim
              </button>
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  expense(role, {
                    kind: "return",
                    id: c.id,
                    reason: String(new FormData(e.currentTarget).get("reason")),
                  });
                }}
              >
                <label>
                  Reason for return
                  <input name="reason" required maxLength={500} />
                </label>
                <button className={secondary}>Return for clarification</button>
              </form>
            </>
          )}
          {role === "hr" && c.status === "Approved" && (
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                expense(role, {
                  kind: "pay",
                  id: c.id,
                  day: String(f.get("day")),
                  reference: String(f.get("ref")),
                });
              }}
            >
              <label>
                Payment date
                <input
                  type="date"
                  defaultValue={DEMO_TODAY}
                  max={DEMO_TODAY}
                  name="day"
                  required
                />
              </label>
              <label>
                Payment reference
                <input required name="ref" maxLength={120} />
              </label>
              <button className={primary}>Record reimbursement</button>
            </form>
          )}
        </article>
      ))}
    </div>
  );
}
