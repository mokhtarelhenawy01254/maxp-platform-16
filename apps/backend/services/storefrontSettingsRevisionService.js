const crypto = require('crypto');
const { getSharedPrismaClient } = require('./sharedDatabase');
const redisCacheService = require('./redisCacheService');
const {
  invalidateCompanyStorefrontHtmlCache,
} = require('../controller/storefrontHtmlController');

const MAX_RETAINED_REVISIONS = 30;

/**
 * Deterministically stringifies an object by sorting keys at all levels.
 */
const deterministicStringify = (val) => {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return '[' + val.map(deterministicStringify).join(',') + ']';
  }
  const keys = Object.keys(val).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + deterministicStringify(val[k])).join(',') + '}';
};

/**
 * Generates a SHA-256 hash of a snapshot object.
 */
const hashSnapshot = (snapshot) => {
  if (!snapshot) return '';
  const serialized = deterministicStringify(snapshot);
  return crypto.createHash('sha256').update(serialized).digest('hex');
};

/**
 * Records a new revision for a company if the snapshot differs from the latest one.
 * Keeps only the latest 30 revisions.
 */
const recordRevision = async (arg1, arg2 = null, arg3 = {}) => {
  const isOptionsObject = arg1 && typeof arg1 === 'object' && !Array.isArray(arg1);
  const companyId = isOptionsObject ? arg1.companyId : arg1;
  const snapshot = isOptionsObject ? arg1.snapshot : arg2;
  const userId = isOptionsObject ? (arg1.userId ?? null) : (arg3?.userId ?? null);
  const note = isOptionsObject ? (arg1.note ?? null) : (arg3?.note ?? null);
  const client = isOptionsObject ? (arg1.client ?? null) : (arg3?.client ?? null);

  if (!companyId || !snapshot) {
    return null;
  }

  const prisma = client || getSharedPrismaClient();

  const latest = await prisma.storefrontSettingsRevision.findFirst({
    where: { companyId },
    orderBy: { revisionNumber: 'desc' },
    select: { id: true, revisionNumber: true, snapshot: true },
  });

  if (latest && hashSnapshot(latest.snapshot) === hashSnapshot(snapshot)) {
    return { created: false, reason: 'identical', revision: latest };
  }

  const nextRevisionNumber = (latest?.revisionNumber || 0) + 1;

  const newRevision = await prisma.storefrontSettingsRevision.create({
    data: {
      companyId,
      revisionNumber: nextRevisionNumber,
      snapshot,
      createdBy: userId || null,
      note: note || null,
    },
  });

  try {
    const oldRevisions = await prisma.storefrontSettingsRevision.findMany({
      where: { companyId },
      orderBy: { revisionNumber: 'desc' },
      skip: MAX_RETAINED_REVISIONS,
      select: { id: true },
    });

    if (oldRevisions.length > 0) {
      await prisma.storefrontSettingsRevision.deleteMany({
        where: { id: { in: oldRevisions.map((r) => r.id) } },
      });
    }
  } catch (pruneErr) {
    console.error('⚠️ [REVISION-SERVICE] Error pruning old revisions:', pruneErr);
  }

  return { created: true, revision: newRevision };
};

/**
 * Lists revisions for a company without the full snapshots.
 * Returns up to `limit` revisions (default 20), ordered descending by revisionNumber.
 */
const getRevisions = async ({ companyId, limit = 20, client = null }) => {
  if (!companyId) return [];

  const prisma = client || getSharedPrismaClient();
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const revisions = await prisma.storefrontSettingsRevision.findMany({
    where: { companyId },
    orderBy: { revisionNumber: 'desc' },
    take: safeLimit,
    select: {
      id: true,
      revisionNumber: true,
      createdAt: true,
      createdBy: true,
      note: true,
    },
  });

  const userIds = [...new Set(revisions.map((r) => r.createdBy).filter(Boolean))];
  let userMap = new Map();

  if (userIds.length > 0 && prisma.user?.findMany) {
    try {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      });
      userMap = new Map(users.map((u) => [u.id, u]));
    } catch {
      // Degrade gracefully if user table query fails
    }
  }

  return revisions.map((rev) => {
    const matchedUser = userMap.get(rev.createdBy);
    return {
      id: rev.id,
      revisionNumber: rev.revisionNumber,
      createdAt: rev.createdAt,
      createdByEmail: matchedUser?.email || (rev.createdBy?.includes('@') ? rev.createdBy : undefined),
      createdByName: matchedUser?.name || undefined,
      note: rev.note || null,
    };
  });
};

/**
 * Retrieves a full revision by ID, scoped strictly to the companyId.
 */
const getRevisionById = async ({ companyId, id, client = null }) => {
  if (!companyId || !id) return null;

  const prisma = client || getSharedPrismaClient();

  return prisma.storefrontSettingsRevision.findFirst({
    where: {
      id,
      companyId,
    },
  });
};

/**
 * Restores a specific revision for a company:
 * 1. Verifies the revision belongs to companyId (returns null if not found/mismatched).
 * 2. Writes the snapshot's designTokens as the current storefront state.
 * 3. Creates a new revision record with note="restore of #N".
 * 4. Prunes older revisions to keep <= 30.
 * 5. Invalidates cache.
 */
const restoreRevision = async ({ companyId, id, userId = null, client = null }) => {
  if (!companyId || !id) {
    return { ok: false, status: 400, message: 'companyId and id are required' };
  }

  const prisma = client || getSharedPrismaClient();

  const targetRevision = await prisma.storefrontSettingsRevision.findFirst({
    where: {
      id,
      companyId,
    },
  });

  if (!targetRevision) {
    return { ok: false, status: 404, message: 'Revision not found' };
  }

  const snapshot = targetRevision.snapshot;
  const designTokensToRestore = (snapshot && typeof snapshot === 'object' && snapshot.designTokens)
    ? snapshot.designTokens
    : snapshot;

  const updatedSettings = await prisma.storefrontSettings.upsert({
    where: { companyId },
    update: {
      designTokens: designTokensToRestore,
    },
    create: {
      companyId,
      designTokens: designTokensToRestore,
    },
  });

  const latest = await prisma.storefrontSettingsRevision.findFirst({
    where: { companyId },
    orderBy: { revisionNumber: 'desc' },
    select: { revisionNumber: true },
  });

  const nextRevisionNumber = (latest?.revisionNumber || 0) + 1;

  const restoreRecord = await prisma.storefrontSettingsRevision.create({
    data: {
      companyId,
      revisionNumber: nextRevisionNumber,
      snapshot: targetRevision.snapshot,
      createdBy: userId || null,
      note: `restore of #${targetRevision.revisionNumber}`,
    },
  });

  try {
    const oldRevisions = await prisma.storefrontSettingsRevision.findMany({
      where: { companyId },
      orderBy: { revisionNumber: 'desc' },
      skip: MAX_RETAINED_REVISIONS,
      select: { id: true },
    });

    if (oldRevisions.length > 0) {
      await prisma.storefrontSettingsRevision.deleteMany({
        where: { id: { in: oldRevisions.map((r) => r.id) } },
      });
    }
  } catch (pruneErr) {
    console.error('⚠️ [REVISION-SERVICE] Error pruning old revisions on restore:', pruneErr);
  }

  try {
    await Promise.allSettled([
      redisCacheService.del(`storefront_settings:${companyId}`),
      redisCacheService.del(`public_storefront_settings_v1:${companyId}`),
    ]);
    invalidateCompanyStorefrontHtmlCache(companyId);
  } catch (cacheErr) {
    console.error('⚠️ [REVISION-SERVICE] Error invalidating redis cache:', cacheErr);
  }

  return {
    ok: true,
    restoredSettings: updatedSettings,
    newRevision: restoreRecord,
    targetRevision,
  };
};

module.exports = {
  MAX_RETAINED_REVISIONS,
  deterministicStringify,
  hashSnapshot,
  recordRevision,
  getRevisions,
  getRevisionById,
  restoreRevision,
};
