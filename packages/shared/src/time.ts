import { z } from "zod";
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      Number.isFinite(Date.parse(s)) && new Date(s).toISOString().startsWith(s),
    "Enter a valid date",
  );
const id = z.string().uuid(),
  name = z.string().trim().min(1).max(100);
export const timeCommand = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("type"),
    unpaid: z.boolean().optional(),
    name,
    openingDays: z.number().int().min(0).max(366),
    year: z.number().int().min(2000).max(2200),
  }),
  z.object({
    action: z.literal("week"),
    branchId: id,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  }),
  z.object({ action: z.literal("holiday"), branchId: id, day, name }),
  z.object({ action: z.literal("removeHoliday"), id }),
  z.object({
    action: z.literal("apply"),
    start: day,
    end: day,
    typeId: id,
    reason: z.string().trim().max(500),
  }),
  z.object({ action: z.literal("withdraw"), id }),
  z.object({ action: z.literal("leaveDecision"), id, approve: z.boolean() }),
  z.object({ action: z.literal("clock"), direction: z.enum(["in", "out"]) }),
  z.object({
    action: z.literal("correct"),
    day,
    checkIn: z.string().datetime({ offset: true }),
    checkOut: z.string().datetime({ offset: true }),
    reason: z.string().trim().min(1).max(500),
  }),
  z.object({
    action: z.literal("correctionDecision"),
    id,
    approve: z.boolean(),
  }),
]);
export function chargeableDays(
  start: string,
  end: string,
  weekdays: number[],
  holidays: string[],
) {
  if (
    !day.safeParse(start).success ||
    !day.safeParse(end).success ||
    end < start ||
    start.slice(0, 4) !== end.slice(0, 4)
  )
    return [];
  const dates: string[] = [];
  const skipped = new Set(holidays);
  for (
    let stamp = Date.parse(start);
    stamp <= Date.parse(end);
    stamp += 86400000
  ) {
    const d = new Date(stamp);
    const iso = d.toISOString().slice(0, 10);
    if (weekdays.includes(d.getUTCDay()) && !skipped.has(iso)) dates.push(iso);
  }
  return dates;
}
export const indiaDay = (date: Date) =>
  new Date(date.getTime() + 19800000).toISOString().slice(0, 10);
export type TimeAction = z.infer<typeof timeCommand>;
export interface TimeView {
  today: string;
  branchId: string | null;
  branches: {
    id: string;
    name: string;
    weekdays: number[];
    holidays: { id: string; day: string; name: string }[];
  }[];
  types: {
    id: string;
    name: string;
    year: number;
    unpaid?: boolean;
    openingDays: number;
    used: number;
    pending: number;
  }[];
  leaves: {
    id: string;
    employeeId: string;
    name: string;
    type: string;
    start: string;
    end: string;
    days: string[];
    status: string;
    reason: string;
    decidedAt: string | null;
    decider: string | null;
  }[];
  attendance: {
    employeeId: string;
    name: string;
    day: string;
    checkIn: string;
    checkOut: string | null;
  }[];
  corrections: {
    id: string;
    employeeId: string;
    name: string;
    day: string;
    checkIn: string;
    checkOut: string;
    reason: string;
    status: string;
    decidedAt: string | null;
    decider: string | null;
  }[];
}
