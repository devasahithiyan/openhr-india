import type { OnboardingData } from "@openhr/shared";
import type { ExpenseView } from "@openhr/shared";
import type { PayRow, PayrollView } from "@openhr/shared";
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
    await db.payslip.deleteMany({ where: { companyId } });
    await db.payrollRun.deleteMany({ where: { companyId } });
    await db.payrollReview.deleteMany({ where: { companyId } });
    await db.salary.deleteMany({ where: { companyId } });
    await db.onboardingPlan.deleteMany({ where: { companyId } });
    await db.onboardingTemplate.deleteMany({ where: { companyId } });
    await db.expenseEvent.deleteMany({ where: { companyId } });
    await db.expenseClaim.deleteMany({ where: { companyId } });
    await db.correction.deleteMany({ where: { companyId } });
    await db.attendance.deleteMany({ where: { companyId } });
    await db.leaveRequest.deleteMany({ where: { companyId } });
    await db.leaveType.deleteMany({ where: { companyId } });
    await db.holiday.deleteMany({ where: { companyId } });
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
  it("returns only visible reporting lines and directory fields in the org chart", async () => {
    const chart = (cookie: string) =>
      request(app.getHttpServer())
        .get("/api/organization")
        .set("Cookie", cookie)
        .expect(200);
    const employee = await login(undefined, `employee-${suffix}@example.test`);
    const manager = await login(undefined, `manager-${suffix}@example.test`);
    const ownNode = {
      id: employeeId,
      code: "REPORT",
      name: expect.any(String),
      managerId: null,
      department: { name: "Operations" },
      designation: { name: "Associate" },
    };
    expect((await chart(cookies(employee))).body).toEqual([ownNode]);
    const team = (await chart(cookies(manager))).body;
    expect(team).toHaveLength(2);
    expect(team).toContainEqual({ ...ownNode, managerId });
    expect((await chart(cookie)).body).toContainEqual(
      expect.objectContaining({ id: outsiderId }),
    );
    expect((await chart(cookies(await login(`other-${suffix}`)))).body).toEqual(
      [],
    );
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
  it("persists branch-aware leave, reserves balances and restricts approval", async () => {
    const signed = await login(undefined, `employee-${suffix}@example.test`),
      manager = await login(undefined, `manager-${suffix}@example.test`),
      foreign = await login(`other-${suffix}`);
    const act = (session: request.Response, body: object) =>
      request(app.getHttpServer())
        .post("/api/time")
        .set("Cookie", cookies(session))
        .set("Origin", origin)
        .set("x-csrf-token", session.body.csrfToken)
        .send(body);
    const read = (session: request.Response, path = "/api/time") =>
      request(app.getHttpServer()).get(path).set("Cookie", cookies(session));
    expect(
      (
        await write("/api/time", {
          action: "type",
          year: 2026,
          name: "Test leave",
          openingDays: 2,
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await write("/api/time", {
          action: "holiday",
          day: "2026-11-23",
          branchId: ownBranch,
          name: "Test holiday",
        })
      ).status,
    ).toBe(201);
    const typeId = (await read(signed)).body.types[0].id;
    const apply = {
      action: "apply",
      typeId,
      start: "2026-11-20",
      end: "2026-11-23",
      reason: "private test reason",
    };
    expect((await act(signed, apply)).status).toBe(201);
    const first = (await read(signed)).body;
    expect(first.types[0].pending).toBe(1);
    expect((await act(signed, apply)).status).toBe(400);
    expect(
      (await act(signed, { action: "withdraw", id: first.leaves[0].id }))
        .status,
    ).toBe(201);
    expect((await read(signed)).body.types[0].pending).toBe(0);
    expect((await act(signed, apply)).status).toBe(201);
    const id = (await read(manager)).body.leaves[0].id;
    const decision = { action: "leaveDecision", id, approve: true };
    expect((await act(signed, decision)).status).toBe(404);
    expect((await act(foreign, decision)).status).toBe(404);
    expect((await act(manager, decision)).status).toBe(201);
    expect((await act(manager, decision)).status).toBe(409);
    const after = await read(
      await login(undefined, `employee-${suffix}@example.test`),
    );
    expect(after.body.types[0]).toMatchObject({ used: 1, pending: 0 });
    const calendar = await read(manager, "/api/time?section=calendar");
    expect(calendar.body.leaves).toHaveLength(1);
    expect(JSON.stringify(calendar.body)).not.toContain("private test reason");
    expect((await read(foreign)).body.leaves).toEqual([]);
  });
  it("records daily punches and applies corrections only after an authorised decision", async () => {
    const employee = await login(undefined, `employee-${suffix}@example.test`),
      manager = await login(undefined, `manager-${suffix}@example.test`);
    const act = (s: request.Response, body: object) =>
      request(app.getHttpServer())
        .post("/api/time")
        .set("Cookie", cookies(s))
        .set("Origin", origin)
        .set("x-csrf-token", s.body.csrfToken)
        .send(body);
    expect(
      (await act(employee, { action: "clock", direction: "out" })).status,
    ).toBe(400);
    expect(
      (await act(employee, { action: "clock", direction: "in" })).status,
    ).toBe(201);
    expect(
      (await act(employee, { action: "clock", direction: "in" })).status,
    ).toBe(409);
    expect(
      (await act(employee, { action: "clock", direction: "out" })).status,
    ).toBe(201);
    const body = {
      action: "correct",
      day: "2026-04-02",
      checkIn: "2026-04-02T04:00:00Z",
      checkOut: "2026-04-02T12:00:00Z",
      reason: "Missed entry",
    };
    expect((await act(employee, body)).status).toBe(201);
    expect((await act(employee, body)).status).toBe(400);
    const filter = { companyId, employeeId, day: body.day };
    expect(await db.attendance.count({ where: filter })).toBe(0);
    const { id } = await db.correction.findFirstOrThrow({ where: filter });
    const decision = { action: "correctionDecision", id, approve: true };
    expect((await act(employee, decision)).status).toBe(404);
    expect((await act(manager, decision)).status).toBe(201);
    expect(
      (
        await db.attendance.findFirstOrThrow({ where: filter })
      ).checkOut?.toISOString(),
    ).toBe("2026-04-02T12:00:00.000Z");
  });
  it("closes and reconciles a reviewed pilot month exactly once, with isolated immutable payslips", async () => {
    const month = "2025-03";
    const employeeSession = await login(
      undefined,
      `employee-${suffix}@example.test`,
    );
    const other = await login(`other-${suffix}`);
    const read = async (c = cookie, m = month): Promise<PayrollView> => {
      const res = await request(app.getHttpServer())
        .get("/api/payroll")
        .query({ month: m })
        .set("Cookie", c)
        .expect(200);
      return res.body;
    };
    const command = (body: object) => write("/api/payroll", body);
    const salary = (
      employeeId: string,
      effective: string,
      monthly = 3100000,
    ) => ({
      action: "salary",
      employeeId,
      effective,
      components: [{ name: "Basic", monthly, pfWage: true }],
    });
    const publish = (hash: string) =>
      command({ action: "publish", month, hash });
    await db.employee.updateMany({
      where: { companyId },
      data: { dateOfJoining: new Date("2025-03-01") },
    });
    await db.employee.update({
      where: { id: managerId },
      data: { dateOfJoining: new Date("2025-03-16") },
    });
    const initial = await read();
    expect(initial.rows).toHaveLength(3);
    expect(
      initial.rows.every((r) =>
        r.issues.some((i) => i.includes("compensation")),
      ),
    ).toBe(true);
    expect((await publish(initial.hash)).status).toBe(409);
    expect((await read(cookies(employeeSession))).rows).toEqual([]);
    expect((await read(cookies(other))).rows).toEqual([]);
    const denied = (signed: request.Response, body: object) =>
      request(app.getHttpServer())
        .post("/api/payroll")
        .set("Origin", origin)
        .set("Cookie", cookies(signed))
        .set("x-csrf-token", signed.body.csrfToken)
        .send(body);
    expect(
      (await denied(employeeSession, salary(employeeId, "2025-03-01"))).status,
    ).toBe(403);
    expect((await denied(other, salary(employeeId, "2025-03-01"))).status).toBe(
      400,
    );
    for (const row of initial.rows)
      expect((await command(salary(row.employeeId, row.joined))).status).toBe(
        201,
      );
    const type = await db.leaveType.create({
      data: {
        companyId,
        year: 2025,
        name: "Fictional unpaid",
        openingDays: 5,
        unpaid: true,
      },
    });
    const leave = await db.leaveRequest.create({
      data: {
        companyId,
        employeeId,
        typeId: type.id,
        start: "2025-03-10",
        end: "2025-03-10",
        days: ["2025-03-10"],
        reason: "Fictional example",
      },
    });
    expect(
      (await read()).rows.find((r) => r.employeeId === employeeId)?.issues,
    ).toContain("Resolve pending leave");
    await db.leaveRequest.update({
      where: { id: leave.id },
      data: { status: "Approved", decidedBy: adminMemberId },
    });
    const ready = await read();
    expect(ready.gross).toBe(7700000);
    expect(ready.net).toBeNull();
    expect(ready.rows.find((r) => r.employeeId === employeeId)).toMatchObject({
      unpaid: ["2025-03-10"],
      payableDays: 30,
      gross: 3000000,
    });
    expect((await read(cookie, "2025-04")).rows[0]).toMatchObject({
      rule: null,
      pf: null,
    });
    const review = (r: PayRow) =>
      command({
        action: "review",
        month,
        employeeId: r.employeeId,
        hash: r.hash,
        assessment: {
          esi: 0,
          pt: 2000,
          lwf: 0,
          tds: 0,
          reference: "Demo worksheet",
          standardCappedPF: true,
        },
      });
    for (const r of ready.rows) expect((await review(r)).status).toBe(201);
    const reviewed = await read();
    expect(reviewed.net).toBe(7154000);
    await command(salary(outsiderId, "2025-03-31", 6200000));
    expect((await publish(reviewed.hash)).status).toBe(409);
    const updated = await read();
    const changed = updated.rows.find((r) => r.employeeId === outsiderId)!;
    expect(changed.assessment).toBeNull();
    expect((await review(changed)).status).toBe(201);
    const final = await read();
    const simultaneous = await Promise.all([
      publish(final.hash),
      publish(final.hash),
    ]);
    expect(simultaneous.map((r) => r.status)).toEqual([201, 201]);
    const locked = await read();
    expect(locked.published).toBe(true);
    expect(locked.net).toBe(locked.rows.reduce((n, r) => n + r.net!, 0));
    expect((await publish(final.hash)).status).toBe(201);
    expect(await db.payslip.count({ where: { companyId, month } })).toBe(3);
    await command(salary(employeeId, "2025-03-01", 8000000));
    await db.attendance.create({
      data: {
        companyId,
        employeeId,
        day: "2025-03-03",
        checkIn: new Date("2025-03-03T05:00:00Z"),
        checkOut: new Date("2025-03-03T12:00:00Z"),
      },
    });
    expect(await read()).toEqual(locked);
    expect(
      (await read(cookies(employeeSession))).rows.map((r) => r.employeeId),
    ).toEqual([employeeId]);
    expect((await read(cookies(other))).rows).toEqual([]);
  });
  it("routes itemized claims, returns for revision and records exactly one reimbursement", async () => {
    const emp = await login(undefined, `employee-${suffix}@example.test`);
    const manager = await login(undefined, `manager-${suffix}@example.test`);
    const foreign = await login(`other-${suffix}`);
    const act = (session: request.Response, body: object) =>
      request(app.getHttpServer())
        .post("/api/expenses")
        .set("Cookie", cookies(session))
        .set("Origin", origin)
        .set("x-csrf-token", session.body.csrfToken)
        .send(body);
    const list = async (c: string): Promise<ExpenseView> =>
      (
        await request(app.getHttpServer())
          .get("/api/expenses")
          .set("Cookie", c)
          .expect(200)
      ).body;
    const items = [
      {
        day: "2026-04-02",
        category: "Travel",
        paise: 70000,
        purpose: "Client visit",
      },
      { day: "2026-04-02", category: "Meals", paise: 15000, purpose: "Lunch" },
    ];
    expect((await act(emp, { action: "submit", items: [] })).status).toBe(400);
    const { id } = (await act(emp, { action: "submit", items }).expect(201))
      .body;
    expect((await list(cookies(manager))).claims[0]).toMatchObject({
      total: 85000,
      canReview: true,
    });
    expect((await list(cookies(foreign))).claims).toHaveLength(0);
    expect(
      (await act(foreign, { action: "approve", id, revision: 1 })).status,
    ).toBe(404);
    expect(
      (await act(emp, { action: "approve", id, revision: 1 })).status,
    ).toBe(403);
    expect(
      (await write("/api/expenses", { action: "approve", id, revision: 1 }))
        .status,
    ).toBe(403);
    await act(manager, {
      action: "return",
      id,
      revision: 1,
      reason: "Specify the customer meeting",
    }).expect(201);
    items[0]!.purpose = "Demo client design review";
    await act(emp, { action: "resubmit", id, revision: 2, items }).expect(201);
    await act(manager, { action: "approve", id, revision: 1 }).expect(409);
    await act(manager, { action: "approve", id, revision: 3 }).expect(201);
    expect((await list(cookie)).outstanding).toBe(85000);
    const payment = {
      action: "reimburse",
      id,
      revision: 4,
      day: "2026-04-03",
      reference: "DEMO-EXP-001",
    };
    await act(manager, payment).expect(403);
    const paid = await Promise.all([
      write("/api/expenses", payment),
      write("/api/expenses", payment),
    ]);
    expect(paid.map((r) => r.status)).toEqual([201, 201]);
    expect(
      (await write("/api/expenses", { ...payment, reference: "DIFFERENT" }))
        .status,
    ).toBe(409);
    expect((await list(cookie)).outstanding).toBe(0);
    const claim = (await list(cookies(emp))).claims[0]!;
    expect(claim.history.map((e) => e.status)).toEqual([
      "Submitted",
      "Returned",
      "Submitted",
      "Approved",
      "Reimbursed",
    ]);
    expect(claim.paymentReference).toBe("DEMO-EXP-001");
    const own = (await act(manager, { action: "submit", items })).body.id;
    await act(manager, { action: "approve", id: own, revision: 1 }).expect(403);
    expect(
      (
        await write("/api/expenses", {
          action: "approve",
          id: own,
          revision: 1,
        })
      ).status,
    ).toBe(201);
    expect((await list(cookies(emp))).claims).toHaveLength(1);
  });
  it("applies scoped onboarding templates once and only shifts unfinished deadlines", async () => {
    const employee = await login(undefined, `employee-${suffix}@example.test`);
    const foreign = await login(`other-${suffix}`);
    const read = async (c = cookie): Promise<OnboardingData> =>
      (
        await request(app.getHttpServer())
          .get("/api/onboarding")
          .set("Cookie", c)
          .expect(200)
      ).body;
    const post = (cmd: object) => write("/api/onboarding", cmd);
    const as = (s: request.Response, cmd: object) =>
      request(app.getHttpServer())
        .post("/api/onboarding")
        .set("Cookie", cookies(s))
        .set("Origin", origin)
        .set("x-csrf-token", s.body.csrfToken)
        .send(cmd);
    const template = {
      action: "template",
      name: "Design week",
      branchId: ownBranch,
      departmentId,
      definitions: [
        { title: "Welcome", owner: "Employee", offset: 0 },
        { title: "Prepare desk", owner: "HR", offset: -2 },
      ],
    };
    await as(employee, template).expect(403);
    await as(foreign, template).expect(400);
    const { id: templateId } = (await post(template)).body;
    const start = { action: "start", employeeId, templateId };
    expect((await post(start)).status).toBe(201);
    const getPlan = async () =>
      (await read()).plans.find((p) => p.employeeId === employeeId)!;
    const original = await getPlan();
    await as(employee, {
      action: "complete",
      employeeId,
      index: 1,
      revision: 1,
    }).expect(409);
    await as(employee, {
      action: "complete",
      employeeId,
      index: 0,
      revision: 1,
    }).expect(201);
    expect((await post(start)).status).toBe(201);
    expect((await getPlan()).revision).toBe(2);
    expect((await read(cookies(foreign))).plans).toEqual([]);
    const shift = {
      action: "reschedule",
      employeeId,
      revision: 2,
      day: "2026-04-09",
      previousJoining: original.startedFor,
    };
    expect((await post(shift)).status).toBe(201);
    expect((await getPlan()).tasks.map((t) => t.due)).toEqual([
      original.tasks[0]!.due,
      "2026-04-07",
    ]);
    expect((await post(shift)).status).toBe(409);
    const setup = {
      action: "setup",
      employeeId,
      revision: 3,
      buddyId: outsiderId,
      setup: {
        schedule: "09:30 team welcome",
        welcomeUrl: "https://example.test/welcome",
        policyTitle: "Handbook",
        policyVersion: "1",
        policyUrl: "https://example.test/v1",
      },
    };
    await as(employee, setup).expect(403);
    expect(
      (
        await post({
          ...setup,
          setup: { ...setup.setup, welcomeUrl: "javascript:alert(1)" },
        })
      ).status,
    ).toBe(409);
    expect((await post(setup)).status).toBe(201);
    const own = await read(cookies(employee));
    expect(own.contacts.map((c) => c.id).sort()).toEqual(
      [outsiderId, managerId].sort(),
    );
    expect(own.people.map((p) => p.id)).toEqual([employeeId]);
    await as(employee, {
      action: "acknowledge",
      employeeId,
      revision: 4,
    }).expect(201);
    await as(employee, {
      action: "block",
      employeeId,
      revision: 5,
      note: "Missing laptop",
    }).expect(201);
    const week = (await getPlan()).week!;
    expect(week.acknowledgements[0]).toMatchObject({
      policyVersion: "1",
      by: employeeMemberId,
    });
    const resolve = {
      action: "resolve",
      employeeId,
      revision: 6,
      id: week.blockers[0]!.id,
      note: "Laptop ready",
    };
    await as(employee, resolve).expect(403);
    expect((await post(resolve)).status).toBe(201);
    expect((await getPlan()).week!.blockers[0]!.resolvedBy).toBe(adminMemberId);
    const close = {
      action: "close",
      employeeId,
      revision: 7,
      note: "Ready for first week",
    };
    expect((await post(close)).status).toBe(409);
    const handover = {
      action: "handover",
      employeeId,
      revision: 7,
      item: "Laptop",
      asset: "DEMO-001",
    };
    await as(employee, handover).expect(403);
    expect((await post(handover)).status).toBe(201);
    expect((await post({ ...handover, revision: 8 })).status).toBe(409);
    expect(
      (await post({ action: "complete", employeeId, index: 1, revision: 8 }))
        .status,
    ).toBe(201);
    expect((await post({ ...close, revision: 9 })).status).toBe(201);
    const closed = await getPlan();
    expect(closed.closedAt).toBeTruthy();
    expect(closed.readiness?.review?.by).toBe(adminMemberId);
    expect(
      (await post({ ...handover, revision: 10, asset: "DEMO-002" })).status,
    ).toBe(409);
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
