/**
 * @file inboundDeduplicationGuard.js
 * @description Atomic deduplication guard for inbound messages (WhatsApp + Messenger).
 *
 * Ensures each external inbound message (wamid / mid) is claimed exactly once per (companyId, channel, externalMessageId).
 * Prevents race conditions from parallel webhooks, retries, and reconnect replays.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

let schemaEnsured = false;
let schemaEnsurePromise = null;

/**
 * Idempotently ensures the message_inbound_dedupe table, unique index, and message columns exist.
 * Follows the proven pattern from metaAppRegistryService.js (lines 398-406).
 */
async function ensureInboundDedupeSchema(customPrisma) {
  if (schemaEnsured) return;
  if (schemaEnsurePromise) return schemaEnsurePromise;

  const prisma = customPrisma || getSharedPrismaClient();
  if (!prisma || typeof prisma.$executeRawUnsafe !== 'function') {
    schemaEnsured = true;
    return;
  }

  schemaEnsurePromise = (async () => {
    const ddlStatements = [
      `CREATE TABLE IF NOT EXISTS "message_inbound_dedupe" (
        "id" TEXT PRIMARY KEY,
        "companyId" TEXT NOT NULL,
        "channel" TEXT NOT NULL,
        "externalMessageId" TEXT NOT NULL,
        "conversationId" TEXT,
        "messageId" TEXT,
        "duplicateCount" INTEGER NOT NULL DEFAULT 0,
        "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "message_inbound_dedupe_companyId_channel_externalMessageId_key" ON "message_inbound_dedupe"("companyId", "channel", "externalMessageId");`,
      `CREATE INDEX IF NOT EXISTS "message_inbound_dedupe_conversationId_idx" ON "message_inbound_dedupe"("conversationId");`,
      `CREATE INDEX IF NOT EXISTS "message_inbound_dedupe_firstSeenAt_idx" ON "message_inbound_dedupe"("firstSeenAt");`,
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "channel" TEXT;`,
      `ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "externalMessageId" TEXT;`,
      `CREATE INDEX IF NOT EXISTS "messages_conversationId_externalMessageId_idx" ON "messages"("conversationId", "externalMessageId");`
    ];

    for (const sql of ddlStatements) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (err) {
        // Table or index already exists or running in an environment without DDL permissions
      }
    }
    schemaEnsured = true;
  })();

  try {
    await schemaEnsurePromise;
  } finally {
    schemaEnsurePromise = null;
  }
}

/**
 * Reset schema ensure state (used in unit tests if needed)
 */
function resetSchemaEnsureState() {
  schemaEnsured = false;
  schemaEnsurePromise = null;
}

/**
 * Claims an inbound message atomically using the unique constraint on (companyId, channel, externalMessageId).
 *
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.channel - 'whatsapp' | 'facebook'
 * @param {string} params.externalMessageId - wamid or mid
 * @param {string} [params.conversationId]
 * @param {Object} [params.prisma] - Optional prisma client (for unit testing or transactions)
 * @returns {Promise<{ duplicate: boolean, claim: Object|null }>}
 */
async function claimInboundMessage({ companyId, channel, externalMessageId, conversationId, prisma: customPrisma }) {
  if (!externalMessageId || !companyId || !channel) {
    return { duplicate: false, claim: null };
  }

  const prisma = customPrisma || getSharedPrismaClient();
  await ensureInboundDedupeSchema(prisma);

  try {
    const claim = await prisma.messageInboundDedupe.create({
      data: {
        companyId,
        channel,
        externalMessageId: String(externalMessageId),
        conversationId: conversationId || null
      }
    });
    return { duplicate: false, claim };
  } catch (e) {
    const isUniqueViolation =
      e.code === 'P2002' ||
      e.code === '23505' ||
      (e.message && (e.message.includes('Unique constraint') || e.message.includes('unique constraint')));

    if (isUniqueViolation) {
      try {
        await prisma.messageInboundDedupe.updateMany({
          where: {
            companyId,
            channel,
            externalMessageId: String(externalMessageId)
          },
          data: {
            duplicateCount: { increment: 1 },
            lastSeenAt: new Date()
          }
        });
      } catch (updateErr) {
        // Non-blocking: record update is best-effort
      }
      return { duplicate: true, claim: null };
    }

    // Rethrow any other error to prevent silent drop of deduplication protection
    throw e;
  }
}

/**
 * Commits the claim by linking the created message.id to the deduplication claim.
 *
 * @param {string} claimId
 * @param {string} messageId
 * @param {Object} [customPrisma]
 * @returns {Promise<Object|null>}
 */
async function commitInboundClaim(claimId, messageId, customPrisma) {
  if (!claimId) return null;
  const prisma = customPrisma || getSharedPrismaClient();
  try {
    return await prisma.messageInboundDedupe.update({
      where: { id: claimId },
      data: { messageId: messageId ? String(messageId) : undefined }
    });
  } catch (err) {
    console.warn('[INBOUND-DEDUPE] Failed to commit claim:', err.message);
    return null;
  }
}

/**
 * Releases the claim if message creation fails, allowing subsequent retries to proceed.
 *
 * @param {string} claimId
 * @param {Object} [customPrisma]
 * @returns {Promise<boolean>}
 */
async function releaseInboundClaim(claimId, customPrisma) {
  if (!claimId) return false;
  const prisma = customPrisma || getSharedPrismaClient();
  try {
    await prisma.messageInboundDedupe.delete({
      where: { id: claimId }
    });
    return true;
  } catch (err) {
    console.warn('[INBOUND-DEDUPE] Failed to release claim:', err.message);
    return false;
  }
}

/**
 * Logs a standard single-line duplicate_skipped audit record.
 *
 * @param {Object} params
 * @param {string} params.channel
 * @param {string} params.externalMessageId
 * @param {string} params.companyId
 * @param {string} [params.conversationId]
 */
function logDuplicateSkipped({ channel, externalMessageId, companyId, conversationId }) {
  console.log(
    `[INBOUND-DEDUPE] duplicate_skipped channel=${channel || ''} externalMessageId=${externalMessageId || ''} companyId=${companyId || ''} conversationId=${conversationId || ''}`
  );
}

module.exports = {
  claimInboundMessage,
  commitInboundClaim,
  releaseInboundClaim,
  logDuplicateSkipped,
  ensureInboundDedupeSchema,
  resetSchemaEnsureState
};
