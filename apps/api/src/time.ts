import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  canManageEmployees,
  chargeableDays,
  indiaDay,
  timeCommand,
  type TimeView,
} from "@openhr/shared";
import { Database } from "./db";
import { type Actor, type AuthRequest, SessionGuard } from "./auth";
type Tx = Prisma.TransactionClient;
const names = {
  employee: { select: { name: true } },
  decision: { select: { user: { select: { email: true } } } },
} as const;
function scope(a: Actor) {
  return canManageEmployees(a.role)
    ? {}
    : {
        OR: [
          { id: a.employeeId ?? "00000000-0000-0000-0000-000000000000" },
          ...(a.role === "Manager" && a.employeeId
            ? [{ managerId: a.employeeId }]
            : []),
        ],
      };
}
function canDecide(a: Actor, e: { id: string; managerId: string | null }) {
  return (
    e.id !== a.employeeId &&
    (canManageEmployees(a.role) ||
      (a.role === "Manager" && !!a.employeeId && e.managerId === a.employeeId))
  );
}
function invalid(message: string): never {
  throw new BadRequestException(message);
}
@Controller("time")
@UseGuards(SessionGuard)
export class TimeController {
  constructor(@Inject(Database) private db: Database) {}
  @Get() async view(
    @Req() req: AuthRequest,
    @Query("section") section?: string,
  ): Promise<TimeView> {
    const a = req.actor,
      companyId = a.companyId;
    const me = a.employeeId
      ? await this.db.employee.findFirst({
          where: { companyId, id: a.employeeId },
        })
      : null;
    const visible = { companyId, employee: scope(a) };
    const [branches, types, leaves, attendance, corrections] =
      await Promise.all([
        this.db.branch.findMany({
          where: { companyId },
          select: {
            id: true,
            name: true,
            weekdays: true,
            holidays: {
              select: { id: true, day: true, name: true },
              orderBy: { day: "asc" },
            },
          },
          orderBy: { name: "asc" },
        }),
        this.db.leaveType.findMany({
          where: { companyId },
          orderBy: [{ year: "desc" }, { name: "asc" }],
        }),
        this.db.leaveRequest.findMany({
          where: visible,
          include: { ...names, type: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        }),
        section === "calendar"
          ? []
          : this.db.attendance.findMany({
              where: visible,
              include: { employee: { select: { name: true } } },
              orderBy: { day: "desc" },
            }),
        section === "calendar"
          ? []
          : this.db.correction.findMany({
              where: visible,
              include: names,
              orderBy: { createdAt: "desc" },
            }),
      ]);
    return {
      today: indiaDay(new Date()),
      branchId: me?.branchId ?? null,
      branches,
      types: types.map((t) => {
        const mine = leaves.filter(
          (l) => l.employeeId === a.employeeId && l.typeId === t.id,
        );
        const count = (status: string) =>
          mine
            .filter((l) => l.status === status)
            .reduce((n, l) => n + l.days.length, 0);
        return {
          id: t.id,
          name: t.name,
          year: t.year,
          openingDays: t.openingDays,
          used: count("Approved"),
          pending: count("Pending"),
        };
      }),
      leaves: leaves
        .filter((l) => section !== "calendar" || l.status === "Approved")
        .map((l) => ({
          id: l.id,
          employeeId: l.employeeId,
          name: l.employee.name,
          type: section === "calendar" ? "" : l.type.name,
          start: l.start,
          end: l.end,
          days: l.days,
          status: l.status,
          reason: section === "calendar" ? "" : l.reason,
          decidedAt: l.decidedAt?.toISOString() ?? null,
          decider:
            section === "calendar" ? null : (l.decision?.user.email ?? null),
        })),
      attendance: attendance.map((r) => ({
        employeeId: r.employeeId,
        name: r.employee.name,
        day: r.day,
        checkIn: r.checkIn.toISOString(),
        checkOut: r.checkOut?.toISOString() ?? null,
      })),
      corrections: corrections.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        name: r.employee.name,
        day: r.day,
        checkIn: r.checkIn.toISOString(),
        checkOut: r.checkOut.toISOString(),
        reason: r.reason,
        status: r.status,
        decidedAt: r.decidedAt?.toISOString() ?? null,
        decider: r.decision?.user.email ?? null,
      })),
    };
  }
  @Post() async act(@Req() req: AuthRequest, @Body() body: unknown) {
    const a = req.actor,
      companyId = a.companyId,
      c = timeCommand.parse(body);
    const now = new Date(),
      today = indiaDay(now);
    await this.db.$transaction(
      async (tx: Tx) => {
        if (
          c.action === "type" ||
          c.action === "week" ||
          c.action === "holiday" ||
          c.action === "removeHoliday"
        ) {
          if (!canManageEmployees(a.role)) throw new ForbiddenException();
          if (c.action === "type") {
            await tx.leaveType.create({
              data: {
                companyId,
                name: c.name,
                year: c.year,
                openingDays: c.openingDays,
              },
            });
            return;
          }
          if (c.action === "removeHoliday") {
            if (
              !(await tx.holiday.deleteMany({ where: { companyId, id: c.id } }))
                .count
            )
              throw new NotFoundException();
            return;
          }
          const branch = await tx.branch.findFirst({
            where: { companyId, id: c.branchId },
          });
          if (!branch) throw new NotFoundException();
          if (c.action === "week") {
            await tx.branch.update({
              where: { companyId_id: { companyId, id: c.branchId } },
              data: { weekdays: [...new Set(c.weekdays)].sort() },
            });
            return;
          }
          await tx.holiday.upsert({
            where: {
              companyId_branchId_day: {
                companyId,
                branchId: c.branchId,
                day: c.day,
              },
            },
            create: {
              companyId,
              branchId: c.branchId,
              day: c.day,
              name: c.name,
            },
            update: { name: c.name },
          });
          return;
        }
        if (
          c.action === "leaveDecision" ||
          c.action === "correctionDecision" ||
          c.action === "withdraw"
        ) {
          const where = { companyId, id: c.id };
          const include = {
            employee: { select: { id: true, managerId: true } },
          };
          const record =
            c.action === "correctionDecision"
              ? await tx.correction.findFirst({ where, include })
              : await tx.leaveRequest.findFirst({ where, include });
          if (
            !record ||
            (c.action === "withdraw"
              ? record.employeeId !== a.employeeId
              : !canDecide(a, record.employee))
          )
            throw new NotFoundException("Request unavailable");
          if (record.status !== "Pending")
            throw new ConflictException("Request already decided");
          const data = {
            status:
              c.action === "withdraw"
                ? ("Withdrawn" as const)
                : c.approve
                  ? ("Approved" as const)
                  : ("Rejected" as const),
            decidedAt: now,
            decidedBy: a.membershipId,
          };
          if (c.action === "correctionDecision" && "checkIn" in record) {
            if (c.approve) {
              const key = {
                companyId,
                employeeId: record.employeeId,
                day: record.day,
              };
              const times = {
                checkIn: record.checkIn,
                checkOut: record.checkOut,
              };
              await tx.attendance.upsert({
                where: { companyId_employeeId_day: key },
                create: { ...key, ...times },
                update: times,
              });
            }
            await tx.correction.updateMany({
              where: { ...where, status: "Pending" },
              data,
            });
          } else
            await tx.leaveRequest.updateMany({
              where: { ...where, status: "Pending" },
              data,
            });
          return;
        }
        const employeeId = a.employeeId;
        if (!employeeId)
          throw new ForbiddenException(
            "Link an employee profile to use this action",
          );
        if (c.action === "apply") {
          const employee = await tx.employee.findUniqueOrThrow({
            where: { companyId_id: { companyId, id: employeeId } },
            include: { branch: { include: { holidays: true } } },
          });
          const policy = await tx.leaveType.findFirst({
            where: {
              companyId,
              id: c.typeId,
              year: Number(c.start.slice(0, 4)),
            },
          });
          if (!policy) invalid("Choose a policy for this calendar year");
          const days = chargeableDays(
            c.start,
            c.end,
            employee.branch.weekdays,
            employee.branch.holidays.map((h) => h.day),
          );
          if (!days.length)
            invalid("Choose working dates within one calendar year");
          const active = await tx.leaveRequest.findMany({
            where: {
              companyId,
              employeeId,
              status: { in: ["Approved", "Pending"] },
            },
          });
          if (active.some((l) => l.start <= c.end && l.end >= c.start))
            invalid("These dates overlap an existing request");
          if (
            active
              .filter((l) => l.typeId === policy.id)
              .reduce((n, l) => n + l.days.length, 0) +
              days.length >
            policy.openingDays
          )
            invalid("Insufficient available leave");
          await tx.leaveRequest.create({
            data: {
              companyId,
              employeeId,
              typeId: policy.id,
              start: c.start,
              end: c.end,
              days,
              reason: c.reason,
            },
          });
          return;
        }
        if (c.action === "clock") {
          const key = { companyId, employeeId, day: today };
          if (c.direction === "in") {
            await tx.attendance.create({ data: { ...key, checkIn: now } });
            return;
          }
          if (
            !(
              await tx.attendance.updateMany({
                where: { ...key, checkOut: null },
                data: { checkOut: now },
              })
            ).count
          )
            invalid("No open check-in today");
          return;
        }
        if (c.action === "correct") {
          const checkIn = new Date(c.checkIn),
            checkOut = new Date(c.checkOut);
          if (
            indiaDay(checkIn) !== c.day ||
            indiaDay(checkOut) !== c.day ||
            checkOut <= checkIn ||
            checkOut > now
          )
            invalid(
              "Choose past times on the same day in India, with check-out after check-in",
            );
          if (
            await tx.correction.count({
              where: { companyId, employeeId, day: c.day, status: "Pending" },
            })
          )
            invalid("A correction is already pending for this day");
          await tx.correction.create({
            data: {
              companyId,
              employeeId,
              day: c.day,
              checkIn,
              checkOut,
              reason: c.reason,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { ok: true };
  }
}
