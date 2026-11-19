import { useState } from "react";
import { Link } from "react-router-dom";
import { OnboardingBoard } from "../onboarding/board";
import {
  makeTasks,
  matchesTemplate,
  revisePlan,
  type OnboardingAction,
  type Viewer,
} from "../onboarding/model";
import { useDemo } from "../lib/store";
import { DEMO_MANAGERS, DEMO_NEW_HIRE, FIRST_WEEK_SCHEDULE, handbookUrl } from "../onboarding/seed";
export function OnboardingDemo({ admin = false }: { admin?: boolean }) {
  const { onboarding, saveOnboarding } = useDemo(),
    [as, setAs] = useState("hr"),
    [error, setError] = useState("");
  const manager = admin && as !== "hr";
  const viewer: Viewer = admin
    ? manager
      ? { role: "Manager", employeeId: as }
      : { role: "HR", employeeId: null }
    : { role: "Employee", employeeId: DEMO_NEW_HIRE };
  const newHire = onboarding.people.find((p) => p.id === DEMO_NEW_HIRE);
  const visible = {
    ...onboarding,
    contacts: onboarding.people,
    plans: onboarding.plans.filter(
      (p) =>
        viewer.role === "HR" ||
        p.employeeId === viewer.employeeId ||
        (manager &&
          onboarding.people.find((e) => e.id === p.employeeId)?.managerId ===
            viewer.employeeId),
    ),
  };
  async function send(c: OnboardingAction) {
    try {
      let next = onboarding;
      if (c.action === "template") {
        if (viewer.role !== "HR") throw Error("HR access required");
        if (onboarding.templates.some((t) => t.name === c.name))
          throw Error("Template name already exists");
        next = {
          ...next,
          templates: [...next.templates, { ...c, id: crypto.randomUUID() }],
        };
      } else {
        const p = onboarding.people.find((p) => p.id === c.employeeId)!,
          existing = visible.plans.find((plan) => plan.employeeId === p.id);
        if (c.action === "start") {
          if (viewer.role !== "HR") throw Error("HR access required");
          const t = onboarding.templates.find((t) => t.id === c.templateId)!;
          if (
            !matchesTemplate(p, t) ||
            (!p.managerId && t.definitions.some((d) => d.owner === "Manager"))
          )
            throw Error("Check template scope and reporting manager");
          if (existing && existing.templateId !== t.id)
            throw Error("A different plan already exists");
          if (!existing)
            next = {
              ...next,
              plans: [
                ...next.plans,
                {
                  employeeId: p.id,
                  templateId: t.id,
                  startedFor: p.joined,
                  tasks: makeTasks(t, p.joined),
                  revision: 1,
                  closedAt: null,
                  buddyId: null,
                  week: {
                    schedule: FIRST_WEEK_SCHEDULE[p.branchId] ?? "",
                    welcomeUrl: handbookUrl(),
                    policyTitle: "Kaveri Textiles employee handbook",
                    policyVersion: "2026.1",
                    policyUrl: handbookUrl(),
                    acknowledgements: [],
                    blockers: [],
                  },
                },
              ],
            };
        } else {
          if (!existing) throw Error("Plan not found");
          const updated = revisePlan(
            existing,
            p,
            viewer,
            c,
            new Date().toISOString(),
            viewer.employeeId ?? "hr",
          );
          next = {
            ...next,
            plans: next.plans.map((plan) =>
              plan.employeeId === p.id ? updated : plan,
            ),
            people: next.people.map((e) =>
              e.id === p.id && c.action === "reschedule"
                ? { ...e, joined: c.day }
                : e,
            ),
          };
        }
      }
      saveOnboarding(next);
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {!admin && newHire && (
          <p>
            <strong>Previewing as new joiner {newHire.name}</strong>, Junior Textile Designer at Coimbatore, joining 23 Nov 2026.
          </p>
        )}
        {admin && (
          <label>
            Demo role
            <select
              value={as}
              onChange={(e) => setAs(e.target.value)}
            >
              <option value="hr">HR</option>
              {DEMO_MANAGERS.map((m) => (
                <option key={m.id} value={m.id}>
                  Reporting manager · {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <Link
          className="text-indigo underline"
          to={admin ? "/me/onboarding" : "/admin/onboarding"}
        >
          {admin ? "Preview as the new joiner" : "Open the HR view"}
        </Link>
      </div>
      {error && <p role="alert">{error}</p>}
      <OnboardingBoard
        viewer={viewer}
        data={visible}
        send={send}
        initialEmployee={admin ? "n2" : DEMO_NEW_HIRE}
      />
    </div>
  );
}
