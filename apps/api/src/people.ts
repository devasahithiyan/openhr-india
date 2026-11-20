import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Prisma, type IndianState, type EmployeePrivate } from "@prisma/client";
import {
  branchSchema,
  canManageEmployees,
  employeeSchema,
  employeePatchSchema,
  privateFields,
  referenceSchema,
  type OrganizationMember,
  type EmployeePatch,
  type EmployeeRecord,
} from "@openhr/shared";
import { z } from "@openhr/shared";
import { randomUUID } from "node:crypto";
import { Database } from "./db";
import { type Actor, type AuthRequest, SessionGuard } from "./auth";
import { mask, Vault } from "./security";

const uuid = z.string().uuid();
const include = {
  branch: true,
  department: true,
  designation: true,
  privateData: true,
  manager: { select: { id: true, name: true, code: true } },
} satisfies Prisma.EmployeeInclude;
type Stored = Prisma.EmployeeGetPayload<{ include: typeof include }>;
function requireWriter(actor: Actor) {
  if (!canManageEmployees(actor.role))
    throw new ForbiddenException("Admin or HR access is required");
}
@Injectable()
export class PeopleRepository {
  private readonly vault: Vault;
  constructor(@Inject(Database) private readonly db: Database) {
    this.vault = new Vault(process.env.DATA_ENCRYPTION_KEY ?? "");
  }
  private visibility(actor: Actor): Prisma.EmployeeWhereInput {
    const base = { companyId: actor.companyId };
    if (canManageEmployees(actor.role)) return base;
    if (!actor.employeeId)
      return { ...base, id: "00000000-0000-0000-0000-000000000000" };
    return {
      ...base,
      OR: [
        { id: actor.employeeId },
        ...(actor.role === "Manager" ? [{ managerId: actor.employeeId }] : []),
      ],
    };
  }
  private present(e: Stored, actor: Actor): EmployeeRecord {
    const out: EmployeeRecord = {
      id: e.id,
      code: e.code,
      name: e.name,
      dateOfJoining: e.dateOfJoining.toISOString().slice(0, 10),
      branchId: e.branchId,
      departmentId: e.departmentId,
      designationId: e.designationId,
      managerId: e.managerId,
      manager: e.manager,
      branch: {
        id: e.branch.id,
        name: e.branch.name,
        state: e.branch.state.replaceAll("_", " "),
      },
      department: { id: e.department.id, name: e.department.name },
      designation: { id: e.designation.id, name: e.designation.name },
    };
    if (canManageEmployees(actor.role) || actor.employeeId === e.id) {
      const p = e.privateData;
      const read = (key: "pan" | "uan" | "esic" | "bankAccount" | "ifsc") =>
        p?.[key]
          ? this.vault.decrypt(p[key], `${e.companyId}:${e.id}:${key}`)
          : null;
      out.sensitive = {
        pan: mask(read("pan")),
        aadhaar: p?.aadhaarLast4 ? `•••• •••• ${p.aadhaarLast4}` : null,
        uan: mask(read("uan")),
        esic: mask(read("esic")),
        bankAccount: mask(read("bankAccount")),
        ifsc: mask(read("ifsc")),
      };
    }
    return out;
  }
  async list(actor: Actor, query: unknown) {
    const { q, page } = z
      .object({
        q: z.string().max(100).default(""),
        page: z.coerce.number().int().min(1).max(100000).default(1),
      })
      .parse(query);
    const where: Prisma.EmployeeWhereInput = {
      AND: [
        this.visibility(actor),
        {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    };
    const [items, total] = await this.db.$transaction([
      this.db.employee.findMany({
        where,
        include,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 25,
        skip: (page - 1) * 25,
      }),
      this.db.employee.count({ where }),
    ]);
    return {
      items: items.map((e) => this.present(e, actor)),
      total,
      page,
      pageSize: 25,
    };
  }
  async get(actor: Actor, id: string) {
    uuid.parse(id);
    const record = await this.db.employee.findFirst({
      where: { AND: [this.visibility(actor), { id }] },
      include,
    });
    if (!record) throw new NotFoundException("Employee not found");
    return this.present(record, actor);
  }
  async organization(actor: Actor): Promise<OrganizationMember[]> {
    const members = await this.db.employee.findMany({
      where: this.visibility(actor),
      select: {
        id: true,
        name: true,
        code: true,
        managerId: true,
        designation: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: [{ name: "asc" }, { code: "asc" }],
    });
    const visible = new Set(members.map((member) => member.id));
    return members.map((member) => ({
      ...member,
      managerId:
        member.managerId && visible.has(member.managerId)
          ? member.managerId
          : null,
    }));
  }
  async references(actor: Actor) {
    const where = { companyId: actor.companyId };
    const [branches, departments, designations, managers] = await Promise.all([
      this.db.branch.findMany({
        where,
        select: { id: true, name: true, state: true },
        orderBy: { name: "asc" },
      }),
      this.db.department.findMany({
        where,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.db.designation.findMany({
        where,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.db.employee.findMany({
        where: this.visibility(actor),
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return {
      branches: branches.map((b) => ({
        ...b,
        state: b.state.replaceAll("_", " "),
      })),
      departments,
      designations,
      managers,
    };
  }
  async createReference(actor: Actor, kind: string, body: unknown) {
    requireWriter(actor);
    if (kind === "branches") {
      const data = branchSchema.parse(body);
      const b = await this.db.branch.create({
        data: {
          ...data,
          state: data.state.replaceAll(" ", "_") as IndianState,
          companyId: actor.companyId,
        },
      });
      return { ...b, state: b.state.replaceAll("_", " ") };
    }
    const input = referenceSchema.parse(body);
    if (kind === "departments")
      return this.db.department.create({
        data: { ...input, companyId: actor.companyId },
      });
    if (kind === "designations")
      return this.db.designation.create({
        data: { ...input, companyId: actor.companyId },
      });
    throw new NotFoundException("Reference type not found");
  }
  async save(actor: Actor, body: unknown, id?: string) {
    requireWriter(actor);
    if (id) uuid.parse(id);
    const data: EmployeePatch = id
      ? employeePatchSchema.parse(body)
      : employeeSchema.parse(body);
    const employeeId = id ?? randomUUID();
    await this.db.$transaction(
      async (tx) => {
        const current = id
          ? await tx.employee.findUnique({
              where: { companyId_id: { companyId: actor.companyId, id } },
            })
          : null;
        if (id && !current) throw new NotFoundException("Employee not found");
        const referenceChecks = [
          data.branchId
            ? tx.branch.findUnique({
                where: {
                  companyId_id: {
                    companyId: actor.companyId,
                    id: data.branchId,
                  },
                },
              })
            : Promise.resolve(true),
          data.departmentId
            ? tx.department.findUnique({
                where: {
                  companyId_id: {
                    companyId: actor.companyId,
                    id: data.departmentId,
                  },
                },
              })
            : Promise.resolve(true),
          data.designationId
            ? tx.designation.findUnique({
                where: {
                  companyId_id: {
                    companyId: actor.companyId,
                    id: data.designationId,
                  },
                },
              })
            : Promise.resolve(true),
        ];
        if ((await Promise.all(referenceChecks)).some((value) => !value))
          throw new BadRequestException(
            "Select references belonging to this company",
          );
        if (data.managerId) {
          let cursor: string | null = data.managerId;
          const visited = new Set<string>([employeeId]);
          while (cursor) {
            if (visited.has(cursor))
              throw new BadRequestException(
                "Manager relationship would create a cycle",
              );
            visited.add(cursor);
            const manager: { managerId: string | null } | null =
              await tx.employee.findUnique({
                where: {
                  companyId_id: { companyId: actor.companyId, id: cursor },
                  endedOn: null,
                },
                select: { managerId: true },
              });
            if (!manager)
              throw new BadRequestException(
                "Select a manager belonging to this company",
              );
            cursor = manager.managerId;
          }
        }
        const {
          pan,
          aadhaarLast4,
          uan,
          esic,
          bankAccount,
          ifsc,
          ...directory
        } = data;
        const changes = {
          ...directory,
          ...(directory.dateOfJoining
            ? { dateOfJoining: new Date(directory.dateOfJoining) }
            : {}),
        };
        if (id)
          await tx.employee.update({
            where: { companyId_id: { companyId: actor.companyId, id } },
            data: changes,
          });
        else
          await tx.employee.create({
            data: {
              ...changes,
              id: employeeId,
              companyId: actor.companyId,
              code: data.code!,
              name: data.name!,
              dateOfJoining: new Date(data.dateOfJoining!),
              branchId: data.branchId!,
              departmentId: data.departmentId!,
              designationId: data.designationId!,
            },
          });
        const values = { pan, aadhaarLast4, uan, esic, bankAccount, ifsc };
        const secured: Partial<
          Pick<EmployeePrivate, (typeof privateFields)[number]>
        > = {};
        for (const key of privateFields) {
          const value = values[key];
          if (value !== undefined)
            secured[key] =
              value === null
                ? null
                : key === "aadhaarLast4"
                  ? value
                  : this.vault.encrypt(
                      value,
                      `${actor.companyId}:${employeeId}:${key}`,
                    );
        }
        await tx.employeePrivate.upsert({
          where: {
            companyId_employeeId: { companyId: actor.companyId, employeeId },
          },
          create: { companyId: actor.companyId, employeeId, ...secured },
          update: secured,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.get(actor, employeeId);
  }
}
@Controller()
@UseGuards(SessionGuard)
export class PeopleController {
  constructor(
    @Inject(PeopleRepository) private readonly people: PeopleRepository,
  ) {}
  @Get("employees") list(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.people.list(req.actor, query);
  }
  @Get("employees/:id") get(@Req() req: AuthRequest, @Param("id") id: string) {
    return this.people.get(req.actor, id);
  }
  @Post("employees") create(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.people.save(req.actor, body);
  }
  @Patch("employees/:id") update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.people.save(req.actor, body, id);
  }
  @Get("organization") organization(@Req() req: AuthRequest) {
    return this.people.organization(req.actor);
  }
  @Get("references") references(@Req() req: AuthRequest) {
    return this.people.references(req.actor);
  }
  @Post("references/:kind") createReference(
    @Req() req: AuthRequest,
    @Param("kind") kind: string,
    @Body() body: unknown,
  ) {
    return this.people.createReference(req.actor, kind, body);
  }
}
