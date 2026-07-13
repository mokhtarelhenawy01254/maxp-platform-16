-- CreateTable: booking_branches
CREATE TABLE "booking_branches" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "workingDays" JSONB,
    "genderDays" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable: booking_doctors
CREATE TABLE "booking_doctors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gender" "Gender",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable: booking_services
CREATE TABLE "booking_services" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hasPackages" BOOLEAN NOT NULL DEFAULT true,
    "packages" JSONB,
    "requiresConsultation" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add booking module columns to appointments
ALTER TABLE "appointments"
    ADD COLUMN "branchId" TEXT,
    ADD COLUMN "doctorId" TEXT,
    ADD COLUMN "serviceId" TEXT,
    ADD COLUMN "customerGender" TEXT,
    ADD COLUMN "serviceName" TEXT,
    ADD COLUMN "source" TEXT,
    ADD COLUMN "paymentRequired" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "paymentStatus" TEXT,
    ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- CreateIndexes
CREATE INDEX "booking_branches_companyId_idx" ON "booking_branches"("companyId");
CREATE INDEX "booking_doctors_companyId_idx" ON "booking_doctors"("companyId");
CREATE INDEX "booking_doctors_branchId_idx" ON "booking_doctors"("branchId");
CREATE INDEX "booking_services_companyId_idx" ON "booking_services"("companyId");
CREATE INDEX "booking_services_branchId_idx" ON "booking_services"("branchId");
CREATE INDEX "appointments_branchId_idx" ON "appointments"("branchId");
CREATE INDEX "appointments_doctorId_idx" ON "appointments"("doctorId");
CREATE INDEX "appointments_serviceId_idx" ON "appointments"("serviceId");
CREATE INDEX "appointments_customerGender_idx" ON "appointments"("customerGender");

-- AddForeignKey: booking_doctors -> booking_branches
ALTER TABLE "booking_doctors" ADD CONSTRAINT "booking_doctors_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "booking_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: booking_doctors -> companies
ALTER TABLE "booking_doctors" ADD CONSTRAINT "booking_doctors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: booking_services -> booking_branches
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "booking_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: booking_services -> companies
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: booking_branches -> companies
ALTER TABLE "booking_branches" ADD CONSTRAINT "booking_branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: appointments -> booking_branches
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "booking_branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: appointments -> booking_doctors
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "booking_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: appointments -> booking_services
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "booking_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
