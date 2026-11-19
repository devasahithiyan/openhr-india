-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('Submitted', 'Returned', 'Approved', 'Reimbursed');

-- CreateTable
CREATE TABLE "ExpenseClaim" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'Submitted',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "paymentDay" TEXT,
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseEvent" (
    "company_id" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" "ExpenseStatus" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" UUID NOT NULL,
    "note" TEXT,

    CONSTRAINT "ExpenseEvent_pkey" PRIMARY KEY ("company_id","claimId","revision")
);

-- CreateIndex
CREATE INDEX "ExpenseClaim_company_id_employeeId_idx" ON "ExpenseClaim"("company_id", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseClaim_company_id_id_key" ON "ExpenseClaim"("company_id", "id");

-- AddForeignKey
ALTER TABLE "ExpenseClaim" ADD CONSTRAINT "ExpenseClaim_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEvent" ADD CONSTRAINT "ExpenseEvent_company_id_actorId_fkey" FOREIGN KEY ("company_id", "actorId") REFERENCES "memberships"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEvent" ADD CONSTRAINT "ExpenseEvent_company_id_claimId_fkey" FOREIGN KEY ("company_id", "claimId") REFERENCES "ExpenseClaim"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
