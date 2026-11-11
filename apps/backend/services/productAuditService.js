const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { randomUUID } = require('crypto');
const uuidv4 = () => randomUUID();

const VALID_ACTIONS = new Set([
  'CREATE',
  'UPDATE',
  'BULK_UPDATE',
  'IMPORT',
  'DELETE',
  'STATUS_CHANGE',
]);

const VALID_SOURCES = new Set(['UI', 'IMPORT', 'API', 'AGENT']);

const TRACKED_FIELDS = [
  'name',
  'price',
  'cost',
  'sku',
  'barcode',
  'stock',
  'status',
  'isActive',
  'categoryId',
  'description',
  'comparePrice',
  'weight',
  'dimensions',
  'tags',
  'isHidden',
  'trackInventory',
  'deletedAt',
  'images',
];

const parseImagesCount = (value) => {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.length;
    } catch {
      return value.split(',').filter(Boolean).length;
    }
  }
  return 1;
};

const sanitizeValueForAudit = (field, value) => {
  if (value === undefined || value === null) return null;
  if (field === 'images' || field === 'mainImage') {
    const count = parseImagesCount(value);
    return count > 0 ? `تم تغيير ${count} صور` : 'بدون صور';
  }
  if (typeof value === 'string' && value.startsWith('data:image')) {
    return 'صورة مخصصة';
  }
  if (typeof value === 'string' && value.length > 500) {
    return `${value.substring(0, 200)}... (تم تقليص النص)`;
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    // If it's a Decimal from Prisma
    if (typeof value.toNumber === 'function') {
      return value.toNumber();
    }
    if (typeof value.toString === 'function' && !isNaN(Number(value.toString()))) {
      return Number(value.toString());
    }
  }
  return value;
};

const resolveUserName = (user) => {
  if (!user) return 'مستخدم غير معروف';
  if (typeof user === 'string') return user;
  const directName = user.name || user.fullName || user.username;
  if (directName && typeof directName === 'string' && directName.trim()) {
    return directName.trim();
  }
  const composed = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  if (composed) return composed;
  if (user.email) return user.email;
  return 'مستخدم النظام';
};

const computeProductDiff = (before = {}, after = {}) => {
  const diff = {};
  if (!before && !after) return diff;

  const safeBefore = before || {};
  const safeAfter = after || {};

  const numericFields = new Set(['price', 'cost', 'comparePrice', 'stock', 'weight']);
  const booleanFields = new Set(['isActive', 'isHidden', 'trackInventory']);

  const allKeys = new Set([
    ...Object.keys(safeBefore).filter((k) => TRACKED_FIELDS.includes(k)),
    ...Object.keys(safeAfter).filter((k) => TRACKED_FIELDS.includes(k)),
  ]);

  for (const field of allKeys) {
    let beforeVal = safeBefore[field];
    let afterVal = safeAfter[field];

    if (beforeVal === undefined && afterVal === undefined) continue;

    // Decimals & Numbers
    if (numericFields.has(field)) {
      const numBefore = beforeVal !== null && beforeVal !== undefined ? Number(beforeVal) : null;
      const numAfter = afterVal !== null && afterVal !== undefined ? Number(afterVal) : null;

      if (numBefore !== numAfter) {
        diff[field] = {
          before: numBefore,
          after: numAfter,
        };
      }
      continue;
    }

    // Booleans
    if (booleanFields.has(field)) {
      const boolBefore = beforeVal !== null && beforeVal !== undefined ? Boolean(beforeVal) : null;
      const boolAfter = afterVal !== null && afterVal !== undefined ? Boolean(afterVal) : null;

      if (boolBefore !== boolAfter) {
        diff[field] = {
          before: boolBefore,
          after: boolAfter,
        };
      }
      continue;
    }

    // Images / Media
    if (field === 'images' || field === 'mainImage') {
      const countBefore = parseImagesCount(beforeVal);
      const countAfter = parseImagesCount(afterVal);
      const strBefore = typeof beforeVal === 'string' ? beforeVal : JSON.stringify(beforeVal || []);
      const strAfter = typeof afterVal === 'string' ? afterVal : JSON.stringify(afterVal || []);

      if (strBefore !== strAfter || countBefore !== countAfter) {
        diff[field] = {
          before: countBefore > 0 ? `${countBefore} صورة` : null,
          after: `تم تغيير ${countAfter} صور`,
        };
      }
      continue;
    }

    // Strings / general
    const sanitizedBefore = sanitizeValueForAudit(field, beforeVal);
    const sanitizedAfter = sanitizeValueForAudit(field, afterVal);

    const normBefore = sanitizedBefore === null || sanitizedBefore === undefined ? null : String(sanitizedBefore).trim();
    const normAfter = sanitizedAfter === null || sanitizedAfter === undefined ? null : String(sanitizedAfter).trim();

    if (normBefore !== normAfter) {
      diff[field] = {
        before: sanitizedBefore,
        after: sanitizedAfter,
      };
    }
  }

  return diff;
};

const buildDeleteSnapshotChanges = (target = null, deletedAtAfter = new Date().toISOString()) => {
  const safeTarget = target || {};
  const rawPrice =
    safeTarget.price !== null && safeTarget.price !== undefined
      ? sanitizeValueForAudit('price', safeTarget.price)
      : null;
  const variantsCount =
    safeTarget._count?.productVariants ??
    safeTarget._count?.variants ??
    (Array.isArray(safeTarget.productVariants)
      ? safeTarget.productVariants.length
      : Array.isArray(safeTarget.variants)
        ? safeTarget.variants.length
        : typeof safeTarget.variantsCount === 'number'
          ? safeTarget.variantsCount
          : 0);

  const snapshot = {
    name: safeTarget.name || null,
    sku: safeTarget.sku || null,
    price: rawPrice,
    variantsCount,
  };

  return {
    snapshot: {
      ...snapshot,
      before: snapshot,
      after: null,
    },
    name: { before: snapshot.name, after: null },
    sku: { before: snapshot.sku, after: null },
    price: { before: snapshot.price, after: null },
    variantsCount: { before: snapshot.variantsCount, after: 0 },
    deletedAt: {
      before: safeTarget.deletedAt || null,
      after: deletedAtAfter,
    },
  };
};

const executeAuditInsert = async (prisma, logData, { throwOnError = false } = {}) => {
  try {
    if (prisma.productAuditLog && typeof prisma.productAuditLog.create === 'function') {
      return await prisma.productAuditLog.create({
        data: logData,
      });
    }

    // Raw SQL fallback if Prisma Client hasn't been generated in current process
    if (typeof prisma.$executeRawUnsafe !== 'function') {
      return null;
    }

    const id = logData.id || uuidv4();
    const changesJson = JSON.stringify(logData.changes || {});
    await prisma.$executeRawUnsafe(
      `INSERT INTO "product_audit_logs" ("id", "companyId", "productId", "userId", "userName", "action", "changes", "source", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW())`,
      id,
      logData.companyId,
      logData.productId,
      logData.userId || null,
      logData.userName || null,
      logData.action,
      changesJson,
      logData.source || 'UI'
    );
    return { id, ...logData };
  } catch (err) {
    console.error('⚠️ [PRODUCT-AUDIT] Failed to insert audit log:', err.message);
    if (throwOnError) {
      throw err;
    }
    return null;
  }
};

const logProductChange = async ({
  companyId,
  productId,
  user,
  action = 'UPDATE',
  before = null,
  after = null,
  source = 'UI',
  changes = null,
  prismaClient = null,
  throwOnError = false,
}) => {
  if (!companyId || !productId) {
    return null;
  }

  const normalizedAction = VALID_ACTIONS.has(action) ? action : 'UPDATE';
  const normalizedSource = VALID_SOURCES.has(source) ? source : 'UI';
  const userId = user?.id || null;
  const userName = resolveUserName(user);

  let finalChanges = changes;

  if (!finalChanges) {
    if (normalizedAction === 'CREATE' || normalizedAction === 'IMPORT') {
      finalChanges = {};
      const target = after || {};
      for (const field of TRACKED_FIELDS) {
        if (target[field] !== undefined && target[field] !== null) {
          finalChanges[field] = {
            before: null,
            after: sanitizeValueForAudit(field, target[field]),
          };
        }
      }
    } else if (normalizedAction === 'DELETE') {
      finalChanges = buildDeleteSnapshotChanges(before);
    } else {
      finalChanges = computeProductDiff(before, after);
    }
  }

  // If action is UPDATE and no fields actually changed, don't create an empty log
  if (normalizedAction === 'UPDATE' && Object.keys(finalChanges).length === 0) {
    return null;
  }

  const prisma = prismaClient || getSharedPrismaClient();
  const logData = {
    id: uuidv4(),
    companyId,
    productId,
    userId,
    userName,
    action: normalizedAction,
    changes: finalChanges,
    source: normalizedSource,
    createdAt: new Date(),
  };

  return executeAuditInsert(prisma, logData, { throwOnError });
};

const logBulkProductChanges = async ({
  companyId,
  productIds = [],
  user,
  action = 'BULK_UPDATE',
  source = 'UI',
  changes = {},
  productsBefore = [],
  prismaClient = null,
  throwOnError = false,
}) => {
  if (!companyId || !Array.isArray(productIds) || productIds.length === 0) {
    return [];
  }

  const normalizedAction = VALID_ACTIONS.has(action) ? action : 'BULK_UPDATE';
  const normalizedSource = VALID_SOURCES.has(source) ? source : 'UI';
  const userId = user?.id || null;
  const userName = resolveUserName(user);
  const prisma = prismaClient || getSharedPrismaClient();

  const beforeMap = (productsBefore || []).reduce((acc, p) => {
    if (p && p.id) acc[p.id] = p;
    return acc;
  }, {});

  const buildLogData = (productId) => {
    let productChanges = changes;
    if (typeof changes === 'function') {
      productChanges = changes(productId, beforeMap[productId]);
    } else if (normalizedAction === 'DELETE' && beforeMap[productId]) {
      productChanges = buildDeleteSnapshotChanges(beforeMap[productId]);
    } else if (beforeMap[productId]) {
      productChanges = computeProductDiff(beforeMap[productId], changes);
    }

    return {
      id: uuidv4(),
      companyId,
      productId,
      userId,
      userName,
      action: normalizedAction,
      changes: productChanges || {},
      source: normalizedSource,
      createdAt: new Date(),
    };
  };

  if (prismaClient) {
    const results = [];
    for (const productId of productIds) {
      const inserted = await executeAuditInsert(prisma, buildLogData(productId), { throwOnError });
      results.push(inserted);
    }
    return results;
  }

  const insertTasks = productIds.map((productId) =>
    executeAuditInsert(prisma, buildLogData(productId), { throwOnError })
  );

  return Promise.all(insertTasks);
};

const getProductHistory = async ({
  companyId,
  productId,
  page = 1,
  limit = 20,
}) => {
  if (!companyId || !productId) {
    return {
      logs: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const prisma = getSharedPrismaClient();

  try {
    if (prisma.productAuditLog && typeof prisma.productAuditLog.findMany === 'function') {
      const [total, logs] = await Promise.all([
        prisma.productAuditLog.count({
          where: { companyId, productId },
        }),
        prisma.productAuditLog.findMany({
          where: { companyId, productId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: safeLimit,
        }),
      ]);

      return {
        logs,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit) || 0,
        },
      };
    }

    // Raw SQL fallback
    const countResult = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "product_audit_logs" WHERE "companyId" = $1 AND "productId" = $2`,
      companyId,
      productId
    );
    const total = countResult?.[0]?.count || 0;

    const logs = await prisma.$queryRawUnsafe(
      `SELECT * FROM "product_audit_logs" 
       WHERE "companyId" = $1 AND "productId" = $2 
       ORDER BY "createdAt" DESC 
       LIMIT $3 OFFSET $4`,
      companyId,
      productId,
      safeLimit,
      skip
    );

    return {
      logs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 0,
      },
    };
  } catch (err) {
    console.error('⚠️ [PRODUCT-AUDIT] Error retrieving product history:', err.message);
    return {
      logs: [],
      pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 },
    };
  }
};

const getCompanyAuditLogs = async ({
  companyId,
  userId = null,
  action = null,
  productId = null,
  from = null,
  to = null,
  page = 1,
  limit = 20,
}) => {
  if (!companyId) {
    return {
      logs: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const where = { companyId };
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (productId) where.productId = productId;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const prisma = getSharedPrismaClient();

  try {
    if (prisma.productAuditLog && typeof prisma.productAuditLog.findMany === 'function') {
      const [total, logs] = await Promise.all([
        prisma.productAuditLog.count({ where }),
        prisma.productAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: safeLimit,
        }),
      ]);

      return {
        logs,
        pagination: {
          page: safePage,
          limit: safeLimit,
          total,
          totalPages: Math.ceil(total / safeLimit) || 0,
        },
      };
    }

    // Raw SQL fallback
    const conditions = ['"companyId" = $1'];
    const values = [companyId];
    let idx = 2;

    if (userId) {
      conditions.push(`"userId" = $${idx++}`);
      values.push(userId);
    }
    if (action) {
      conditions.push(`"action" = $${idx++}`);
      values.push(action);
    }
    if (productId) {
      conditions.push(`"productId" = $${idx++}`);
      values.push(productId);
    }
    if (from) {
      conditions.push(`"createdAt" >= $${idx++}`);
      values.push(new Date(from));
    }
    if (to) {
      conditions.push(`"createdAt" <= $${idx++}`);
      values.push(new Date(to));
    }

    const whereClause = conditions.join(' AND ');
    const countQuery = `SELECT COUNT(*)::int as count FROM "product_audit_logs" WHERE ${whereClause}`;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...values);
    const total = countResult?.[0]?.count || 0;

    const listQuery = `SELECT * FROM "product_audit_logs" WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT $${idx++} OFFSET $${idx++}`;
    const logs = await prisma.$queryRawUnsafe(listQuery, ...values, safeLimit, skip);

    return {
      logs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 0,
      },
    };
  } catch (err) {
    console.error('⚠️ [PRODUCT-AUDIT] Error retrieving company audit logs:', err.message);
    return {
      logs: [],
      pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 },
    };
  }
};

module.exports = {
  VALID_ACTIONS,
  VALID_SOURCES,
  TRACKED_FIELDS,
  resolveUserName,
  buildDeleteSnapshotChanges,
  computeProductDiff,
  logProductChange,
  logBulkProductChanges,
  getProductHistory,
  getCompanyAuditLogs,
};
