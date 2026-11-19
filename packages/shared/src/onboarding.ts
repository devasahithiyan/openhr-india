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
    z.object({
      action: z.literal("setup"),
      ...target,
      buddyId: id.nullable(),
      setup: z.object({
        schedule: z.string().trim().max(1000),
        welcomeUrl: z.string().trim().max(2000),
        policyTitle: z.string().trim().max(160),
        policyVersion: z.string().trim().max(80),
        policyUrl: z.string().trim().max(2000),
      }),
    }),
    z.object({ action: z.literal("acknowledge"), ...target }),
    z.object({
      action: z.literal("block"),
      ...target,
      note: z.string().trim().min(1).max(500),
    }),
    z.object({
      action: z.literal("resolve"),
      ...target,
      id: z.string().max(32),
      note: z.string().trim().min(1).max(500),
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
