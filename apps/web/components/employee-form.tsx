"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  canManageEmployees,
  employeeSchema,
  employeePatchSchema,
  indianStates,
  privateFields,
  type EmployeeRecord,
  type ReferenceData,
} from "@openhr/shared";
import { api, ApiError } from "./api";
import { useSession } from "./session";
const sensitiveLabels = {
  pan: "PAN",
  aadhaarLast4: "Aadhaar last four digits",
  uan: "UAN",
  esic: "ESIC number",
  bankAccount: "Bank account number",
  ifsc: "IFSC",
};
export function EmployeeForm({ id }: { id?: string }) {
  const user = useSession();
  const router = useRouter();
  const writable = !!user && canManageEmployees(user.role);
  const [record, setRecord] = useState<EmployeeRecord | null>(null);
  const [refs, setRefs] = useState<ReferenceData | null>(null);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      api<ReferenceData>("/references"),
      id ? api<EmployeeRecord>(`/employees/${id}`) : Promise.resolve(null),
    ])
      .then(([r, e]) => {
        if (active) {
          setRefs(
            e?.manager && !r.managers.some((m) => m.id === e.manager?.id)
              ? { ...r, managers: [...r.managers, e.manager] }
              : r,
          );
          setRecord(e);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !writable) return;
    setError("");
    setFields({});
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const key of [
      "code",
      "name",
      "dateOfJoining",
      "branchId",
      "departmentId",
      "designationId",
      "managerId",
    ])
      body[key] = form.get(key);
    body.managerId = body.managerId || null;
    for (const key of privateFields) {
      if (form.get(`clear-${key}`)) body[key] = null;
      else if (form.get(key)) body[key] = form.get(key);
    }
    const result = (id ? employeePatchSchema : employeeSchema).safeParse(body);
    if (!result.success) {
      setFields(
        Object.fromEntries(
          result.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      );
      setError("Check the highlighted fields.");
      return;
    }
    setBusy(true);
    try {
      await api(`/employees${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "x-csrf-token": user.csrfToken },
        body: JSON.stringify(result.data),
      });
      router.push("/employees");
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError)
        setFields(Object.fromEntries(e.fields.map((f) => [f.path, f.message])));
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: "code" | "name" | "dateOfJoining",
    label: string,
    type = "text",
  ) => (
    <label htmlFor={key}>
      {label}
      <input
        id={key}
        name={key}
        type={type}
        defaultValue={record?.[key] ?? ""}
        required
        aria-invalid={!!fields[key]}
        aria-describedby={fields[key] ? `${key}-error` : undefined}
      />
      {fields[key] && (
        <span id={`${key}-error`} className="field-error">
          {fields[key]}
        </span>
      )}
    </label>
  );
  if (!loaded)
    return (
      <>
        <Link href="/employees" className="text-indigo underline">
          Back to people
        </Link>
        <p
          className={error ? "error mt-5" : "mt-5"}
          role={error ? "alert" : "status"}
        >
          {error || "Loading employee record…"}
        </p>
      </>
    );
  if (!id && !writable)
    return (
      <p className="error" role="alert">
        Admin or HR access is required to add employees.
      </p>
    );
  return (
    <>
      <Link href="/employees" className="text-indigo underline">
        Back to people
      </Link>
      <h1 className="mb-2 mt-5 text-3xl font-bold">
        {id
          ? writable
            ? "Edit employee"
            : "Employee profile"
          : "Add employee"}
      </h1>
      <p className="mb-8 text-muted">
        {id
          ? `${record?.name} · ${record?.code}`
          : "Start with their role and joining details. Private identifiers are optional."}
      </p>
      {error && (
        <p className="error mb-5" role="alert">
          {error}
        </p>
      )}
      {writable && <ReferenceSetup onChange={setRefs} />}
      <form onSubmit={save} className="space-y-8">
        <fieldset disabled={!writable || busy} className="panel">
          <legend className="px-2 text-xl font-semibold">
            Employee details
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {field("code", "Employee code")}
            {field("name", "Full name")}
            {field("dateOfJoining", "Date of joining", "date")}
            {(["branch", "department", "designation"] as const).map((kind) => {
              const key = `${kind}Id` as const;
              const options =
                kind === "branch"
                  ? refs!.branches
                  : kind === "department"
                    ? refs!.departments
                    : refs!.designations;
              return (
                <label htmlFor={key} key={kind}>
                  {kind.charAt(0).toUpperCase() + kind.slice(1)}
                  <select
                    id={key}
                    name={key}
                    defaultValue={record?.[key] ?? ""}
                    required
                    aria-invalid={!!fields[key]}
                  >
                    <option value="">Select {kind}</option>
                    {options.map((r) => (
                      <option value={r.id} key={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  {fields[key] && (
                    <span className="field-error">{fields[key]}</span>
                  )}
                </label>
              );
            })}
            <label htmlFor="managerId">
              Manager
              <select
                id="managerId"
                name="managerId"
                defaultValue={record?.managerId ?? ""}
              >
                <option value="">No manager</option>
                {refs!.managers
                  .filter((m) => m.id !== id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.code}
                    </option>
                  ))}
              </select>
              {fields.managerId && (
                <span className="field-error">{fields.managerId}</span>
              )}
            </label>
          </div>
        </fieldset>
        {(writable || record?.sensitive) && (
          <fieldset disabled={!writable || busy} className="panel">
            <legend className="px-2 text-xl font-semibold">
              Private identifiers
            </legend>
            <p className="mb-5 text-muted">
              {id
                ? "Saved values are masked. Leave a field empty to keep it, enter a replacement, or select Clear."
                : "Enter only the final four Aadhaar digits. Full Aadhaar numbers are never accepted."}
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {privateFields.map((key) => {
                const saved =
                  record?.sensitive?.[key === "aadhaarLast4" ? "aadhaar" : key];
                return (
                  <div key={key}>
                    <label htmlFor={key}>
                      {sensitiveLabels[key]}

                      <input
                        id={key}
                        name={key}
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={
                          key === "aadhaarLast4"
                            ? 4
                            : key === "bankAccount"
                              ? 18
                              : key === "uan"
                                ? 12
                                : key === "ifsc"
                                  ? 11
                                  : 10
                        }
                        inputMode={
                          [
                            "aadhaarLast4",
                            "uan",
                            "esic",
                            "bankAccount",
                          ].includes(key)
                            ? "numeric"
                            : "text"
                        }
                        aria-invalid={!!fields[key]}
                        aria-describedby={
                          fields[key] ? `${key}-error` : undefined
                        }
                      />
                    </label>
                    {saved && <small>Saved: {saved}</small>}
                    {fields[key] && (
                      <span id={`${key}-error`} className="field-error">
                        {fields[key]}
                      </span>
                    )}
                    {id && writable && (
                      <label className="mt-2 flex items-center gap-2 text-sm font-normal">
                        <input
                          className="w-auto"
                          type="checkbox"
                          name={`clear-${key}`}
                        />
                        Clear {sensitiveLabels[key]}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}
        {writable && (
          <div className="flex gap-4 pb-8">
            <button disabled={busy}>
              {busy ? "Saving…" : "Save employee"}
            </button>
            <Link className="button secondary" href="/employees">
              Cancel
            </Link>
          </div>
        )}
      </form>
    </>
  );
}
function ReferenceSetup({
  onChange,
}: {
  onChange: (refs: ReferenceData) => void;
}) {
  const user = useSession();
  const [kind, setKind] = useState("branches");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/references/${kind}`, {
        method: "POST",
        headers: { "x-csrf-token": user.csrfToken },
        body: JSON.stringify({
          name: data.get("referenceName"),
          ...(kind === "branches" ? { state: data.get("state") } : {}),
        }),
      });
      onChange(await api<ReferenceData>("/references"));
      form.reset();
      setMessage("Added. You can now select it in employee details.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="mb-8 rounded-xl border border-line bg-white p-5">
      <summary className="cursor-pointer font-semibold text-indigo">
        Organisation setup · add a branch, department or designation
      </summary>
      <form className="mt-4 flex flex-wrap items-end gap-4" onSubmit={add}>
        <label htmlFor="referenceType">
          Type
          <select
            id="referenceType"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="branches">Branch</option>
            <option value="departments">Department</option>
            <option value="designations">Designation</option>
          </select>
        </label>
        <label className="grow" htmlFor="referenceName">
          Name
          <input
            id="referenceName"
            name="referenceName"
            required
            maxLength={100}
          />
        </label>
        {kind === "branches" && (
          <label htmlFor="state">
            State / UT
            <select id="state" name="state">
              {indianStates.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        <button disabled={busy}>{busy ? "Adding…" : "Add to company"}</button>
        {error && (
          <p className="error w-full" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="w-full text-indigo" role="status">
            {message}
          </p>
        )}
      </form>
    </details>
  );
}
