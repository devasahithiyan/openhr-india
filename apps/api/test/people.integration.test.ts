import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Database } from "../src/db";
import { createApp } from "../src/app";
import { hashPassword } from "../src/security";

let app: INestApplication;
let db: Database;
const origin = "http://localhost:3000";
const suffix = randomUUID();
let companyId: string,
  otherCompanyId: string,
  userId: string,
  adminMemberId: string,
  managerMemberId: string,
  employeeMemberId: string;
let ownBranch: string,
  otherBranch: string,
  departmentId: string,
  designationId: string,
  managerId: string,
  employeeId: string,
  outsiderId: string;
let cookie: string, csrf: string;
const cookies = (res: request.Response) => {
  const raw = res.headers["set-cookie"];
  return (Array.isArray(raw) ? raw[0] : raw)?.split(";")[0] ?? "";
};
async function login(
  slug = `test-${suffix}`,
  email = `admin-${suffix}@example.test`,
  password = "Demo-only-1234",
) {
  return request(app.getHttpServer())
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ companySlug: slug, email, password });
}
const write = (
  path: string,
  body: object,
  method: "post" | "patch" = "post",
) => {
  const client = request(app.getHttpServer());
  const req = method === "post" ? client.post(path) : client.patch(path);
  return req
    .set("Origin", origin)
    .set("Cookie", cookie)
    .set("x-csrf-token", csrf)
    .send(body);
};
beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("_test"))
    throw new Error(
      "Set TEST_DATABASE_URL to a dedicated database whose name ends in _test",
    );
  process.env.DATABASE_URL = url;
  process.env.APP_ORIGIN = origin;
  process.env.DATA_ENCRYPTION_KEY = "a".repeat(64);
  app = await createApp();
  await app.init();
  db = app.get(Database);
  const company = await db.company.create({
    data: { name: "Test Company", slug: `test-${suffix}` },
  });
  companyId = company.id;
  const other = await db.company.create({
    data: { name: "Other Test Company", slug: `other-${suffix}` },
  });
  otherCompanyId = other.id;
  const user = await db.user.create({
    data: {
      email: `admin-${suffix}@example.test`,
      passwordHash: await hashPassword("Demo-only-1234"),
    },
  });
  userId = user.id;
  const member = await db.membership.create({
    data: { companyId, userId, role: "Admin" },
  });
  adminMemberId = member.id;
  const otherMember = await db.membership.create({
    data: { companyId: otherCompanyId, userId, role: "Admin" },
  });
  const own = await db.branch.create({
    data: { companyId, name: "Test Branch", state: "Tamil_Nadu" },
  });
  ownBranch = own.id;
  otherBranch = (
    await db.branch.create({
      data: {
        companyId: otherCompanyId,
        name: "Other Branch",
        state: "Karnataka",
      },
    })
  ).id;
  departmentId = (
    await db.department.create({ data: { companyId, name: "Operations" } })
  ).id;
  designationId = (
    await db.designation.create({ data: { companyId, name: "Associate" } })
  ).id;
  const signed = await login();
  expect(signed.status).toBe(200);
  cookie = cookies(signed);
  csrf = signed.body.csrfToken;
  expect(cookie).not.toBe("");
  expect(String(signed.headers["set-cookie"])).toContain("HttpOnly");
  const base = {
    dateOfJoining: "2026-04-01",
    branchId: ownBranch,
    departmentId,
    designationId,
  };
  managerId = (
    await write("/api/employees", {
      ...base,
      code: "MANAGER",
      name: "Demo Manager",
    })
  ).body.id;
  employeeId = (
    await write("/api/employees", {
      ...base,
      code: "REPORT",
      name: "Demo Employee",
      managerId,
      pan: "TESTP0000A",
      aadhaarLast4: "0000",
      uan: "000000000000",
      esic: "0000000000",
      bankAccount: "000000000000",
      ifsc: "TEST0000000",
    })
  ).body.id;
  outsiderId = (
    await write("/api/employees", {
      ...base,
      code: "OUTSIDER",
      name: "Demo Outsider",
    })
  ).body.id;
  const managerUser = await db.user.create({
    data: {
      email: `manager-${suffix}@example.test`,
      passwordHash: await hashPassword("Demo-only-1234"),
    },
  });
  managerMemberId = (
    await db.membership.create({
      data: {
        companyId,
        userId: managerUser.id,
        role: "Manager",
        employeeId: managerId,
      },
    })
  ).id;
  const employeeUser = await db.user.create({
    data: {
      email: `employee-${suffix}@example.test`,
      passwordHash: await hashPassword("Demo-only-1234"),
    },
  });
  employeeMemberId = (
    await db.membership.create({
      data: {
        companyId,
        userId: employeeUser.id,
        role: "Employee",
        employeeId,
      },
    })
  ).id;
  expect(otherMember.companyId).toBe(otherCompanyId);
});
afterAll(async () => {
  if (db && companyId) {
    await db.session.deleteMany({
      where: { companyId: { in: [companyId, otherCompanyId] } },
    });
    const memberships = await db.membership.findMany({
      where: { companyId: { in: [companyId, otherCompanyId] } },
    });
    await db.membership.deleteMany({
      where: { companyId: { in: [companyId, otherCompanyId] } },
    });
    await db.employee.updateMany({
      where: { companyId },
      data: { managerId: null },
    });
    await db.employeePrivate.deleteMany({ where: { companyId } });
    await db.employee.deleteMany({ where: { companyId } });
    await db.branch.deleteMany({
      where: { companyId: { in: [companyId, otherCompanyId] } },
    });
    await db.department.deleteMany({ where: { companyId } });
    await db.designation.deleteMany({ where: { companyId } });
    await db.company.deleteMany({
      where: { id: { in: [companyId, otherCompanyId] } },
    });
    await db.user.deleteMany({
      where: { id: { in: memberships.map((m) => m.userId) } },
    });
  }
  if (app) await app.close();
});
describe("real database Auth + People API", () => {
  it("requires login and rejects incorrect credentials without enumerating identities", async () => {
    expect(
      (await request(app.getHttpServer()).get("/api/employees")).status,
    ).toBe(401);
    const result = await login(undefined, undefined, "wrong");
    expect(result.status).toBe(401);
    expect(result.body.message).toBe("Company, email or password is incorrect");
  });
  it("requires same origin and CSRF for writes", async () => {
    const result = await request(app.getHttpServer())
      .post("/api/employees")
      .set("Cookie", cookie)
      .send({});
    expect(result.status).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .post("/api/employees")
          .set("Origin", origin)
          .set("Cookie", cookie)
          .send({})
      ).status,
    ).toBe(403);
  });
  it("returns persisted records with masked values, while ciphertext is stored", async () => {
    const r = await request(app.getHttpServer())
      .get(`/api/employees/${employeeId}`)
      .set("Cookie", cookie);
    expect(r.status).toBe(200);
    expect(r.body.sensitive.pan).toBe("••••000A");
    expect(r.body.sensitive.aadhaar).toBe("•••• •••• 0000");
    expect(JSON.stringify(r.body)).not.toContain("TESTP0000A");
    const stored = await db.employeePrivate.findUniqueOrThrow({
      where: { companyId_employeeId: { companyId, employeeId } },
    });
    expect(stored.pan).toMatch(/^v1\./);
    expect(stored.bankAccount).toMatch(/^v1\./);
    expect(stored.ifsc).toMatch(/^v1\./);
  });
  it("updates records and distinguishes preserve from clear", async () => {
    expect(
      (
        await write(
          `/api/employees/${employeeId}`,
          { name: "Updated Demo Employee" },
          "patch",
        )
      ).status,
    ).toBe(200);
    let r = await request(app.getHttpServer())
      .get(`/api/employees/${employeeId}`)
      .set("Cookie", cookie);
    expect(r.body.name).toBe("Updated Demo Employee");
    expect(r.body.sensitive.pan).toBe("••••000A");
    await write(`/api/employees/${employeeId}`, { uan: null }, "patch");
    r = await request(app.getHttpServer())
      .get(`/api/employees/${employeeId}`)
      .set("Cookie", cookie);
    expect(r.body.sensitive.uan).toBeNull();
  });
  it("rejects duplicate codes, full Aadhaar and tenant injection", async () => {
    expect(
      (
        await write(
          `/api/employees/${employeeId}`,
          { code: "MANAGER" },
          "patch",
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await write(
          `/api/employees/${employeeId}`,
          { aadhaarLast4: "000000000000" },
          "patch",
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await write(
          `/api/employees/${employeeId}`,
          { companyId: otherCompanyId },
          "patch",
        )
      ).status,
    ).toBe(400);
  });
  it("rejects cross-company references at API and database layers", async () => {
    expect(
      (
        await write(
          `/api/employees/${employeeId}`,
          { branchId: otherBranch },
          "patch",
        )
      ).status,
    ).toBe(400);
    await expect(
      db.employee.update({
        where: { id: employeeId },
        data: { branchId: otherBranch },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("prevents manager cycles and self-reporting", async () => {
    expect(
      (
        await write(
          `/api/employees/${managerId}`,
          { managerId: employeeId },
          "patch",
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await write(
          `/api/employees/${employeeId}`,
          { managerId: employeeId },
          "patch",
        )
      ).status,
    ).toBe(400);
  });
  it("binds shared identities to the selected company; hides foreign record IDs", async () => {
    const other = await login(`other-${suffix}`);
    expect(other.status).toBe(200);
    const otherCookie = cookies(other);
    const list = await request(app.getHttpServer())
      .get("/api/employees")
      .set("Cookie", otherCookie);
    expect(list.body.total).toBe(0);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/employees/${employeeId}`)
          .set("Cookie", otherCookie)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/employees/${employeeId}`)
          .set("Cookie", otherCookie)
          .set("Origin", origin)
          .set("x-csrf-token", other.body.csrfToken)
          .send({ name: "Intrusion" })
      ).status,
    ).toBe(404);
    await expect(
      db.membership.update({
        where: { id: managerMemberId },
        data: { employeeId, companyId: otherCompanyId },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("limits managers to self/direct reports and withholds report private fields", async () => {
    const signed = await login(undefined, `manager-${suffix}@example.test`);
    const c = cookies(signed);
    const list = await request(app.getHttpServer())
      .get("/api/employees")
      .set("Cookie", c);
    expect(list.body.total).toBe(2);
    expect(
      list.body.items.find((e: { id: string }) => e.id === employeeId),
    ).not.toHaveProperty("sensitive");
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/employees/${outsiderId}`)
          .set("Cookie", c)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/api/employees/${employeeId}`)
          .set("Cookie", c)
          .set("Origin", origin)
          .set("x-csrf-token", signed.body.csrfToken)
          .send({ name: "No" })
      ).status,
    ).toBe(403);
  });
  it("limits employees to self and applies role changes on existing sessions", async () => {
    const signed = await login(undefined, `employee-${suffix}@example.test`);
    const c = cookies(signed);
    expect(
      (
        await request(app.getHttpServer())
          .get("/api/employees")
          .set("Cookie", c)
      ).body.total,
    ).toBe(1);
    await db.membership.update({
      where: { id: employeeMemberId },
      data: { role: "HR" },
    });
    expect(
      (
        await request(app.getHttpServer())
          .get("/api/employees")
          .set("Cookie", c)
      ).body.total,
    ).toBe(3);
    expect(
      (
        await request(app.getHttpServer())
          .post("/api/references/departments")
          .set("Cookie", c)
          .set("Origin", origin)
          .set("x-csrf-token", signed.body.csrfToken)
          .send({ name: "HR-created" })
      ).status,
    ).toBe(201);
  });
  it("expires sessions and revokes logout tokens", async () => {
    const signed = await login();
    const c = cookies(signed);
    expect(
      (
        await request(app.getHttpServer())
          .post("/api/auth/logout")
          .set("Cookie", c)
          .set("Origin", origin)
          .set("x-csrf-token", signed.body.csrfToken)
      ).status,
    ).toBe(204);
    expect(
      (await request(app.getHttpServer()).get("/api/auth/me").set("Cookie", c))
        .status,
    ).toBe(401);
    await db.session.updateMany({
      where: { companyId, membershipId: adminMemberId },
      data: { expiresAt: new Date(0) },
    });
    expect(
      (
        await request(app.getHttpServer())
          .get("/api/auth/me")
          .set("Cookie", cookie)
      ).status,
    ).toBe(401);
  });
});
