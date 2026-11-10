const { getSharedPrismaClient } = require('./sharedDatabase');
const crypto = require('crypto');

let tablesInitialized = false;

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "education_groups" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "level" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 15,
    "feeType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "teacherRateType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "teacherRateValue" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "scheduleDays" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "startTime" TEXT DEFAULT '17:00',
    "endTime" TEXT DEFAULT '18:30',
    "room" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "startDate" TIMESTAMP WITH TIME ZONE,
    "endDate" TIMESTAMP WITH TIME ZONE,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_education_groups_company" ON "education_groups"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "idx_education_groups_subject" ON "education_groups"("subjectId")`,
  `CREATE INDEX IF NOT EXISTS "idx_education_groups_teacher" ON "education_groups"("teacherId")`,

  `CREATE TABLE IF NOT EXISTS "education_group_members" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextRenewalDate" TIMESTAMP WITH TIME ZONE,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_group_members_group" ON "education_group_members"("groupId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_group_members_student" ON "education_group_members"("studentId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_group_members_company" ON "education_group_members"("companyId")`,

  `CREATE TABLE IF NOT EXISTS "education_group_sessions" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teacherId" TEXT,
    "sessionDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "topic" TEXT,
    "homework" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_group_sessions_group" ON "education_group_sessions"("groupId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_group_sessions_company" ON "education_group_sessions"("companyId")`,

  `CREATE TABLE IF NOT EXISTS "education_group_attendance" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "notifiedParentAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_group_att_session" ON "education_group_attendance"("sessionId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_group_att_student" ON "education_group_attendance"("studentId")`,
  `CREATE INDEX IF NOT EXISTS "idx_edu_group_att_group" ON "education_group_attendance"("groupId")`
];

const ensureTablesExist = async (prisma) => {
  if (tablesInitialized) return;
  try {
    for (const stmt of STATEMENTS) {
      await prisma.$executeRawUnsafe(stmt);
    }
    tablesInitialized = true;
    console.log('[EducationGroupsService] Tables and indices verified successfully');
  } catch (err) {
    console.error('[EducationGroupsService] ensureTablesExist error:', err.message);
    throw err;
  }
};

const generateGroupId = () => `egrp_${crypto.randomBytes(8).toString('hex')}`;
const generateMemberId = () => `egm_${crypto.randomBytes(8).toString('hex')}`;
const generateSessionId = () => `egs_${crypto.randomBytes(8).toString('hex')}`;
const generateAttId = () => `ega_${crypto.randomBytes(8).toString('hex')}`;

module.exports = {
  ensureTablesExist,
  generateGroupId,
  generateMemberId,
  generateSessionId,
  generateAttId
};
