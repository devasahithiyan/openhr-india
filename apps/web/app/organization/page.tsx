"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrganizationMember } from "@openhr/shared";
import { api } from "../../components/api";

function ReportingLines({ members }: { members: OrganizationMember[] }) {
  const teams = new Map<string | null, OrganizationMember[]>();
  for (const member of members) {
    const team = teams.get(member.managerId);
    if (team) team.push(member);
    else teams.set(member.managerId, [member]);
  }
  function branch(person: OrganizationMember, depth: number) {
    const reports = teams.get(person.id);
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
          <details open={depth === 0}>
            <summary
              className="cursor-pointer py-2 text-sm font-semibold text-indigo"
              aria-label={`Direct reports for ${person.name}, ${reports.length}`}
            >
              {reports.length} direct{" "}
              {reports.length === 1 ? "report" : "reports"}
            </summary>
            <ul className="ml-1 border-l-2 border-line pl-3 sm:pl-6">
              {reports.map((report) => branch(report, depth + 1))}
            </ul>
          </details>
        )}
      </li>
    );
  }
  return (
    <ul aria-label="Reporting lines">
      {teams.get(null)?.map((root) => branch(root, 0))}
    </ul>
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
