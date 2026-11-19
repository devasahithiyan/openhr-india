import "reflect-metadata";
import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpException,
  Module,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Prisma } from "@prisma/client";
import { ZodError } from "@openhr/shared";
import { type Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Database } from "./db";
import { TimeController } from "./time";
import { AuthController, SessionGuard } from "./auth";
import { PeopleController, PeopleRepository } from "./people";
@Controller()
class HealthController {
  @Get("health") health() {
    return { status: "ok" };
  }
}
@Catch()
class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Check the highlighted fields",
        fields: error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    if (error instanceof HttpException) {
      res.status(error.getStatus()).json({ message: error.message });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        res
          .status(409)
          .json({ message: "A record with this code or name already exists" });
        return;
      }
      if (error.code === "P2003") {
        res
          .status(400)
          .json({ message: "Related records must belong to this company" });
        return;
      }
      if (error.code === "P2034") {
        res
          .status(409)
          .json({ message: "Another change occurred. Refresh and try again." });
        return;
      }
    }
    // Never serialize/log Prisma errors, request bodies or personal identifiers.
    res
      .status(500)
      .json({ message: "Unable to complete the request. Try again." });
  }
}
@Module({
  controllers: [
    HealthController,
    AuthController,
    PeopleController,
    TimeController,
  ],
  providers: [Database, SessionGuard, PeopleRepository],
})
export class AppModule {}
export async function createApp() {
  if (
    !process.env.APP_ORIGIN ||
    new URL(process.env.APP_ORIGIN).origin !== process.env.APP_ORIGIN
  )
    throw new Error("Set APP_ORIGIN to the exact web origin");
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.APP_ORIGIN.startsWith("https://")
  )
    throw new Error("Production requires an HTTPS APP_ORIGIN");
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api");
  app.use(helmet());
  app.use(cookieParser());
  app.use((_req: unknown, res: Response, next: () => void) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.useGlobalFilters(new SafeErrors());
  app.enableShutdownHooks();
  return app;
}
