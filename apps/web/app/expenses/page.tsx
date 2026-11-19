"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  expenseCategories,
  indiaDay,
  type ExpenseCommand,
  type ExpenseItem,
  type ExpenseRecord,
  type ExpenseView,
} from "@openhr/shared";
import { api } from "../../components/api";
import { useSession } from "../../components/session";
const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});
const money = (paise: number) => rupees.format(paise / 100);
type Send = (cmd: ExpenseCommand) => Promise<boolean>;
type Draft = {
  key: number;
  day: string;
  category: ExpenseItem["category"];
  amount: string;
  purpose: string;
};
const blank = (key: number): Draft => ({
  key,
  day: indiaDay(new Date()),
  category: "Travel",
  amount: "",
  purpose: "",
});
function ItemForm({ claim, send }: { claim?: ExpenseRecord; send: Send }) {
  const [items, setItems] = useState<Draft[]>(
    () =>
      claim?.items.map((item, key) => ({
        ...item,
        key,
        amount: String(item.paise / 100),
      })) ?? [blank(0)],
  );
  function edit(key: number, patch: Partial<Draft>) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    );
  }
  const lines = items.map(({ day, category, purpose, amount }) => ({
    day,
    category,
    purpose,
    paise: Math.round(Number(amount) * 100),
  }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await send(
      claim
        ? {
            action: "resubmit",
            id: claim.id,
            revision: claim.revision,
            items: lines,
          }
        : { action: "submit", items: lines },
    );
    if (ok) setItems([blank(0)]);
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      {items.map((i, n) => (
        <fieldset
          key={i.key}
          className="grid gap-3 border-b border-line pb-4 sm:grid-cols-2"
        >
          <legend className="font-semibold">Expense {n + 1}</legend>
          <label>
            Expense date
            <input
              type="date"
              required
              value={i.day}
              onChange={(e) => edit(i.key, { day: e.target.value })}
            />
          </label>
          <label>
            Category
            <select
              value={i.category}
              onChange={(e) =>
                edit(i.key, { category: e.target.value as Draft["category"] })
              }
            >
              {expenseCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Amount (₹)
            <input
              type="number"
              min="0.01"
              max="10000000"
              step="0.01"
              required
              value={i.amount}
              onChange={(e) => edit(i.key, { amount: e.target.value })}
            />
          </label>
          <label>
            Business purpose
            <input
              required
              maxLength={500}
              value={i.purpose}
              onChange={(e) => edit(i.key, { purpose: e.target.value })}
            />
          </label>
          {items.length > 1 && (
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setItems(items.filter((item) => item.key !== i.key))
              }
            >
              Remove expense {n + 1}
            </button>
          )}
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <strong>
          Total {money(lines.reduce((sum, i) => sum + i.paise, 0))}
        </strong>
        {items.length < 40 && (
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setItems([...items, blank(items[items.length - 1]!.key + 1)])
            }
          >
            Add another expense
          </button>
        )}
        <button>{claim ? "Resubmit claim" : "Submit claim"}</button>
      </div>
    </form>
  );
}
function Claim({ claim, send }: { claim: ExpenseRecord; send: Send }) {
  const target = { id: claim.id, revision: claim.revision };
  return (
    <article className="panel space-y-3">
      <header className="flex flex-wrap justify-between gap-2">
        <h3 className="font-bold">
          {claim.employeeName} · {money(claim.total)}
        </h3>
        <strong>{claim.status}</strong>
      </header>
      <ul>
        {claim.items.map((item, i) => (
          <li key={i} className="border-b border-line py-2">
            <strong>
              {item.category} · {money(item.paise)}
            </strong>{" "}
            · {item.day}
            <p>{item.purpose}</p>
          </li>
        ))}
      </ul>
      {claim.paymentReference && (
        <p>
          Paid {claim.paymentDay} · {claim.paymentReference}
        </p>
      )}
      {claim.status === "Returned" && (
        <p>Return reason · {claim.history.at(-1)?.note}</p>
      )}
      <details>
        <summary>Status history</summary>
        <ol>
          {claim.history.map((e, i) => (
            <li key={i}>
              {new Date(e.at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}{" "}
              IST · {e.status}
              {e.note && " · " + e.note}
            </li>
          ))}
        </ol>
      </details>
      {claim.canEdit && <ItemForm claim={claim} send={send} />}
      {claim.canReview && (
        <div className="space-y-3">
          <button onClick={() => send({ action: "approve", ...target })}>
            Approve claim
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send({
                action: "return",
                ...target,
                reason: String(new FormData(e.currentTarget).get("reason")),
              });
            }}
          >
            <label>
              Reason for return
              <input name="reason" required maxLength={500} />
            </label>
            <button className="secondary mt-2">Return for clarification</button>
          </form>
        </div>
      )}
      {claim.canPay && (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void send({
              action: "reimburse",
              ...target,
              day: String(f.get("day")),
              reference: String(f.get("reference")),
            });
          }}
        >
          <label>
            Payment date
            <input
              type="date"
              name="day"
              required
              max={indiaDay(new Date())}
              defaultValue={indiaDay(new Date())}
            />
          </label>
          <label>
            Payment reference
            <input required name="reference" maxLength={120} />
          </label>
          <button>Record reimbursement</button>
        </form>
      )}
    </article>
  );
}
export default function Expenses() {
  const user = useSession();
  const [data, setData] = useState<ExpenseView | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    api<ExpenseView>("/expenses")
      .then((d) => {
        if (active) {
          setData(d);
          setError("");
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  async function send(cmd: ExpenseCommand) {
    if (busy || !user) return false;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api("/expenses", {
        method: "POST",
        headers: { "x-csrf-token": user.csrfToken },
        body: JSON.stringify(cmd),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save claim");
      setBusy(false);
      return false;
    }
    setMessage(
      cmd.action === "reimburse" ? "Reimbursement recorded." : "Claim updated.",
    );
    try {
      setData(await api<ExpenseView>("/expenses"));
    } catch {
      setData(null);
      setError("Saved. Reload to see the updated claims.");
    } finally {
      setBusy(false);
    }
    return true;
  }
  return (
    <section className="max-w-4xl space-y-5">
      <h1 className="text-3xl font-bold">Expenses</h1>
      {message && <p role="status">{message}</p>}
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button onClick={() => setRefresh((n) => n + 1)}>
            Reload claims
          </button>
        </div>
      )}
      {data ? (
        <fieldset className="space-y-5" disabled={busy}>
          {data.outstanding !== null && (
            <p className="panel">
              Approved and awaiting reimbursement{" "}
              <strong>{money(data.outstanding)}</strong>
            </p>
          )}
          {user?.employeeId && (
            <details className="panel">
              <summary className="font-semibold">New expense claim</summary>
              <ItemForm send={send} />
            </details>
          )}
          <h2 className="text-xl font-bold">Claims</h2>
          {data.claims.length ? (
            data.claims.map((c) => <Claim key={c.id} claim={c} send={send} />)
          ) : (
            <p>No claims to show.</p>
          )}
        </fieldset>
      ) : (
        !error && <p role="status">Loading expenses…</p>
      )}
    </section>
  );
}
