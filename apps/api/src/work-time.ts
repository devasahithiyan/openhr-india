import { type Prisma } from "@prisma/client";
import {
  indiaDay,
  ledger,
  shiftRange,
  shiftDate,
  type WorkRow,
  type WorkPerson,
} from "@openhr/shared";
export async function employeeLedger(
  tx: Prisma.TransactionClient,
  companyId: string,
  employeeId: string,
) {
  const where = { companyId, employeeId };
  const [rules, policies, leaves, person] = await Promise.all([
    tx.workRecord.findMany({ where: { ...where, kind: "accrual" } }),
    tx.leaveType.findMany({ where: { companyId } }),
    tx.leaveRequest.findMany({ where }),
    tx.employee.findUnique({
      where: { companyId_id: { companyId, id: employeeId } },
      select: { dateOfJoining: true },
    }),
  ]);
  const data = {
    today: indiaDay(new Date()),
    records: rules.map((r) => r.payload as unknown as WorkRow),
    policies: policies.map((p) => ({ ...p, opening: p.openingDays })),
    absences: leaves.map((l) => ({ ...l, policy: l.typeId })),
    people: person
      ? [
          {
            id: employeeId,
            joined: person.dateOfJoining.toISOString().slice(0, 10),
          } as WorkPerson,
        ]
      : [],
  };
  return (policy: string, on?: string, days?: string[]) =>
    ledger(
      {
        ...data,
        absences: [
          ...data.absences,
          ...(days ? [{ employeeId, policy, status: "Pending", days }] : []),
        ],
      },
      employeeId,
      policy,
      on,
    );
}
export async function overnight(
  tx: Prisma.TransactionClient,
  companyId: string,
  employeeId: string,
  day: string,
) {
  const shifts = await tx.workRecord.findMany({
    where: {
      companyId,
      employeeId,
      kind: "shift",
      payload: { path: ["values", "day"], equals: day },
    },
  });
  return shifts
    .map((r) => (r.payload as unknown as WorkRow).values)
    .filter((v) => v.end! < v.start!)
    .map(shiftRange);
}
export async function clockDay(
  tx: Prisma.TransactionClient,
  companyId: string,
  employeeId: string,
  now: Date,
  direction: string,
) {
  const today = indiaDay(now),
    prior = shiftDate(today, -1);
  const shifts = await overnight(tx, companyId, employeeId, prior);
  if (!shifts.length) return today;
  const open = await tx.attendance.findUnique({
    where: { companyId_employeeId_day: { companyId, employeeId, day: prior } },
  });
  if (
    await tx.attendance.findUnique({
      where: {
        companyId_employeeId_day: { companyId, employeeId, day: today },
      },
    })
  )
    return today;
  if (direction === "out" && open && !open.checkOut) return prior;
  return shifts.some((s) => now.getTime() >= s.start && now.getTime() < s.end)
    ? prior
    : today;
}
