-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Withdrawn');

-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "weekdays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "openingDays" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "day" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "typeId" UUID NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "days" TEXT[],
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" UUID,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "day" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3),

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correction" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "day" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" UUID,

    CONSTRAINT "Correction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_company_id_id_key" ON "LeaveType"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_company_id_year_name_key" ON "LeaveType"("company_id", "year", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_company_id_branchId_day_key" ON "Holiday"("company_id", "branchId", "day");

-- CreateIndex
CREATE INDEX "LeaveRequest_company_id_employeeId_start_idx" ON "LeaveRequest"("company_id", "employeeId", "start");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_company_id_employeeId_day_key" ON "Attendance"("company_id", "employeeId", "day");

-- CreateIndex
CREATE INDEX "Correction_company_id_employeeId_day_idx" ON "Correction"("company_id", "employeeId", "day");

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_company_id_branchId_fkey" FOREIGN KEY ("company_id", "branchId") REFERENCES "branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_company_id_decidedBy_fkey" FOREIGN KEY ("company_id", "decidedBy") REFERENCES "memberships"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_company_id_typeId_fkey" FOREIGN KEY ("company_id", "typeId") REFERENCES "LeaveType"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_company_id_decidedBy_fkey" FOREIGN KEY ("company_id", "decidedBy") REFERENCES "memberships"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Enforce one outstanding correction even across concurrent submissions.
CREATE UNIQUE INDEX "Correction_pending_day" ON "Correction" ("company_id","employeeId","day") WHERE status='Pending';
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_time_order" CHECK ("checkOut" IS NULL OR "checkOut" >= "checkIn");
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_time_order" CHECK ("checkOut" > "checkIn");
