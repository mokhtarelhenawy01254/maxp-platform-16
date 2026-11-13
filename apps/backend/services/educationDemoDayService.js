const { getSharedPrismaClient } = require('./sharedDatabase');
const crypto = require('crypto');

let tablesInitialized = false;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "education_demo_days" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT,
    "teacherId" TEXT,
    "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "locationType" TEXT NOT NULL DEFAULT 'ONLINE',
    "meetingLink" TEXT,
    "room" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_demo_days_company" ON "education_demo_days"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_demo_days_scheduled" ON "education_demo_days"("scheduledAt")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_demo_days_status" ON "education_demo_days"("status")`,

  `CREATE TABLE IF NOT EXISTS "education_demo_attendees" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "demoDayId" TEXT NOT NULL,
    "customerId" TEXT,
    "studentName" TEXT NOT NULL,
    "guardianName" TEXT,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "email" TEXT,
    "age" INTEGER,
    "grade" TEXT,
    "attendanceStatus" TEXT NOT NULL DEFAULT 'REGISTERED',
    "conversionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "convertedStudentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_demo_att_company" ON "education_demo_attendees"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_demo_att_demoday" ON "education_demo_attendees"("demoDayId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_demo_att_customer" ON "education_demo_attendees"("customerId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_demo_att_phone" ON "education_demo_attendees"("phone")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_demo_att_status" ON "education_demo_attendees"("attendanceStatus")`
];

async function ensureTablesExist(prisma) {
  if (tablesInitialized) return;
  const client = prisma || getSharedPrismaClient();
  try {
    for (const sql of STATEMENTS) {
      await client.$executeRawUnsafe(sql);
    }
    tablesInitialized = true;
  } catch (err) {
    console.error('Failed to initialize education demo day tables:', err);
  }
}

function generateDemoDayId() {
  return `demo_${crypto.randomBytes(8).toString('hex')}`;
}

function generateAttendeeId() {
  return `att_${crypto.randomBytes(8).toString('hex')}`;
}

module.exports = {
  ensureTablesExist,
  generateDemoDayId,
  generateAttendeeId,
};
