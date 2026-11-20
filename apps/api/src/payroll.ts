import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import {
  assessedSchema,
  canManageEmployees,
  chargeableDays,
  componentsSchema,
  payrollCommand,
  payrollMonth,
  type PayRow,
  type PayrollView,
} from "@openhr/shared";
import { SessionGuard, type AuthRequest, type Actor } from "./auth";
import { Database } from "./db";
import { earnings, monthEnd, pilot } from "./payroll-calculation";

const digest = (data: unknown) =>
  createHash("sha256").update(JSON.stringify(data)).digest("hex");
const txOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  timeout: 30000,
};
function view(month: string, rows: PayRow[], published: boolean): PayrollView {
  return {
    month,
    published,
    rows,
    hash: digest(rows.map((r) => [r.hash, r.assessment, r.reviewerId])),
    gross: rows.reduce((n, r) => n + r.gross, 0),
    net: rows.every((r) => r.net !== null)
      ? rows.reduce((n, r) => n + r.net!, 0)
      : null,
  };
}
async function register(
  tx: Prisma.TransactionClient,
  actor: Actor,
  month: string,
) {
  const { companyId } = actor;
  const writer = canManageEmployees(actor.role);
  const run = await tx.payrollRun.findUnique({
    where: { companyId_month: { companyId, month } },
  });
  if (run || !writer) {
    const slips =
      run && (writer || actor.employeeId)
        ? await tx.payslip.findMany({
            where: {
              companyId,
              month,
              ...(writer ? {} : { employeeId: actor.employeeId! }),
            },
            orderBy: { employeeId: "asc" },
          })
        : [];
    return view(
      month,
      slips.map((s) => s.snapshot as unknown as PayRow),
      Boolean(run && (writer || slips.length)),
    );
  }
  const start = month + "-01",
    end = monthEnd(month);
  const people = await tx.employee.findMany({
    where: {
      companyId,
      dateOfJoining: { lte: new Date(end) },
      OR: [{ endedOn: null }, { endedOn: { gte: start } }],
    },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      dateOfJoining: true,
      endedOn: true,
      branch: {
        select: {
          state: true,
          weekdays: true,
          holidays: {
            where: { day: { gte: start, lte: end } },
            select: { day: true },
          },
        },
      },
      salaries: {
        where: { effective: { lte: end } },
        orderBy: { effective: "desc" },
      },
      payrollReviews: { where: { month } },
      leave: {
        where: {
          start: { lte: end },
          end: { gte: start },
          status: { in: ["Pending", "Approved"] },
        },
        select: {
          days: true,
          status: true,
          type: { select: { unpaid: true } },
        },
      },
      corrections: {
        where: { day: { gte: start, lte: end }, status: "Pending" },
        select: { day: true },
      },
      attendance: {
        where: { day: { gte: start, lte: end }, checkOut: { not: null } },
        select: { day: true },
      },
    },
  });
  const rows = people.map((p) => {
    const joined = p.dateOfJoining.toISOString().slice(0, 10);
    const approved = p.leave.filter((l) => l.status === "Approved");
    const unpaid = [
      ...new Set(
        approved
          .filter((l) => l.type.unpaid)
          .flatMap((l) => l.days)
          .filter((d) => d >= start && d >= joined && d <= end),
      ),
    ].sort();
    const { missingSalary, ...pay } = earnings(
      month,
      joined,
      unpaid,
      p.salaries.map((s) => ({
        effective: s.effective,
        components: componentsSchema.parse(s.components),
      })),
    );
    const accounted = new Set([
      ...approved.flatMap((l) => l.days),
      ...p.attendance.map((a) => a.day),
    ]);
    const missingPunches = chargeableDays(
      joined > start ? joined : start,
      end,
      p.branch.weekdays,
      p.branch.holidays.map((h) => h.day),
    ).filter((d) => !accounted.has(d));
    const issues: string[] = [];
    if (p.endedOn && p.endedOn <= end)
      issues.push(
        "Departure month requires a final settlement review outside this pilot",
      );
    const supported =
      month >= pilot.from &&
      month <= pilot.through &&
      p.branch.state === pilot.state;
    if (!supported) issues.push("Outside the Tamil Nadu FY 2024–25 pilot");
    if (missingSalary)
      issues.push("Assign compensation covering every employed day");
    if (pay.gross > 0 && pay.pfBasis === 0)
      issues.push("Check PF wage components for this covered employee");
    if (
      p.leave.some(
        (l) =>
          l.status === "Pending" && l.days.some((d) => d >= start && d <= end),
      )
    )
      issues.push("Resolve pending leave");
    if (p.corrections.length)
      issues.push("Resolve pending attendance corrections");
    const inputs = {
      employeeId: p.id,
      name: p.name,
      code: p.code,
      state: p.branch.state,
      joined,
      month,
      unpaid,
      missingPunches,
      ...pay,
      issues,
      pf: supported ? pay.pf : null,
      rule: supported
        ? {
            version: pilot.version,
            basisPoints: pilot.basisPoints,
            ceilingPaise: pilot.ceilingPaise,
            roundingPaise: pilot.roundingPaise,
          }
        : null,
    };
    const hash = digest(inputs);
    const saved = p.payrollReviews[0];
    const assessment =
      saved?.inputHash === hash ? assessedSchema.parse(saved.deductions) : null;
    const other = assessment
      ? assessment.esi + assessment.pt + assessment.lwf + assessment.tds
      : 0;
    const net =
      assessment && inputs.pf !== null ? pay.gross - inputs.pf - other : null;
    return {
      ...inputs,
      issues:
        net !== null && net < 0
          ? [...issues, "Deductions exceed earnings"]
          : issues,
      hash,
      assessment,
      reviewerId: assessment ? saved!.reviewerId : null,
      net,
    };
  });
  return view(month, rows, false);
}
@Injectable()
export class PayrollRepository {
  constructor(@Inject(Database) private readonly db: Database) {}
  get(actor: Actor, value: unknown) {
    const month = payrollMonth.parse(value);
    return this.db.$transaction((tx) => register(tx, actor, month), txOptions);
  }
  async change(actor: Actor, body: unknown) {
    const { companyId } = actor;
    if (!canManageEmployees(actor.role))
      throw new ForbiddenException("Payroll access requires HR or Admin");
    const c = payrollCommand.parse(body);
    try {
      return await this.db.$transaction(async (tx) => {
        if (c.action === "salary") {
          await tx.salary.upsert({
            where: {
              companyId_employeeId_effective: {
                companyId,
                employeeId: c.employeeId,
                effective: c.effective,
              },
            },
            create: {
              companyId,
              employeeId: c.employeeId,
              effective: c.effective,
              components: c.components,
            },
            update: { components: c.components },
          });
          return { saved: true };
        }
        if (c.action === "publish" && actor.role !== "Admin")
          throw new ForbiddenException("Only an Admin may publish");
        const result = await register(tx, actor, c.month);
        if (result.published) {
          if (c.action === "publish") return result;
          throw new ConflictException("This payroll is closed");
        }
        if (c.action === "review") {
          const row = result.rows.find((r) => r.employeeId === c.employeeId);
          if (
            !row ||
            row.hash !== c.hash ||
            row.issues.length ||
            row.pf === null
          )
            throw new ConflictException(
              "Payroll inputs changed. Reload the preview.",
            );
          if (
            row.gross - row.pf <
            c.assessment.esi +
              c.assessment.pt +
              c.assessment.lwf +
              c.assessment.tds
          )
            throw new ConflictException("Deductions exceed earnings");
          const key = { companyId, month: c.month, employeeId: c.employeeId };
          const values = {
            inputHash: c.hash,
            deductions: c.assessment,
            reviewerId: actor.membershipId,
          };
          await tx.payrollReview.upsert({
            where: { companyId_month_employeeId: key },
            create: { ...key, ...values },
            update: values,
          });
          return { saved: true };
        }
        if (
          result.hash !== c.hash ||
          !result.rows.length ||
          result.rows.some((r) => r.issues.length || !r.assessment)
        )
          throw new ConflictException(
            "Refresh the register and resolve every employee review before publishing",
          );
        await tx.payrollRun.create({
          data: { companyId, month: c.month, approverId: actor.membershipId },
        });
        await tx.payslip.createMany({
          data: result.rows.map((r) => ({
            companyId,
            month: c.month,
            employeeId: r.employeeId,
            snapshot: JSON.parse(JSON.stringify(r)) as Prisma.InputJsonObject,
          })),
        });
        return { ...result, published: true };
      }, txOptions);
    } catch (error) {
      // A concurrent publish may have won the unique company/month key.
      if (
        c.action === "publish" &&
        actor.role === "Admin" &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2034"].includes(error.code)
      ) {
        const saved = await this.get(actor, c.month);
        if (saved.published) return saved;
      }
      throw error;
    }
  }
}
@Controller("payroll")
@UseGuards(SessionGuard)
export class PayrollController {
  constructor(
    @Inject(PayrollRepository) private readonly payroll: PayrollRepository,
  ) {}
  @Get() get(@Req() req: AuthRequest, @Query("month") month: unknown) {
    return this.payroll.get(req.actor, month);
  }
  @Post() change(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.payroll.change(req.actor, body);
  }
}
