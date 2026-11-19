-- CreateTable
CREATE TABLE "OnboardingTemplate" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" UUID,
    "departmentId" UUID,
    "definitions" JSONB NOT NULL,

    CONSTRAINT "OnboardingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingPlan" (
    "company_id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "buddyId" UUID,
    "startedFor" TEXT NOT NULL,
    "tasks" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingPlan_pkey" PRIMARY KEY ("company_id","employeeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTemplate_company_id_id_key" ON "OnboardingTemplate"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingTemplate_company_id_name_key" ON "OnboardingTemplate"("company_id", "name");

-- AddForeignKey
ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_company_id_branchId_fkey" FOREIGN KEY ("company_id", "branchId") REFERENCES "branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_company_id_departmentId_fkey" FOREIGN KEY ("company_id", "departmentId") REFERENCES "departments"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingPlan" ADD CONSTRAINT "OnboardingPlan_company_id_employeeId_fkey" FOREIGN KEY ("company_id", "employeeId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingPlan" ADD CONSTRAINT "OnboardingPlan_company_id_buddyId_fkey" FOREIGN KEY ("company_id", "buddyId") REFERENCES "employees"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingPlan" ADD CONSTRAINT "OnboardingPlan_company_id_templateId_fkey" FOREIGN KEY ("company_id", "templateId") REFERENCES "OnboardingTemplate"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
