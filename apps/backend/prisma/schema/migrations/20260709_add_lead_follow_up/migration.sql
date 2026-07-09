-- CreateTable: lead_follow_up_flows
CREATE TABLE "lead_follow_up_flows" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lead_follow_up_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lead_follow_up_steps
CREATE TABLE "lead_follow_up_steps" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "delayHours" INTEGER NOT NULL DEFAULT 24,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "stepOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lead_follow_up_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lead_follow_up_enrollments
CREATE TABLE "lead_follow_up_enrollments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "whatsappContactId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "firstMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lead_follow_up_enrollments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "lead_follow_up_enrollments_companyId_status_nextSendAt_idx" ON "lead_follow_up_enrollments"("companyId", "status", "nextSendAt");
CREATE INDEX "lead_follow_up_enrollments_customerId_idx" ON "lead_follow_up_enrollments"("customerId");
CREATE INDEX "lead_follow_up_enrollments_whatsappContactId_idx" ON "lead_follow_up_enrollments"("whatsappContactId");

-- Foreign Keys
ALTER TABLE "lead_follow_up_steps" ADD CONSTRAINT "lead_follow_up_steps_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "lead_follow_up_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_follow_up_enrollments" ADD CONSTRAINT "lead_follow_up_enrollments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_follow_up_enrollments" ADD CONSTRAINT "lead_follow_up_enrollments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_follow_up_enrollments" ADD CONSTRAINT "lead_follow_up_enrollments_whatsappContactId_fkey" FOREIGN KEY ("whatsappContactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_follow_up_enrollments" ADD CONSTRAINT "lead_follow_up_enrollments_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "lead_follow_up_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
