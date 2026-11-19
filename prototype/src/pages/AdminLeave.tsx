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
    </>
  );
}
