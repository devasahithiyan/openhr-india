import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  indiaDay,
  projectWork,
  transition,
  workCommandSchema,
  managerValid,
  makeTasks,
  definition,
  type WorkData,
  type WorkRow,
  type WorkActor,
  type Readiness,
  type WorkResult,
} from "@openhr/shared";
import { Database } from "./db";
import { SessionGuard, type AuthRequest } from "./auth";
type Tx = Prisma.TransactionClient;
const options = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  timeout: 30000,
};
export async function loadWork(tx: Tx, companyId: string): Promise<WorkData> {
  const where = { companyId },
    select = { id: true, name: true };
  const [
    company,
    people,
    stored,
    branches,
    departments,
    designations,
    hr,
    templates,
    policies,
    claims,
    plans,
    leaves,
    attendance,
  ] = await Promise.all([
    tx.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true },
    }),
    tx.employee.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        dateOfJoining: true,
        branchId: true,
        departmentId: true,
        designationId: true,
        managerId: true,
        endedOn: true,
      },
      orderBy: { name: "asc" },
    }),
    tx.workRecord.findMany({ where, orderBy: { id: "asc" } }),
    tx.branch.findMany({ where, select }),
    tx.department.findMany({ where, select }),
    tx.designation.findMany({ where, select }),
    tx.membership.findMany({
      where: { ...where, role: { in: ["HR", "Admin"] }, disabledAt: null },
      select: { id: true, user: { select: { email: true } } },
    }),
    tx.onboardingTemplate.findMany({ where, select }),
    tx.leaveType.findMany({
      where,
      select: { id: true, name: true, year: true, openingDays: true },
    }),
    tx.expenseClaim.findMany({
      where: { ...where, status: { not: "Reimbursed" } },
      select: {
        id: true,
        employeeId: true,
        status: true,
        items: true,
        employee: {
          select: { name: true, manager: { select: { name: true } } },
        },
      },
    }),
    tx.onboardingPlan.findMany({
      where: { ...where, readiness: { not: Prisma.DbNull } },
      select: { employeeId: true, readiness: true },
    }),
    tx.leaveRequest.findMany({
      where: { ...where, status: { in: ["Pending", "Approved"] } },
      select: { employeeId: true, typeId: true, status: true, days: true },
    }),
    tx.attendance.findMany({
      where,
      select: { employeeId: true, day: true, checkIn: true, checkOut: true },
    }),
  ]);
  const records = stored.map((s) => s.payload as unknown as WorkRow);
  return {
    company: company.name,
    today: indiaDay(new Date()),
    people: people.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      joined: p.dateOfJoining.toISOString().slice(0, 10),
      manager: p.managerId ?? "",
      branch: p.branchId,
      department: p.departmentId,
      designation: p.designationId,
      ended: p.endedOn,
    })),
    records,
    branches,
    departments,
    designations,
    hr: hr.map((m) => ({ id: m.id, name: m.user.email })),
    templates,
    policies: policies.map((p) => ({ ...p, opening: p.openingDays })),
    claims: claims.map((c) => ({
      id: c.id,
      employeeId: c.employeeId,
      status: c.status,
      paise: (c.items as { paise: number }[]).reduce((n, i) => n + i.paise, 0),
      owner:
        c.status === "Returned"
          ? c.employee.name
          : c.status === "Submitted"
            ? (c.employee.manager?.name ?? "HR")
            : "HR",
    })),
    issued: plans.flatMap((p) =>
      ((p.readiness as unknown as Readiness)?.equipment ?? []).map((e) => ({
        employeeId: p.employeeId,
        asset: e.asset,
        item: e.item,
      })),
    ),
    absences: leaves.map((l) => ({ ...l, policy: l.typeId })),
    punches: attendance.map((p) => ({
      ...p,
      checkIn: p.checkIn.toISOString(),
      checkOut: p.checkOut?.toISOString() ?? null,
    })),
  };
}
export async function persist(tx: Tx, companyId: string, row: WorkRow) {
  const fields = {
    kind: row.kind,
    employeeId: row.employeeId,
    assignedId: row.assignedId,
    revision: row.revision,
    payload: row as unknown as Prisma.InputJsonObject,
  };
  if (row.revision === 1)
    await tx.workRecord.create({ data: { id: row.id, companyId, ...fields } });
  else if (
    !(
      await tx.workRecord.updateMany({
        where: { companyId, id: row.id, revision: row.revision - 1 },
        data: fields,
      })
    ).count
  )
    throw new ConflictException("Record changed. Refresh before retrying");
}
async function applyTransfer(
  tx: Tx,
  companyId: string,
  row: WorkRow,
  d: WorkData,
) {
  const v = row.values,
    p = d.people.find((p) => p.id === row.employeeId);
  if (!p || p.ended) throw new Error("Employee has left");
  managerValid(d, p.id, v.manager ?? "");
  await tx.employee.update({
    where: { companyId_id: { companyId, id: p.id } },
    data: {
      branchId: v.branch,
      departmentId: v.department,
      designationId: v.designation,
      managerId: v.manager || null,
    },
  });
  row.status = "Applied";
  row.history.push({
    at: new Date().toISOString(),
    actor: "Scheduler",
    action: "Applied assignment",
    values: {
      previousBranch: p.branch,
      previousDepartment: p.department,
      previousDesignation: p.designation,
      previousManager: p.manager,
    },
  });
}
@Injectable()
export class WorkforceRepository implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(@Inject(Database) private readonly db: Database) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.scheduled().catch(() =>
        console.error(
          "Scheduled workforce update failed; retrying on the next scan",
        ),
      );
    }, 60000);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  async scheduled() {
    if (this.running) return;
    this.running = true;
    try {
      const list = await this.db.workRecord.findMany({
        where: {
          kind: "transfer",
          payload: { path: ["status"], equals: "Scheduled" },
        },
        select: { companyId: true, id: true, payload: true },
      });
      for (const s of list) {
        if (
          (s.payload as unknown as WorkRow).values.day! > indiaDay(new Date())
        )
          continue;
        await this.db.$transaction(async (tx) => {
          const d = await loadWork(tx, s.companyId),
            r = d.records.find((x) => x.id === s.id)!;
          if (r.status !== "Scheduled") return;
          r.revision++;
          try {
            await applyTransfer(tx, s.companyId, r, d);
          } catch (e) {
            if (
              !(e instanceof Error) ||
              e instanceof Prisma.PrismaClientKnownRequestError
            )
              throw e;
            r.status = "Needs review";
            r.history.push({
              at: new Date().toISOString(),
              actor: "Scheduler",
              action: "Cannot apply assignment",
              values: { note: e.message },
            });
          }
          await persist(tx, s.companyId, r);
        }, options);
      }
    } finally {
      this.running = false;
    }
  }
  read(a: WorkActor & { companyId: string }) {
    return this.db.$transaction(
      async (tx) => projectWork(await loadWork(tx, a.companyId), a),
      options,
    );
  }
  async write(a: WorkActor & { companyId: string }, body: unknown) {
    const c = workCommandSchema.parse(body),
      { companyId } = a;
    return this.db.$transaction(async (tx) => {
      const d = await loadWork(tx, companyId);
      let result: WorkResult;
      try {
        result = transition(d, a, c, new Date().toISOString());
      } catch (e) {
        throw new ConflictException((e as Error).message);
      }
      const { row, other } = result,
        v = row.values;
      if (c.action === "closeExit") {
        await tx.employee.update({
          where: { companyId_id: { companyId, id: row.employeeId! } },
          data: { endedOn: v.last },
        });
        const where = { companyId, employeeId: row.employeeId! };
        await tx.membership.updateMany({
          where,
          data: { disabledAt: new Date() },
        });
        await tx.session.deleteMany({
          where: { companyId, membership: where },
        });
      } else if (c.action === "reassign")
        await tx.employee.update({
          where: { companyId_id: { companyId, id: v.report! } },
          data: { managerId: v.manager },
        });
      else if (c.action === "returnAsset") {
        const inventory = d.records.find(
          (r) =>
            r.kind === "asset" &&
            r.employeeId === row.employeeId &&
            r.values.assetTag === v.asset,
        );
        const inventoryRow: WorkRow = inventory ?? {
          id: randomUUID(),
          kind: "asset",
          employeeId: null,
          assignedId: null,
          status: "",
          revision: 0,
          history: [],
          values: {
            assetTag: v.asset!,
            name:
              d.issued.find(
                (i) => i.asset === v.asset && i.employeeId === row.employeeId,
              )?.item ?? v.asset!,
          },
        };
        inventoryRow.employeeId = null;
        inventoryRow.revision++;
        inventoryRow.status =
          v.result === "Returned" ? "In stock" : "Exception";
        inventoryRow.history.push({
          ...row.history.at(-1)!,
          values: { ...c.values, employee: row.employeeId! },
        });
        await persist(tx, companyId, inventoryRow);
      } else if (c.action === "hire") {
        const pos = d.records.find((r) => r.id === v.position)!,
          t = await tx.onboardingTemplate.findUniqueOrThrow({
            where: { companyId_id: { companyId, id: v.template! } },
          });
        if (
          (t.branchId && t.branchId !== pos.values.branch) ||
          (t.departmentId && t.departmentId !== pos.values.department)
        )
          throw new BadRequestException("Choose a template for this position");
        const template = {
          ...t,
          definitions: definition.array().parse(t.definitions),
        };
        if (
          !v.manager &&
          template.definitions.some((t) => t.owner === "Manager")
        )
          throw new BadRequestException("Select a reporting manager");
        const emp = await tx.employee.create({
          data: {
            companyId,
            name: v.name!,
            code: v.code!,
            dateOfJoining: new Date(v.joined!),
            branchId: pos.values.branch!,
            departmentId: pos.values.department!,
            designationId: pos.values.designation!,
            managerId: v.manager || null,
          },
        });
        await tx.onboardingPlan.create({
          data: {
            companyId,
            employeeId: emp.id,
            templateId: t.id,
            startedFor: v.joined!,
            tasks: makeTasks(template, v.joined!),
          },
        });
        row.employeeId = emp.id;
      } else if (c.action === "transfer" && v.day! <= d.today)
        await applyTransfer(tx, companyId, row, d);
      await persist(tx, companyId, row);
      if (other) await persist(tx, companyId, other);
      return { id: row.id, revision: row.revision };
    }, options);
  }
}
@Controller("workforce")
@UseGuards(SessionGuard)
export class WorkforceController {
  constructor(
    @Inject(WorkforceRepository) private readonly repo: WorkforceRepository,
  ) {}
  @Get() get(@Req() r: AuthRequest) {
    return this.repo.read(r.actor);
  }
  @Post() post(@Req() r: AuthRequest, @Body() c: unknown) {
    return this.repo.write(r.actor, c);
  }
}
