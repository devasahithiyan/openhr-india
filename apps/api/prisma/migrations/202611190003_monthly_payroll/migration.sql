-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "unpaid" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Salary" (
    "company_id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "effective" TEXT NOT NULL,
    "components" JSONB NOT NULL,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("company_id","employeeId","effective")
);

-- CreateTable
CREATE TABLE "PayrollReview" (
    "company_id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "deductions" JSONB NOT NULL,
    "reviewerId" UUID NOT NULL,

    CONSTRAINT "PayrollReview_pkey" PRIMARY KEY ("company_id","month","employeeId")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "company_id" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "approverId" UUID NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("company_id","month")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "company_id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("company_id","month","employeeId")
);

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollReview" ADD CONSTRAINT "PayrollReview_company_id_reviewerId_fkey" FOREIGN KEY ("company_id", "reviewerId") REFERENCES "memberships"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollReview" ADD CONSTRAINT "PayrollReview_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_company_id_approverId_fkey" FOREIGN KEY ("company_id", "approverId") REFERENCES "memberships"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_company_id_month_fkey" FOREIGN KEY ("company_id", "month") REFERENCES "PayrollRun"("company_id", "month") ON DELETE RESTRICT ON UPDATE CASCADE;

