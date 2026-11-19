import { z } from "zod";
import type { OnboardingAction } from "./onboarding-model";
const id = z.string().uuid(),
  text = z.string().trim().min(1).max(160);
const target = { employeeId: id, revision: z.number().int().positive() };
export const definition = z.object({
  title: text,
  owner: z.enum(["HR", "Manager", "Employee"]),
  offset: z.number().int().min(-90).max(180),
});
export const onboardCommand: z.ZodType<OnboardingAction> = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("template"),
      name: text,
      branchId: id.nullable(),
      departmentId: id.nullable(),
      definitions: z.array(definition).min(1).max(60),
    }),
    z.object({ action: z.literal("start"), employeeId: id, templateId: id }),
    z.object({
      action: z.literal("reschedule"),
      ...target,
      day: z.string().date(),
      previousJoining: z.string().date(),
    }),
    z.object({
      action: z.literal("complete"),
      ...target,
      index: z.number().int().nonnegative(),
    }),
  ],
);
