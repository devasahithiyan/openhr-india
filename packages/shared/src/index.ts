import { z } from "zod";

export const roles = ["Admin", "HR", "Manager", "Employee"] as const;
export type Role = (typeof roles)[number];
export const indianStates = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;
export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{5}[0-9]{4}[A-Z]$/,
    "PAN must contain five letters, four digits and a letter",
  );
export const ifscSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{4}0[A-Z0-9]{6}$/,
    "IFSC must contain four letters, zero and six letters or digits",
  );
const optionalIdentifier = (schema: z.ZodString) =>
  schema.nullable().optional();
export const privateFields = [
  "pan",
  "aadhaarLast4",
  "uan",
  "esic",
  "bankAccount",
  "ifsc",
] as const;
export const employeeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(1).max(120),
    dateOfJoining: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v,
        "Enter a valid joining date",
      ),
    branchId: z.string().uuid(),
    departmentId: z.string().uuid(),
    designationId: z.string().uuid(),
    managerId: z.string().uuid().nullable().optional(),
    pan: optionalIdentifier(panSchema),
    aadhaarLast4: optionalIdentifier(
      z.string().regex(/^\d{4}$/, "Enter only the last four Aadhaar digits"),
    ),
    uan: optionalIdentifier(
      z.string().regex(/^\d{12}$/, "UAN must have 12 digits"),
    ),
    esic: optionalIdentifier(
      z.string().regex(/^\d{10}$/, "ESIC number must have 10 digits"),
    ),
    bankAccount: optionalIdentifier(
      z.string().regex(/^\d{9,18}$/, "Bank account must have 9–18 digits"),
    ),
    ifsc: optionalIdentifier(ifscSchema),
  })
  .strict();
export const employeePatchSchema = employeeSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Supply at least one change");
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type EmployeePatch = z.infer<typeof employeePatchSchema>;
export const loginSchema = z
  .object({
    companySlug: z.string().trim().min(1).max(80),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();
export const passwordSchema = z.string().min(12).max(128);
export const referenceSchema = z
  .object({ name: z.string().trim().min(1).max(100) })
  .strict();
export const branchSchema = referenceSchema.extend({
  state: z.enum(indianStates),
});
export function canManageEmployees(role: Role): boolean {
  return role === "Admin" || role === "HR";
}
export function canReadEmployee(
  role: Role,
  ownId: string | null,
  target: { id: string; managerId: string | null },
): boolean {
  return (
    canManageEmployees(role) ||
    (!!ownId &&
      (target.id === ownId ||
        (role === "Manager" && target.managerId === ownId)))
  );
}
export interface Reference {
  id: string;
  name: string;
  state?: string;
}
export interface EmployeeRecord {
  id: string;
  code: string;
  name: string;
  dateOfJoining: string;
  branchId: string;
  departmentId: string;
  designationId: string;
  managerId: string | null;
  manager?: { id: string; name: string; code: string } | null;
  branch: Reference;
  department: Reference;
  designation: Reference;
  sensitive?: {
    pan: string | null;
    aadhaar: string | null;
    uan: string | null;
    esic: string | null;
    bankAccount: string | null;
    ifsc: string | null;
  };
}
export interface AuthUser {
  email: string;
  role: Role;
  employeeId: string | null;
  company: { id: string; name: string; slug: string };
  csrfToken: string;
}
export interface ReferenceData {
  branches: Reference[];
  departments: Reference[];
  designations: Reference[];
  managers: { id: string; name: string; code: string }[];
}

export { z, ZodError } from "zod";
