import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { type Request, type Response } from "express";
import { loginSchema, type Role } from "@openhr/shared";
import { Database } from "./db";
import { randomToken, tokenHash, verifyPassword } from "./security";

export interface Actor {
  companyId: string;
  membershipId: string;
  role: Role;
  employeeId: string | null;
}
export type AuthRequest = Request & {
  actor: Actor;
  sessionId: string;
  csrfToken: string;
};
export const cookieName = "openhr_session";
export function checkOrigin(req: Request) {
  if (req.get("origin") !== process.env.APP_ORIGIN)
    throw new ForbiddenException("Request origin is not allowed");
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(Database) private readonly db: Database) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[cookieName];
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      throw new UnauthorizedException("Sign in to continue");
    const session = await this.db.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { membership: true },
    });
    if (!session || session.expiresAt <= new Date())
      throw new UnauthorizedException("Your session has expired");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      checkOrigin(req);
      if (req.get("x-csrf-token") !== session.csrfToken)
        throw new ForbiddenException("Refresh the page and try again");
    }
    req.actor = {
      companyId: session.companyId,
      membershipId: session.membershipId,
      role: session.membership.role,
      employeeId: session.membership.employeeId,
    };
    req.sessionId = session.id;
    req.csrfToken = session.csrfToken;
    return true;
  }
}
@Controller("auth")
export class AuthController {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  private dummyHash: Promise<string> | undefined;
  constructor(@Inject(Database) private readonly db: Database) {}
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    checkOrigin(req);
    const input = loginSchema.parse(body);
    // Bound process-local buckets. No plaintext identities or passwords are logged or retained.
    const now = Date.now();
    for (const [key, value] of this.attempts)
      if (value.until < now) this.attempts.delete(key);
    const keys = [
      tokenHash(`ip:${req.ip}`),
      tokenHash(`identity:${input.companySlug}:${input.email}`),
    ];
    if (
      this.attempts.size > 10000 ||
      keys.some((key) => (this.attempts.get(key)?.count ?? 0) >= 10)
    )
      throw new ForbiddenException(
        "Too many sign-in attempts. Try again in 15 minutes.",
      );
    for (const key of keys) {
      const value = this.attempts.get(key) ?? { count: 0, until: now + 900000 };
      value.count++;
      this.attempts.set(key, value);
    }
    const membership = await this.db.membership.findFirst({
      where: {
        company: { slug: input.companySlug },
        user: { email: input.email },
      },
      include: { user: true },
    });
    const { hashPassword } = await import("./security");
    this.dummyHash ??= hashPassword(randomToken());
    const valid = await verifyPassword(
      membership?.user.passwordHash ?? (await this.dummyHash),
      input.password,
    );
    if (!membership || !valid)
      throw new UnauthorizedException(
        "Company, email or password is incorrect",
      );
    for (const key of keys) this.attempts.delete(key);
    const token = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(now + 8 * 3600000);
    await this.db.session.deleteMany({
      where: {
        companyId: membership.companyId,
        membershipId: membership.id,
        expiresAt: { lt: new Date() },
      },
    });
    await this.db.session.create({
      data: {
        companyId: membership.companyId,
        membershipId: membership.id,
        tokenHash: tokenHash(token),
        csrfToken,
        expiresAt,
      },
    });
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });
    res.setHeader("Cache-Control", "no-store");
    return { csrfToken };
  }
  @Get("me")
  @UseGuards(SessionGuard)
  async me(@Req() req: AuthRequest) {
    const membership = await this.db.membership.findUniqueOrThrow({
      where: {
        companyId_id: {
          companyId: req.actor.companyId,
          id: req.actor.membershipId,
        },
      },
      include: { company: true, user: { select: { email: true } } },
    });
    return {
      email: membership.user.email,
      role: membership.role,
      employeeId: membership.employeeId,
      company: membership.company,
      csrfToken: req.csrfToken,
    };
  }
  @Post("logout")
  @HttpCode(204)
  @UseGuards(SessionGuard)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.db.session.deleteMany({
      where: { id: req.sessionId, companyId: req.actor.companyId },
    });
    res.clearCookie(cookieName, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
}
