import type { OnboardingData } from "./model";
export function initialOnboarding(): OnboardingData {
  const person = (id: string, name: string, managerId: string | null) => ({
    id,
    name,
    email: id + "@kaveri.example",
    joined: "2026-11-23",
    branchId: "chennai",
    departmentId: "design",
    managerId,
  });
  return {
    contacts: [],
    today: "2026-11-19",
    people: [
      person("designer", "Demo Chennai Designer", "manager"),
      person("manager", "Demo Design Manager", null),
      person("buddy", "Demo Studio Buddy", "manager"),
    ],
    branches: [{ id: "chennai", name: "Chennai" }],
    departments: [{ id: "design", name: "Design" }],
    templates: [
      {
        id: "design-week",
        name: "Design first week",
        branchId: "chennai",
        departmentId: "design",
        definitions: [
          { title: "Prepare laptop", owner: "HR", offset: -2 },
          { title: "Read the handbook", owner: "Employee", offset: 0 },
          { title: "Confirm first-week schedule", owner: "Manager", offset: 1 },
        ],
      },
    ],
    plans: [],
  };
}
