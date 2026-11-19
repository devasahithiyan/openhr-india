import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { type ExpenseStatus, type Prisma } from "@prisma/client";
import {
  canManageEmployees,
  expenseItems,
  expenseCommand,
  indiaDay,
  type ExpenseRecord,
  type ExpenseView,
} from "@openhr/shared";
import { SessionGuard, type Actor, type AuthRequest } from "./auth";
import { Database } from "./db";

function visible(actor: Actor): Prisma.ExpenseClaimWhereInput {
  if (canManageEmployees(actor.role)) return { companyId: actor.companyId };
  if (!actor.employeeId) return { companyId: actor.companyId, OR: [] };
  return {
    companyId: actor.companyId,
    OR: [
      { employeeId: actor.employeeId },
      ...(actor.role === "Manager"
        ? [{ employee: { managerId: actor.employeeId } }]
        : []),
    ],
  };
}
function canReview(actor: Actor, employeeId: string, managerId: string | null) {
  if (actor.employeeId === employeeId) return false;
  if (!managerId) return canManageEmployees(actor.role);
  return actor.role !== "Employee" && actor.employeeId === managerId;
}
@Injectable()
export class ExpenseRepository {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list(actor: Actor): Promise<ExpenseView> {
    const rows = await this.db.expenseClaim.findMany({
      where: visible(actor),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      include: {
        employee: { select: { name: true, managerId: true } },
        events: {
          orderBy: { revision: "asc" },
          select: { status: true, at: true, note: true },
        },
      },
    });
    const claims: ExpenseRecord[] = rows.map((row) => {
      const items = expenseItems.parse(row.items);
      return {
        id: row.id,
        employeeName: row.employee.name,
        items,
        status: row.status,
        revision: row.revision,
        total: items.reduce((sum, i) => sum + i.paise, 0),
        canReview:
          row.status === "Submitted" &&
          canReview(actor, row.employeeId, row.employee.managerId),
        canEdit:
          row.status === "Returned" && row.employeeId === actor.employeeId,
        canPay: row.status === "Approved" && canManageEmployees(actor.role),
        paymentDay: row.paymentDay,
        paymentReference: row.paymentReference,
        history: row.events.map((e) => ({ ...e, at: e.at.toISOString() })),
      };
    });
    return {
      claims,
      outstanding: canManageEmployees(actor.role)
        ? claims.reduce(
            (sum, c) => sum + (c.status === "Approved" ? c.total : 0),
            0,
          )
        : null,
    };
  }
  async change(actor: Actor, body: unknown) {
    const c = expenseCommand.parse(body),
      { companyId } = actor;
    return this.db.$transaction(async (tx) => {
      let id: string, revision: number, status: ExpenseStatus;
      if (c.action === "submit") {
        if (!actor.employeeId)
          throw new ForbiddenException("An employee profile is required");
        const claim = await tx.expenseClaim.create({
          data: { companyId, employeeId: actor.employeeId, items: c.items },
        });
        ({ id, revision, status } = claim);
      } else {
        const claim = await tx.expenseClaim.findFirst({
          where: { ...visible(actor), id: c.id },
          include: { employee: { select: { managerId: true } } },
        });
        if (!claim) throw new NotFoundException("Claim not found");
        id = c.id;
        revision = c.revision + 1;
        let changes: Prisma.ExpenseClaimUpdateManyMutationInput = {};
        if (c.action === "reimburse") {
          if (!canManageEmployees(actor.role))
            throw new ForbiddenException("HR or Admin access required");
          if (c.day > indiaDay(new Date()))
            throw new BadRequestException(
              "Payment date must be today or earlier",
            );
          if (
            claim.status === "Reimbursed" &&
            claim.paymentDay === c.day &&
            claim.paymentReference === c.reference
          )
            return { id };
          if (claim.status !== "Approved")
            throw new ConflictException(
              "Only approved claims can be reimbursed",
            );
          status = "Reimbursed";
          changes = { paymentDay: c.day, paymentReference: c.reference };
        } else if (c.action === "resubmit") {
          if (claim.employeeId !== actor.employeeId)
            throw new ForbiddenException("Only the claimant can revise items");
          if (claim.status !== "Returned")
            throw new ConflictException("Only returned claims can be revised");
          status = "Submitted";
          changes = { items: c.items };
        } else {
          if (!canReview(actor, claim.employeeId, claim.employee.managerId))
            throw new ForbiddenException(
              "This claim requires another reviewer",
            );
          if (claim.status !== "Submitted")
            throw new ConflictException(
              "Only submitted claims can be reviewed",
            );
          status = c.action === "approve" ? "Approved" : "Returned";
        }
        const changed = await tx.expenseClaim.updateMany({
          where: {
            id,
            companyId,
            revision: c.revision,
            status: claim.status,
            ...(c.action === "approve" || c.action === "return"
              ? { employee: { managerId: claim.employee.managerId } }
              : {}),
          },
          data: { ...changes, status, revision },
        });
        if (!changed.count) {
          if (
            c.action === "reimburse" &&
            (await tx.expenseClaim.count({
              where: {
                id,
                companyId,
                status: "Reimbursed",
                paymentDay: c.day,
                paymentReference: c.reference,
              },
            }))
          )
            return { id };
          throw new ConflictException(
            "Claim changed. Reload and review the latest version",
          );
        }
      }
      await tx.expenseEvent.create({
        data: {
          companyId,
          claimId: id,
          revision,
          actorId: actor.membershipId,
          status,
          note: c.action === "return" ? c.reason : null,
        },
      });
      return { id };
    });
  }
}
@Controller("expenses")
@UseGuards(SessionGuard)
export class ExpenseController {
  constructor(
    @Inject(ExpenseRepository) private readonly expenses: ExpenseRepository,
  ) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.expenses.list(req.actor);
  }
  @Post() change(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.expenses.change(req.actor, body);
  }
}
