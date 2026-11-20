-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "disabledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "endedOn" TEXT;

-- CreateTable
CREATE TABLE "WorkRecord" (
    "company_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "employeeId" UUID,
    "assignedId" UUID,
    "revision" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "WorkRecord_pkey" PRIMARY KEY ("company_id","id")
);

-- CreateIndex
CREATE INDEX "WorkRecord_company_id_kind_idx" ON "WorkRecord"("company_id", "kind");

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_company_id_assignedId_fkey" FOREIGN KEY ("company_id", "assignedId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
