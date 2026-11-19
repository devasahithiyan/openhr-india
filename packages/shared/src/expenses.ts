import { z } from "zod";
export const expenseCategories = [
  "Travel",
  "Meals",
  "Lodging",
  "Supplies",
  "Other",
] as const;
export const expenseItems = z
  .array(
    z.object({
      day: z.string().date(),
      category: z.enum(expenseCategories),
      paise: z.number().int().positive().max(1000000000),
      purpose: z.string().trim().min(1).max(500),
    }),
  )
  .min(1)
  .max(40);
const target = { id: z.string().uuid(), revision: z.number().int().positive() };
export const expenseCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), items: expenseItems }),
  z.object({ action: z.literal("resubmit"), ...target, items: expenseItems }),
  z.object({ action: z.literal("approve"), ...target }),
  z.object({
    action: z.literal("return"),
    ...target,
    reason: z.string().trim().min(1).max(500),
  }),
  z.object({
    action: z.literal("reimburse"),
    ...target,
    day: z.string().date(),
    reference: z.string().trim().min(1).max(120),
  }),
]);
export type ExpenseCommand = z.infer<typeof expenseCommand>;
export type ExpenseItem = z.infer<typeof expenseItems>[number];
export type ExpenseStatus =
  "Submitted" | "Returned" | "Approved" | "Reimbursed";
export interface ExpenseRecord {
  id: string;
  employeeName: string;
  items: ExpenseItem[];
  status: ExpenseStatus;
  revision: number;
  total: number;
  canReview: boolean;
  canEdit: boolean;
  canPay: boolean;
  paymentDay: string | null;
  paymentReference: string | null;
  history: { status: ExpenseStatus; at: string; note: string | null }[];
}
export interface ExpenseView {
  claims: ExpenseRecord[];
  outstanding: number | null;
}
