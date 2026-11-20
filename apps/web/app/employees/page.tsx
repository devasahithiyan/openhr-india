"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { canManageEmployees, type EmployeeRecord } from "@openhr/shared";
import { api } from "../../components/api";
import { useSession } from "../../components/session";
type Page = {
  items: EmployeeRecord[];
  total: number;
  page: number;
  pageSize: number;
};
export default function People() {
  const user = useSession();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      api<Page>(`/employees?q=${encodeURIComponent(q)}&page=${page}`)
        .then((d) => {
          if (active) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, page]);
  return (
    <>
      <header className="loom-hero directory-hero">
        <div className="loom-intro">
          <h1 className="text-3xl font-bold">People</h1>
          <p className="mt-1 text-muted">
            {user && canManageEmployees(user.role)
              ? "Your company directory and employee records."
              : user?.role === "Manager"
                ? "Your profile and direct reports."
                : "Your employee profile."}
          </p>
          {user && canManageEmployees(user.role) && (
            <Link className="loom-link" href="/employees/new">
              Add employee
            </Link>
          )}
        </div>
        <div className="loom-art" aria-hidden="true" />
      </header>
      <label className="mb-5 max-w-md" htmlFor="search">
        Find a person
        <input
          id="search"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or employee code"
          maxLength={100}
        />
      </label>
      {error && (
        <p className="error mb-4" role="alert">
          {error}
        </p>
      )}
      <div
        className="overflow-x-auto rounded-xl border border-line bg-white"
        aria-busy={loading}
      >
        <table className="hr-directory w-full min-w-[650px]">
          <caption className="sr-only">Employee directory</caption>
          <thead>
            <tr>
              <th>Name / code</th>
              <th>Department</th>
              <th>Branch</th>
              <th>Joined</th>
              <th>Record</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((e) => (
              <tr key={e.id}>
                <td>
                  <span className="block font-semibold">{e.name}</span>
                  <span className="text-sm text-muted">
                    {e.code} · {e.designation.name}
                  </span>
                </td>
                <td data-field="Department">{e.department.name}</td>
                <td data-field="Branch">{e.branch.name}</td>
                <td className="num" data-field="Joined">
                  {e.dateOfJoining}
                </td>
                <td>
                  <Link
                    className="font-semibold text-indigo underline"
                    href={`/employees/${e.id}/edit`}
                  >
                    {user && canManageEmployees(user.role)
                      ? "View / edit"
                      : "View profile"}
                    <span className="sr-only"> for {e.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && !data?.items.length && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-muted">
                  {q
                    ? "No people match your search. Try a name or code."
                    : "No employee records yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p aria-live="polite" className="text-muted">
          {loading
            ? "Loading people…"
            : `${data?.total ?? 0} people · Page ${page}`}
        </p>
        <div className="flex gap-3">
          <button
            className="secondary"
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <button
            className="secondary"
            disabled={loading || !data || page * data.pageSize >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
