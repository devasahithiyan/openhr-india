import { makeTasks, type DirectoryPerson, type OnboardingData, type PlanTemplate } from "./model";

// Onboarding demo data for Kaveri Textiles. Existing staff keep the ids used across
// the rest of the demo (src/lib/data.ts) so names, managers and branches line up.
// The three new joiners are fictional, like everyone else in the demo.

/** The new joiner the employee view previews. */
export const DEMO_NEW_HIRE = "n1";

/** Managers who can be picked in the HR view's "Demo role" switch. */
export const DEMO_MANAGERS = [
  { id: "e3", label: "Priya Raman, Design" },
  { id: "e8", label: "Rohan Deshmukh, Sales" },
  { id: "e11", label: "Divya Hegde, Digital" },
];

/** First-week schedule used when HR starts a plan, by branch. */
export const FIRST_WEEK_SCHEDULE: Record<string, string> = {
  coimbatore:
    "09:30 · Welcome at the Kurichi office reception.\n10:30 · Factory floor tour with your buddy.\n14:00 · Design studio setup and fabric library walkthrough.",
  bengaluru: "10:00 · Welcome at the Bengaluru office.\n11:00 · E-commerce tools walkthrough.\n15:00 · Meet the support team.",
  pune: "09:30 · Welcome at the Pune sales office.\n11:00 · Product range and price list training.\n16:00 · Ride along on a client visit.",
};

const person = (
  id: string,
  name: string,
  branchId: string,
  departmentId: string,
  managerId: string | null,
  joined: string,
): DirectoryPerson => ({ id, name, email: `${name.split(" ")[0].toLowerCase()}@kaveri.example`, joined, branchId, departmentId, managerId });

/** The bundled handbook page, as an absolute link (the model only accepts http/https). */
export const handbookUrl = () => (typeof location === "undefined" ? "" : location.origin) + "/welcome.html";

export function initialOnboarding(): OnboardingData {
  const templates: PlanTemplate[] = [
    {
      id: "design-coimbatore",
      name: "Design studio first week",
      branchId: "coimbatore",
      departmentId: "design",
      definitions: [
        { title: "Prepare laptop and design software licences", owner: "HR", offset: -2 },
        { title: "Collect ID card and factory safety kit", owner: "Employee", offset: 0 },
        { title: "Read the employee handbook", owner: "Employee", offset: 0 },
        { title: "Confirm first-week schedule", owner: "Manager", offset: 1 },
        { title: "Review first design brief", owner: "Manager", offset: 4 },
      ],
    },
    {
      id: "sales-first-week",
      name: "Sales first week",
      branchId: null,
      departmentId: "sales",
      definitions: [
        { title: "Set up CRM access and phone", owner: "HR", offset: -1 },
        { title: "Read the employee handbook", owner: "Employee", offset: 0 },
        { title: "Shadow two client visits", owner: "Manager", offset: 3 },
      ],
    },
    {
      id: "company-induction",
      name: "Company induction",
      branchId: null,
      departmentId: null,
      definitions: [
        { title: "Prepare laptop and email", owner: "HR", offset: -2 },
        { title: "Read the employee handbook", owner: "Employee", offset: 0 },
        { title: "Confirm first-week schedule", owner: "Manager", offset: 1 },
      ],
    },
  ];

  const people: DirectoryPerson[] = [
    // New joiners
    person("n1", "Nisha Krishnan", "coimbatore", "design", "e3", "2026-11-23"),
    person("n2", "Rahul Patil", "pune", "sales", "e8", "2026-11-30"),
    person("n3", "Kavya Reddy", "bengaluru", "digital", "e11", "2026-12-07"),
    // Existing Kaveri Textiles staff (managers and buddies)
    person("e3", "Priya Raman", "coimbatore", "design", "e2", "2021-02-08"),
    person("e4", "Karthik Subramanian", "coimbatore", "production", "e2", "2020-11-02"),
    person("e8", "Rohan Deshmukh", "pune", "sales", "e2", "2022-08-22"),
    person("e9", "Sneha Kulkarni", "pune", "sales", "e8", "2025-01-06"),
    person("e11", "Divya Hegde", "bengaluru", "digital", "e2", "2022-03-14"),
    person("e12", "Mohammed Irfan", "bengaluru", "digital", "e11", "2023-09-01"),
    person("e2", "Arjun Venkatesh", "coimbatore", "operations", null, "2018-07-16"),
  ];

  const nisha = people[0];
  const template = templates[0];

  return {
    contacts: [],
    today: "2026-11-19",
    people,
    branches: [
      { id: "coimbatore", name: "Coimbatore" },
      { id: "bengaluru", name: "Bengaluru" },
      { id: "pune", name: "Pune" },
    ],
    departments: [
      { id: "design", name: "Design" },
      { id: "sales", name: "Sales" },
      { id: "digital", name: "Digital" },
      { id: "production", name: "Production" },
      { id: "operations", name: "Operations" },
    ],
    templates,
    // Nisha's plan is already running so both views open with something to explore.
    // Rahul and Kavya are waiting for HR to start theirs.
    plans: [
      {
        employeeId: nisha.id,
        templateId: template.id,
        startedFor: nisha.joined,
        tasks: makeTasks(template, nisha.joined).map((t, i) =>
          i === 0 ? { ...t, done: "2026-11-19T10:15:00.000Z", completedBy: "hr" } : t,
        ),
        revision: 2,
        closedAt: null,
        buddyId: "e4",
        week: {
          schedule: FIRST_WEEK_SCHEDULE.coimbatore,
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
}
