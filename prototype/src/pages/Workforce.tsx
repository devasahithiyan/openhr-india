import { useState } from "react";
import { Link } from "react-router-dom";
import { useDemo } from "../lib/store";
import { WorkBoard } from "../workforce/board";
import { demoWork, applyDemo, advanceDemo } from "../workforce/adapter";
import {
  projectWork,
  type WorkActor,
  type WorkCommand,
} from "../workforce/model";
export function WorkforceDemo({ admin = false }: { admin?: boolean }) {
  const store = useDemo(),
    data = demoWork(store),
    [role, setRole] = useState<WorkActor["role"]>(admin ? "HR" : "Employee"),
    [person, setPerson] = useState(admin ? "e2" : "e3"),
    [error, fail] = useState("");
  const id = role === "HR" ? "e1" : person,
    a = { role, employeeId: id, membershipId: id },
    ended = data.people.find((p) => p.id === id)?.ended;
  async function send(c: WorkCommand) {
    try {
      store.saveWork(applyDemo(store, a, c));
      fail("");
      return true;
    } catch (e) {
      fail((e as Error).message);
      return false;
    }
  }
  return (
    <div className="space-y-4">
      <details className="hr-preview-settings"><summary>Demo controls</summary><div className="hr-preview-fields">
        {admin && (
          <label>
            Demo role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkActor["role"])}
            >
              <option>HR</option>
              <option>Manager</option>
              <option>Employee</option>
            </select>
          </label>
        )}
        {role !== "HR" && (
          <label>
            Demo person
            <select value={person} onChange={(e) => setPerson(e.target.value)}>
              {data.people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {role === "HR" && (
          <label>
            Advance workforce demo date
            <input
              type="date"
              value={data.today}
              min={data.today}
              onChange={(e) => {
                if (e.target.value >= data.today)
                  store.saveWork({
                    workforce: advanceDemo(store.workforce, e.target.value),
                    onboarding: store.onboarding,
                  });
              }}
            />
          </label>
        )}
        <Link
          className="underline"
          to={admin ? "/me/workforce" : "/admin/workforce"}
        >
          {admin ? "Employee demo" : "HR demo"}
        </Link>
      </div></details>
      {error && <p role="alert">{error}</p>}
      {ended ? (
        <p>Company access ended on {ended}.</p>
      ) : (
        <WorkBoard
          key={role + id}
          viewer={a}
          data={projectWork(data, a)}
          send={send}
        />
      )}
    </div>
  );
}
