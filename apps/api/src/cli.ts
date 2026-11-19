import { PrismaClient } from "@prisma/client";
import { loginSchema, passwordSchema, roles, type Role } from "@openhr/shared";
import { z } from "@openhr/shared";
import { hashPassword, verifyPassword } from "./security";
import { PeopleRepository } from "./people";
import { Database } from "./db";

const db = new PrismaClient();
async function provision(
  slug: string,
  name: string,
  email: string,
  password: string,
  role: Role,
  employeeCode?: string,
) {
  const login = loginSchema.parse({ companySlug: slug, email, password });
  passwordSchema.parse(password);
  z.string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80)
    .parse(slug);
  z.string().trim().min(1).max(120).parse(name);
  const existing = await db.user.findUnique({ where: { email: login.email } });
  if (existing && !(await verifyPassword(existing.passwordHash, password)))
    throw new Error(
      "Existing identities require their current password when adding membership",
    );
  const passwordHash = existing?.passwordHash ?? (await hashPassword(password));
  return db.$transaction(async (tx) => {
    const company = await tx.company.upsert({
      where: { slug },
      create: { slug, name },
      update: {},
    });
    const user = await tx.user.upsert({
      where: { email: login.email },
      create: { email: login.email, passwordHash },
      update: {},
    });
    const employee = employeeCode
      ? await tx.employee.findUnique({
          where: {
            companyId_code: { companyId: company.id, code: employeeCode },
          },
        })
      : null;
    if (employeeCode && !employee)
      throw new Error("Employee code not found in this company");
    if ((role === "Employee" || role === "Manager") && !employee)
      throw new Error("Employee and Manager accounts require an employee code");
    const member = await tx.membership.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      create: {
        companyId: company.id,
        userId: user.id,
        role,
        employeeId: employee?.id,
      },
      update: { role, employeeId: employee?.id ?? null },
    });
    await tx.session.deleteMany({
      where: { companyId: company.id, membershipId: member.id },
    });
    return company;
  });
}
async function seed() {
  if (process.env.NODE_ENV === "production" || process.env.DEMO_SEED !== "true")
    throw new Error(
      "Demo seed requires DEMO_SEED=true and is disabled in production",
    );
  const company = await provision(
    "demo",
    "Example Demo Company",
    "admin@example.test",
    "Demo-only-1234",
    "Admin",
  );
  const branch = await db.branch.upsert({
    where: { companyId_name: { companyId: company.id, name: "Demo Chennai" } },
    create: {
      companyId: company.id,
      name: "Demo Chennai",
      state: "Tamil_Nadu",
    },
    update: {},
  });
  const department = await db.department.upsert({
    where: {
      companyId_name: { companyId: company.id, name: "Demo Operations" },
    },
    create: { companyId: company.id, name: "Demo Operations" },
    update: {},
  });
  const designation = await db.designation.upsert({
    where: {
      companyId_name: { companyId: company.id, name: "Demo Associate" },
    },
    create: { companyId: company.id, name: "Demo Associate" },
    update: {},
  });
  const repo = new PeopleRepository(db as Database);
  const actor = {
    companyId: company.id,
    membershipId: "seed",
    role: "Admin" as const,
    employeeId: null,
  };
  let managerId: string | undefined;
  for (const [index, code] of ["DEMO001", "DEMO002"].entries()) {
    const existing = await db.employee.findUnique({
      where: { companyId_code: { companyId: company.id, code } },
    });
    const employee =
      existing ??
      (await repo.save(actor, {
        code,
        name: index === 0 ? "Demo Manager" : "Demo Employee",
        dateOfJoining: "2026-04-01",
        branchId: branch.id,
        departmentId: department.id,
        designationId: designation.id,
        managerId: managerId ?? null,
        pan: "TESTP0000A",
        aadhaarLast4: "0000",
        uan: "000000000000",
        esic: "0000000000",
        bankAccount: "000000000000",
        ifsc: "TEST0000000",
      }));
    if (index === 0) managerId = employee.id;
  }
  await provision(
    "demo",
    company.name,
    "hr@example.test",
    "Demo-only-1234",
    "HR",
  );
  await provision(
    "demo",
    company.name,
    "manager@example.test",
    "Demo-only-1234",
    "Manager",
    "DEMO001",
  );
  await provision(
    "demo",
    company.name,
    "employee@example.test",
    "Demo-only-1234",
    "Employee",
    "DEMO002",
  );
  const year = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
  );
  await db.leaveType.upsert({
    where: {
      companyId_year_name: {
        companyId: company.id,
        year,
        name: "Demo annual leave",
      },
    },
    create: {
      companyId: company.id,
      year,
      name: "Demo annual leave",
      openingDays: 12,
    },
    update: {},
  });
  await seedPayrollPilot();
  console.log("Demo seed ready. See README for fictional login credentials.");
}
async function seedPayrollPilot() {
  const slug = "payroll-demo",
    name = "Fictional Payroll Pilot",
    password = "Demo-only-1234";
  const company = await provision(
    slug,
    name,
    "admin@example.test",
    password,
    "Admin",
  );
  const companyId = company.id;
  const branch = await db.branch.upsert({
    where: { companyId_name: { companyId, name: "Demo Chennai" } },
    update: {},
    create: { companyId, name: "Demo Chennai", state: "Tamil_Nadu" },
  });
  const department = await db.department.upsert({
    where: { companyId_name: { companyId, name: "Demo Team" } },
    update: {},
    create: { companyId, name: "Demo Team" },
  });
  const designation = await db.designation.upsert({
    where: { companyId_name: { companyId, name: "Demo Role" } },
    update: {},
    create: { companyId, name: "Demo Role" },
  });
  for (const [code, label, joined] of [
    ["P001", "Demo Full Month", "2024-04-01"],
    ["P002", "Demo March Joiner", "2025-03-16"],
    ["P003", "Demo Unpaid Leave", "2024-04-01"],
  ] as const) {
    const employee = await db.employee.upsert({
      where: { companyId_code: { companyId, code } },
      update: {},
      create: {
        companyId,
        code,
        name: label,
        dateOfJoining: new Date(joined),
        branchId: branch.id,
        departmentId: department.id,
        designationId: designation.id,
      },
    });
    await db.salary.upsert({
      where: {
        companyId_employeeId_effective: {
          companyId,
          employeeId: employee.id,
          effective: joined,
        },
      },
      update: {},
      create: {
        companyId,
        employeeId: employee.id,
        effective: joined,
        components: [{ name: "Basic", monthly: 3100000, pfWage: true }],
      },
    });
    if (code === "P003") {
      const type = await db.leaveType.upsert({
        where: {
          companyId_year_name: {
            companyId,
            year: 2025,
            name: "Demo unpaid leave",
          },
        },
        update: {},
        create: {
          companyId,
          year: 2025,
          name: "Demo unpaid leave",
          unpaid: true,
          openingDays: 5,
        },
      });
      const id = "0a69935f-1967-4518-82d8-aed8789f0955";
      const approver = await db.membership.findFirstOrThrow({
        where: { companyId, role: "Admin" },
      });
      await db.leaveRequest.upsert({
        where: { id },
        update: {},
        create: {
          id,
          companyId,
          employeeId: employee.id,
          typeId: type.id,
          start: "2025-03-10",
          end: "2025-03-10",
          days: ["2025-03-10"],
          reason: "Fictional pilot example",
          status: "Approved",
          decidedBy: approver.id,
          decidedAt: new Date("2025-03-05"),
        },
      });
    }
  }
  await provision(slug, name, "hr@example.test", password, "HR");
  await provision(
    slug,
    name,
    "employee@example.test",
    password,
    "Employee",
    "P003",
  );
}
async function main() {
  const [command, slug, name, email, role = "Admin", employeeCode] =
    process.argv.slice(2);
  if (command === "seed") return seed();
  if (command === "account" && slug && name && email) {
    await provision(
      slug,
      name,
      email,
      passwordSchema.parse(process.env.OPENHR_PASSWORD),
      z.enum(roles).parse(role),
      employeeCode,
    );
    console.log("Company membership provisioned; prior sessions revoked.");
    return;
  }
  if (command === "password" && slug) {
    const normalized = z.string().email().parse(slug).toLowerCase();
    const passwordHash = await hashPassword(
      passwordSchema.parse(process.env.OPENHR_PASSWORD),
    );
    await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { email: normalized },
        data: { passwordHash },
      });
      await tx.session.deleteMany({
        where: { membership: { userId: user.id } },
      });
    });
    console.log("Password updated; all sessions revoked.");
    return;
  }
  throw new Error(
    'Usage: provision account <company-slug> "Company name" <email> [Admin|HR|Manager|Employee] [employee-code], or provision password <email>. Supply OPENHR_PASSWORD through the environment.',
  );
}
void main()
  .catch(() => {
    console.error(
      "Provisioning failed. Check arguments, password, database, demo opt-in and company employee linkage.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
