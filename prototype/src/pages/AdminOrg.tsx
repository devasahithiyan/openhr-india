import { useMemo, useState } from "react";
import { Avatar, Button, PageHeader } from "../components/ui";
import { EMPLOYEES, type Employee } from "../lib/data";
import { EmployeeDrawer } from "./AdminPeople";

const byId = new Map(EMPLOYEES.map((e) => [e.id, e]));
const DEPARTMENTS = [...new Set(EMPLOYEES.map((e) => e.department))].sort();
const MANAGER_IDS = [...new Set(EMPLOYEES.map((e) => e.managerId).filter((id): id is string => !!id))];
const ROOTS = EMPLOYEES.filter((e) => !e.managerId);

export function AdminOrg() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(ROOTS.map((e) => e.id)));
  const [selected, setSelected] = useState<Employee | null>(null);

  const term = query.trim().toLowerCase();
  const filtering = Boolean(term || department);

  // People matching the filters, plus everyone above them so each match keeps its reporting line.
  const { matches, visible } = useMemo(() => {
    const matches = EMPLOYEES.filter(
      (e) =>
        (!department || e.department === department) &&
        (e.name.toLowerCase().includes(term) || e.code.toLowerCase().includes(term)),
    );
    const visible = new Set<string>();
    for (const m of matches) {
      let p: Employee | undefined = m;
      while (p && !visible.has(p.id)) {
        visible.add(p.id);
        p = p.managerId ? byId.get(p.managerId) : undefined;
      }
    }
    return { matches, visible };
  }, [term, department]);

  const matchIds = new Set(matches.map((m) => m.id));
  const reportsOf = (id: string) => EMPLOYEES.filter((e) => e.managerId === id && visible.has(e.id));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function branch(person: Employee) {
    const reports = reportsOf(person.id);
    const totalReports = EMPLOYEES.filter((e) => e.managerId === person.id).length;
    const open = filtering || expanded.has(person.id);
    const dimmed = filtering && !matchIds.has(person.id);
    return (
      <li key={person.id} className="relative">
        <div
          className={`flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ${
            filtering && matchIds.has(person.id) ? "ring-2 ring-haldi" : "ring-line"
          } ${dimmed ? "opacity-70" : ""}`}
        >
          <Avatar name={person.name} />
          <div className="min-w-0 flex-1">
            <button
              className="text-left font-semibold text-indigo underline-offset-2 hover:underline"
              onClick={() => setSelected(person)}
            >
              {person.name}
            </button>
            <p className="text-[14px] text-muted">
              {person.designation}, {person.department}. {person.branch}, {person.code}
            </p>
          </div>
          {totalReports > 0 && !filtering && (
            <button
              className="w-full rounded-lg px-3 py-1.5 text-[14px] font-semibold text-indigo ring-1 ring-line hover:ring-indigo/40 sm:w-auto"
              aria-expanded={open}
              aria-label={`Direct reports for ${person.name}, ${totalReports}`}
              onClick={() => toggle(person.id)}
            >
              <span aria-hidden className="mr-1 inline-block w-3">
                {open ? "▾" : "▸"}
              </span>
              {totalReports} direct {totalReports === 1 ? "report" : "reports"}
            </button>
          )}
        </div>
        {open && reports.length > 0 && (
          <ul className="mt-2 ml-5 space-y-2 border-l-2 border-line pl-3 sm:ml-7 sm:pl-6">
            {reports.map(branch)}
          </ul>
        )}
      </li>
    );
  }

  return (
    <>
      <PageHeader
        title="Org chart"
        sub="Reporting lines across Kaveri Textiles. Admin and HR see the whole company; managers see their own team."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_16rem]">
        <label className="text-[15px] font-semibold">
          Find a person
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or employee code"
            className="mt-1 block w-full rounded-lg border border-line bg-white px-4 py-2.5 text-[16px] font-normal outline-none focus:border-indigo"
          />
        </label>
        <label className="text-[15px] font-semibold">
          Department
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[16px] font-normal"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {filtering ? (
          <>
            <p role="status" className="text-[15px]">
              {matches.length === 0
                ? "No one matches these filters. Try another name, code or department."
                : `${matches.length} matching ${matches.length === 1 ? "person" : "people"}, shown with their reporting lines.`}
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setQuery("");
                setDepartment("");
              }}
            >
              Clear filters
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setExpanded(new Set(MANAGER_IDS))}>
              Expand all
            </Button>
            <Button variant="ghost" onClick={() => setExpanded(new Set())}>
              Collapse all
            </Button>
          </>
        )}
      </div>

      <ul aria-label="Reporting lines" className="max-w-3xl space-y-2">
        {ROOTS.filter((r) => visible.has(r.id)).map(branch)}
      </ul>

      {selected && <EmployeeDrawer e={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
