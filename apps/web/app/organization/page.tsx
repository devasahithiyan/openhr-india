"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrganizationMember } from "@openhr/shared";
import { api } from "../../components/api";

function ReportingLines({ members }: { members: OrganizationMember[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [expanded, setExpanded] = useState(
    () =>
      new Set(
        members
          .filter((person) => !person.managerId)
          .map((person) => person.id),
      ),
  );
  const term = query.trim().toLowerCase();
  const filtering = Boolean(term || department);
  const departments = [
    ...new Set(members.map((person) => person.department.name)),
  ].sort();
  const byId = new Map(members.map((person) => [person.id, person]));
  const matches = members.filter(
    (person) =>
      (!department || person.department.name === department) &&
      (person.name.toLowerCase().includes(term) ||
        person.code.toLowerCase().includes(term)),
  );
  const visible = new Set<string>();
  for (const match of matches) {
    let person: OrganizationMember | undefined = match;
    while (person && !visible.has(person.id)) {
      visible.add(person.id);
      person = person.managerId ? byId.get(person.managerId) : undefined;
    }
  }
  const teams = new Map<string | null, OrganizationMember[]>();
  for (const member of members) {
    if (!visible.has(member.id)) continue;
    const team = teams.get(member.managerId);
    if (team) team.push(member);
    else teams.set(member.managerId, [member]);
  }
  const managerIds = [...teams.keys()].filter(
    (id): id is string => id !== null,
  );
  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function branch(person: OrganizationMember) {
    const reports = teams.get(person.id);
    const open = filtering || expanded.has(person.id);
    const profile = (
      <Link
        className="font-semibold text-indigo underline"
        href={`/employees/${person.id}/edit`}
      >
        {person.name}
      </Link>
    );
    return (
      <li key={person.id} className="my-2">
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          {profile}
          <p className="text-sm text-muted">
            {person.designation.name} · {person.department.name} · {person.code}
          </p>
        </div>
        {reports && (
          <div>
            {filtering ? (
              <p className="py-1 text-sm text-muted">Reports in this view</p>
            ) : (
              <button
                type="button"
                className="secondary my-1 text-sm"
                aria-expanded={open}
                aria-label={`Direct reports for ${person.name}, ${reports.length}`}
                onClick={() => toggle(person.id)}
              >
                <span aria-hidden="true">{open ? "▾" : "▸"}</span>
                {reports.length} direct{" "}
                {reports.length === 1 ? "report" : "reports"}
              </button>
            )}
            {open && (
              <ul className="ml-1 border-l-2 border-line pl-3 sm:pl-6">
                {reports.map(branch)}
              </ul>
            )}
          </div>
        )}
      </li>
    );
  }
  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label>
          Find a person
          <input
            type="search"
            placeholder="Name or employee code"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Department
          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="">All departments</option>
            {departments.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      {filtering ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status">
            {matches.length === 0
              ? "No people match your filters."
              : `${matches.length} matching ${matches.length === 1 ? "person" : "people"}, shown with their reporting lines.`}
          </p>
          <button
            className="secondary"
            onClick={() => {
              setQuery("");
              setDepartment("");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        managerIds.length > 0 && (
          <div className="flex gap-2">
            <button
              className="secondary"
              onClick={() => setExpanded(new Set(managerIds))}
            >
              Expand all
            </button>
            <button
              className="secondary"
              onClick={() => setExpanded(new Set())}
            >
              Collapse all
            </button>
          </div>
        )
      )}
      <ul aria-label="Reporting lines">{teams.get(null)?.map(branch)}</ul>
    </>
  );
}

export default function Organization() {
  const [members, setMembers] = useState<OrganizationMember[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api<OrganizationMember[]>("/organization")
      .then((result) => {
        if (active) setMembers(result);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <section className="max-w-3xl">
      <h1 className="text-3xl font-bold">Org chart</h1>
      <p className="mb-6 mt-1 text-muted">
        Reporting lines for the people you can view.
      </p>
      {error ? (
        <div role="alert" className="error">
          {error}{" "}
          <button
            className="secondary"
            onClick={() => {
              setError("");
              setAttempt(attempt + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : members === null ? (
        <p role="status">Loading reporting lines…</p>
      ) : members.length ? (
        <ReportingLines members={members} />
      ) : (
        <p>No employee records are visible to you yet.</p>
      )}
    </section>
  );
}
