import { DEMO_EMPLOYEE_ID, EMPLOYEES } from "./data";

export const categories = [
  "Travel",
  "Meals",
  "Lodging",
  "Supplies",
  "Other",
] as const;
export type Item = {
  day: string;
  category: (typeof categories)[number];
  paise: number;
  purpose: string;
};
export type Role = "employee" | "manager" | "hr";
type Status = "Submitted" | "Returned" | "Approved" | "Reimbursed";
export type Claim = {
  id: string;
  owner: string;
  items: Item[];
  status: Status;
  history: { status: Status; day: string; note?: string }[];
  payment?: { day: string; reference: string };
};
export type Action =
  | { kind: "submit"; items: Item[] }
  | { kind: "resubmit"; id: string; items: Item[] }
  | { kind: "approve"; id: string }
  | { kind: "return"; id: string; reason: string }
  | { kind: "pay"; id: string; day: string; reference: string };
export const initialClaims: Claim[] = [
  {
    id: "expense-demo-trip",
    owner: DEMO_EMPLOYEE_ID,
    status: "Submitted",
    items: [
      {
        day: "2026-11-18",
        category: "Travel",
        paise: 85000,
        purpose: "Return fare for a client visit",
      },
    ],
    history: [{ status: "Submitted", day: "2026-11-18" }],
  },
];
export const claimTotal = (c: Claim) =>
  c.items.reduce((n, i) => n + i.paise, 0);
export const managerId = EMPLOYEES.find(
  (e) => e.id === DEMO_EMPLOYEE_ID,
)!.managerId!;
export function allowedReview(c: Claim, role: Role) {
  const owner = EMPLOYEES.find((e) => e.id === c.owner)!;
  return (
    c.status === "Submitted" &&
    (role === "manager"
      ? owner.managerId === managerId && owner.id !== managerId
      : role === "hr" && !owner.managerId && owner.id !== "e1")
  );
}
export function updateClaims(
  claims: Claim[],
  role: Role,
  a: Action,
  today: string,
  newId: string,
): Claim[] {
  if (
    "items" in a &&
    (!a.items.length ||
      a.items.length > 40 ||
      a.items.some(
        (i) =>
          !i.purpose.trim() ||
          !i.day ||
          !Number.isInteger(i.paise) ||
          i.paise <= 0 ||
          i.paise > 1000000000,
      ))
  )
    return claims;
  if (a.kind === "submit")
    return role === "employee"
      ? [
          {
            id: newId,
            owner: DEMO_EMPLOYEE_ID,
            items: a.items,
            status: "Submitted",
            history: [{ status: "Submitted", day: today }],
          },
          ...claims,
        ]
      : claims;
  return claims.map((c) => {
    if (c.id !== a.id) return c;
    let status: Status;
    if (a.kind === "pay") {
      if (
        role !== "hr" ||
        c.status !== "Approved" ||
        !a.reference.trim() ||
        !a.day ||
        a.day > today
      )
        return c;
      status = "Reimbursed";
    } else if (a.kind === "resubmit") {
      if (
        role !== "employee" ||
        c.owner !== DEMO_EMPLOYEE_ID ||
        c.status !== "Returned"
      )
        return c;
      status = "Submitted";
    } else {
      if (!allowedReview(c, role) || (a.kind === "return" && !a.reason.trim()))
        return c;
      status = a.kind === "approve" ? "Approved" : "Returned";
    }
    return {
      ...c,
      status,
      items: a.kind === "resubmit" ? a.items : c.items,
      payment:
        a.kind === "pay"
          ? { day: a.day, reference: a.reference.trim() }
          : c.payment,
      history: [
        ...c.history,
        {
          status,
          day: today,
          note: a.kind === "return" ? a.reason.trim() : undefined,
        },
      ],
    };
  });
}
