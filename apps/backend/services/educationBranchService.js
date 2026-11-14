const { getSharedPrismaClient } = require('./sharedDatabase');
const crypto = require('crypto');

let tablesInitialized = false;

const STATEMENTS = [
  // 1. Ensure branches table exists
  `CREATE TABLE IF NOT EXISTS "branches" (
    "id" TEXT PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "workingHours" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_branches_company_id" ON "branches"("companyId")`,
  `CREATE INDEX IF NOT EXISTS "idx_branches_is_active" ON "branches"("isActive")`,

  // 2. Add columns to branches
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "googleMapsUrl" TEXT;`,
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "classrooms" JSONB DEFAULT '[]'::jsonb;`,
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "managerName" TEXT;`,
  `ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "managerPhone" TEXT;`,

  // 3. Add columns to education_demo_days
  `ALTER TABLE "education_demo_days" ADD COLUMN IF NOT EXISTS "branchId" TEXT;`,
  `ALTER TABLE "education_demo_days" ADD COLUMN IF NOT EXISTS "classroomId" TEXT;`,
  `ALTER TABLE "education_demo_days" ADD COLUMN IF NOT EXISTS "googleMapsUrl" TEXT;`,

  // 4. Add columns to education_groups
  `ALTER TABLE "education_groups" ADD COLUMN IF NOT EXISTS "branchId" TEXT;`,
  `ALTER TABLE "education_groups" ADD COLUMN IF NOT EXISTS "classroomId" TEXT;`
];

async function ensureTablesExist(prisma) {
  if (tablesInitialized) return;
  const client = prisma || getSharedPrismaClient();

  // Try ensuring demo day & groups tables exist first if available
  try {
    const { ensureTablesExist: ensureDemoDays } = require('./educationDemoDayService');
    await ensureDemoDays(client).catch(() => {});
  } catch (_) {}

  try {
    const { ensureTablesExist: ensureGroups } = require('./educationGroupsService');
    await ensureGroups(client).catch(() => {});
  } catch (_) {}

  for (const sql of STATEMENTS) {
    try {
      await client.$executeRawUnsafe(sql);
    } catch (err) {
      console.warn(`[EducationBranchService] Warning executing SQL (${sql.slice(0, 50)}...):`, err.message);
    }
  }

  tablesInitialized = true;
}

function generateBranchId() {
  return `br_${crypto.randomBytes(8).toString('hex')}`;
}

function generateClassroomId() {
  return `room_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Safely parse raw classrooms JSON into array of { id, name, capacity, type, isActive }
 */
function parseClassrooms(raw) {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.map((item, idx) => ({
    id: String(item.id || item._id || generateClassroomId()),
    name: String(item.name || `قاعة ${idx + 1}`).trim(),
    capacity: Math.max(1, parseInt(item.capacity, 10) || 20),
    type: String(item.type || 'THEORY').trim().toUpperCase(),
    isActive: item.isActive !== false
  }));
}

/**
 * Validate and sanitize classrooms input array
 */
function validateClassrooms(classrooms) {
  if (!classrooms) return [];
  let list = classrooms;
  if (typeof classrooms === 'string') {
    try {
      list = JSON.parse(classrooms);
    } catch (_) {
      throw new Error('صيغة بيانات القاعات غير صالحة (JSON غير صحيح)');
    }
  }
  if (!Array.isArray(list)) {
    throw new Error('يجب أن تكون القاعات مصفوفة (Array)');
  }

  const seenIds = new Set();

  return list.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`بيانات القاعة رقم ${idx + 1} غير صالحة`);
    }
    const name = String(item.name || '').trim();
    if (!name) {
      throw new Error(`اسم القاعة رقم ${idx + 1} مطلوب`);
    }

    let id = item.id ? String(item.id).trim() : generateClassroomId();
    if (seenIds.has(id)) {
      id = generateClassroomId();
    }
    seenIds.add(id);

    const capacity = Math.max(1, parseInt(item.capacity, 10) || 20);
    const type = item.type ? String(item.type).trim().toUpperCase() : 'THEORY';
    const isActive = item.isActive !== false;

    return {
      id,
      name,
      capacity,
      type,
      isActive
    };
  });
}

/**
 * Helper to fetch all branches for a company with parsed classrooms & summary stats
 */
async function getCompanyBranches(companyId, prisma = null) {
  const client = prisma || getSharedPrismaClient();
  await ensureTablesExist(client);

  const rows = await client.$queryRawUnsafe(`
    SELECT 
      id,
      "companyId",
      name,
      address,
      city,
      phone,
      email,
      "workingHours",
      "googleMapsUrl",
      "managerName",
      "managerPhone",
      "classrooms",
      "isActive",
      "createdAt",
      "updatedAt"
    FROM "branches"
    WHERE "companyId" = $1
    ORDER BY "isActive" DESC, name ASC
  `, companyId);

  return (rows || []).map(b => {
    const classrooms = parseClassrooms(b.classrooms);
    const activeClassrooms = classrooms.filter(c => c.isActive);
    return {
      ...b,
      classrooms,
      totalClassrooms: classrooms.length,
      activeClassroomsCount: activeClassrooms.length,
      totalCapacity: classrooms.reduce((sum, c) => sum + (c.capacity || 0), 0),
      activeCapacity: activeClassrooms.reduce((sum, c) => sum + (c.capacity || 0), 0)
    };
  });
}

/**
 * Helper to fetch a single branch with parsed classrooms
 */
async function getBranchById(branchId, companyId, prisma = null) {
  const client = prisma || getSharedPrismaClient();
  await ensureTablesExist(client);

  const rows = await client.$queryRawUnsafe(`
    SELECT 
      id,
      "companyId",
      name,
      address,
      city,
      phone,
      email,
      "workingHours",
      "googleMapsUrl",
      "managerName",
      "managerPhone",
      "classrooms",
      "isActive",
      "createdAt",
      "updatedAt"
    FROM "branches"
    WHERE id = $1 AND "companyId" = $2
  `, branchId, companyId);

  if (!rows || !rows.length) return null;

  const b = rows[0];
  const classrooms = parseClassrooms(b.classrooms);
  const activeClassrooms = classrooms.filter(c => c.isActive);

  return {
    ...b,
    classrooms,
    totalClassrooms: classrooms.length,
    activeClassroomsCount: activeClassrooms.length,
    totalCapacity: classrooms.reduce((sum, c) => sum + (c.capacity || 0), 0),
    activeCapacity: activeClassrooms.reduce((sum, c) => sum + (c.capacity || 0), 0)
  };
}

module.exports = {
  ensureTablesExist,
  generateBranchId,
  generateClassroomId,
  parseClassrooms,
  validateClassrooms,
  getCompanyBranches,
  getBranchById
};
