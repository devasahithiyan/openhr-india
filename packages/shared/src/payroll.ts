import { z } from "zod";
export const payrollMonth = z.string().regex(/^20\d\d-(0[1-9]|1[0-2])$/);
const paise = z.number().int().min(0).max(1_000_000_000);
export const componentsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(60),
      monthly: paise.positive(),
      pfWage: z.boolean(),
    }),
  )
  .min(1)
  .max(20)
  .refine(
    (rows) =>
      new Set(rows.map((r) => r.name.toLowerCase())).size === rows.length,
    "Duplicate salary component",
  );
export const assessedSchema = z.object({
  esi: paise,
  pt: paise,
  lwf: paise,
  tds: paise,
  reference: z.string().trim().min(3).max(160),
  standardCappedPF: z.literal(true),
});
export const payrollCommand = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("salary"),
    employeeId: z.string().uuid(),
    effective: z.string().date(),
    components: componentsSchema,
  }),
  z.object({
    action: z.literal("review"),
    employeeId: z.string().uuid(),
    month: payrollMonth,
    hash: z.string().length(64),
    assessment: assessedSchema,
  }),
  z.object({
    action: z.literal("publish"),
    month: payrollMonth,
    hash: z.string().length(64),
  }),
]);
export type PayrollCommand = z.infer<typeof payrollCommand>;
export type SalaryComponent = z.infer<typeof componentsSchema>[number];
export type Assessment = z.infer<typeof assessedSchema>;
export interface PayLine extends SalaryComponent {
  effective: string;
  days: number;
  earned: number;
}
export interface PayRow {
  employeeId: string;
  name: string;
  code: string;
  state: string;
  joined: string;
  month: string;
  calendarDays: number;
  payableDays: number;
  unpaid: string[];
  missingPunches: string[];
  lines: PayLine[];
  issues: string[];
  rule: {
    version: string;
    basisPoints: number;
    ceilingPaise: number;
    roundingPaise: number;
  } | null;
  pfBasis: number;
  pf: number | null;
  gross: number;
  net: number | null;
  hash: string;
  assessment: Assessment | null;
  reviewerId: string | null;
}
export interface PayrollView {
  month: string;
  published: boolean;
  rows: PayRow[];
  hash: string;
  gross: number;
  net: number | null;
}
