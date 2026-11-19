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
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  definition,
  indiaDay,
  isHR,
  makeTasks,
  matchesTemplate,
  onboardCommand,
  revisePlan,
  type ChecklistTask,
  type OnboardingData,
  type Plan,
} from "@openhr/shared";
import { SessionGuard, type Actor, type AuthRequest } from "./auth";
import { Database } from "./db";
const employeeSelect = {
  id: true,
  name: true,
  dateOfJoining: true,
  branchId: true,
  departmentId: true,
  managerId: true,
  membership: { select: { user: { select: { email: true } } } },
} satisfies Prisma.EmployeeSelect;
function person(
  p: Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>,
) {
  return {
    id: p.id,
    name: p.name,
    joined: p.dateOfJoining.toISOString().slice(0, 10),
    branchId: p.branchId,
    departmentId: p.departmentId,
    managerId: p.managerId,
    email: p.membership?.user.email ?? null,
  };
}
function presentPlan(p: {
  employeeId: string;
  templateId: string;
  buddyId: string | null;
  startedFor: string;
  revision: number;
  closedAt: Date | null;
  tasks: Prisma.JsonValue;
}): Plan {
  return {
    employeeId: p.employeeId,
    templateId: p.templateId,
    buddyId: p.buddyId,
    startedFor: p.startedFor,
    revision: p.revision,
    closedAt: p.closedAt?.toISOString() ?? null,
    tasks: p.tasks as unknown as ChecklistTask[],
  };
}
const scope = (a: Actor): Prisma.EmployeeWhereInput =>
  isHR(a)
    ? { companyId: a.companyId }
    : {
        companyId: a.companyId,
        OR: a.employeeId
          ? [
              { id: a.employeeId },
              ...(a.role === "Manager" ? [{ managerId: a.employeeId }] : []),
            ]
          : [],
      };
@Injectable()
export class OnboardingRepository {
  constructor(@Inject(Database) private readonly db: Database) {}
  async read(a: Actor): Promise<OnboardingData> {
    const companyId = a.companyId,
      visible = scope(a);
    const [people, plans, templates, branches, departments] =
      await this.db.$transaction(
        [
          this.db.employee.findMany({
            where: visible,
            select: employeeSelect,
            orderBy: { name: "asc" },
          }),
          this.db.onboardingPlan.findMany({
            where: { companyId, employee: visible },
          }),
          this.db.onboardingTemplate.findMany({
            where: {
              companyId,
              ...(isHR(a) ? {} : { plans: { some: { employee: visible } } }),
            },
            orderBy: { name: "asc" },
          }),
          this.db.branch.findMany({
            where: {
              companyId,
              ...(isHR(a) ? {} : { employees: { some: visible } }),
            },
            select: { id: true, name: true },
          }),
          this.db.department.findMany({
            where: {
              companyId,
              ...(isHR(a) ? {} : { employees: { some: visible } }),
            },
            select: { id: true, name: true },
          }),
        ],
        { isolationLevel: "RepeatableRead" },
      );
    return {
      people: people.map(person),
      plans: plans.map(presentPlan),
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        branchId: t.branchId,
        departmentId: t.departmentId,
        definitions: definition.array().parse(t.definitions),
      })),
      branches,
      departments,
      today: indiaDay(new Date()),
    };
  }
  async write(a: Actor, body: unknown) {
    const c = onboardCommand.parse(body),
      companyId = a.companyId;
    if (["template", "start", "reschedule"].includes(c.action) && !isHR(a))
      throw new ForbiddenException("HR access required");
    return this.db.$transaction(
      async (tx) => {
        if (c.action === "template") {
          const { name, branchId, departmentId, definitions } = c;
          return tx.onboardingTemplate.create({
            data: { companyId, name, branchId, departmentId, definitions },
            select: { id: true },
          });
        }
        const emp = await tx.employee.findFirst({
          where: { AND: [scope(a), { id: c.employeeId }] },
          select: employeeSelect,
        });
        if (!emp) throw new NotFoundException("Employee not found");
        const p = person(emp),
          key = { companyId, employeeId: emp.id };
        const existing = await tx.onboardingPlan.findUnique({
          where: { companyId_employeeId: key },
        });
        if (c.action === "start") {
          if (existing) {
            if (existing.templateId === c.templateId) return { saved: true };
            throw new ConflictException(
              "A different onboarding plan already exists",
            );
          }
          const t = await tx.onboardingTemplate.findUnique({
            where: { companyId_id: { companyId, id: c.templateId } },
          });
          if (!t) throw new NotFoundException("Template not found");
          const template = {
            ...t,
            definitions: definition.array().parse(t.definitions),
          };
          if (!matchesTemplate(p, template))
            throw new ConflictException(
              "Choose a template for this branch and department",
            );
          if (
            !p.managerId &&
            template.definitions.some((d) => d.owner === "Manager")
          )
            throw new ConflictException("Assign a reporting manager first");
          await tx.onboardingPlan.create({
            data: {
              ...key,
              templateId: t.id,
              startedFor: p.joined,
              tasks: makeTasks(template, p.joined),
            },
          });
        } else {
          if (!existing) throw new NotFoundException("Plan not found");
          let next: Plan;
          try {
            next = revisePlan(
              presentPlan(existing),
              p,
              a,
              c,
              new Date().toISOString(),
              a.membershipId,
            );
          } catch (e) {
            throw new ConflictException((e as Error).message);
          }
          const updated = await tx.onboardingPlan.updateMany({
            where: { ...key, revision: c.revision },
            data: {
              tasks: next.tasks,
              startedFor: next.startedFor,
              revision: next.revision,
            },
          });
          if (!updated.count)
            throw new ConflictException(
              "Refresh the plan before making changes",
            );
          if (c.action === "reschedule")
            await tx.employee.update({
              where: { companyId_id: { companyId, id: p.id } },
              data: { dateOfJoining: new Date(c.day) },
            });
        }
        return { saved: true };
      },
      { isolationLevel: "Serializable" },
    );
  }
}
@Controller("onboarding")
@UseGuards(SessionGuard)
export class OnboardingController {
  constructor(
    @Inject(OnboardingRepository) private readonly repo: OnboardingRepository,
  ) {}
  @Get() list(@Req() r: AuthRequest) {
    return this.repo.read(r.actor);
  }
  @Post() change(@Req() r: AuthRequest, @Body() body: unknown) {
    return this.repo.write(r.actor, body);
  }
}
