const { AsyncLocalStorage } = require('async_hooks');
const { isValidOrderStatusEnum } = require('../utils/orderStatusEnum');

const suppressionStorage = new AsyncLocalStorage();

/**
 * Returns true if linked order status sync is currently suppressed
 * in the active asynchronous execution context.
 */
function isSuppressed() {
  return !!suppressionStorage.getStore();
}

/**
 * Runs the given function inside a context where linked order status sync
 * is suppressed (preventing re-entrant loops).
 */
function runSuppressed(fn) {
  return suppressionStorage.run(true, fn);
}

// 60-second in-memory connection cache
const CONNECTION_CACHE_TTL_MS = 60 * 1000;
const connectionCache = new Map(); // companyId -> { hasConnection: boolean, expiresAt: number }

function __clearConnectionCache() {
  connectionCache.clear();
}

let testPrismaClient = null;
function __setPrismaForTests(client) {
  testPrismaClient = client;
}

function getPrisma() {
  if (testPrismaClient) return testPrismaClient;
  const { getSharedPrismaClient } = require('./sharedDatabase');
  return getSharedPrismaClient();
}

/**
 * Cheap gate before any DB work:
 * Checks whether companyId has an ACTIVE companyConnection as provider OR consumer.
 * Cached for 60 seconds so companies without connections cost zero extra queries.
 */
async function hasActiveConnection(companyId) {
  if (!companyId) return false;
  const now = Date.now();
  const cached = connectionCache.get(companyId);
  if (cached && cached.expiresAt > now) {
    return cached.hasConnection;
  }

  try {
    const prisma = getPrisma();
    const tenantContext = require('./tenantContext');
    const conn = await tenantContext.bypass(async () => {
      return await prisma.companyConnection.findFirst({
        where: {
          status: 'ACTIVE',
          OR: [
            { providerId: companyId },
            { consumerId: companyId }
          ]
        },
        select: { id: true }
      });
    });

    const hasConnection = !!conn;
    connectionCache.set(companyId, { hasConnection, expiresAt: now + CONNECTION_CACHE_TTL_MS });
    return hasConnection;
  } catch (err) {
    console.warn(`⚠️ [LINKED-SYNC] Error checking active connection for ${companyId}:`, err.message);
    return false;
  }
}

// Valid OrderStatus enum values live in utils/orderStatusEnum.js (single source of truth).

/**
 * Schedules a background status mirror for linked orders.
 * Returns immediately if suppressed or caller should not block.
 */
function scheduleMirror({ model, orderId, companyId, newStatus }) {
  if (isSuppressed()) {
    return;
  }

  setImmediate(() => {
    mirrorStatus({ model, orderId, companyId, newStatus }).catch((err) => {
      console.warn('⚠️ [LINKED-SYNC] scheduleMirror unhandled error:', err?.message || err);
    });
  });
}

/**
 * Synchronously or asynchronously mirrors order status to linked peer order(s).
 * Always catches internal errors and never rejects into the caller.
 *
 * @param {Object} params
 * @param {'Order'|'GuestOrder'} params.model
 * @param {string} params.orderId
 * @param {string} params.companyId
 * @param {string} params.newStatus
 * @returns {Promise<{ mirrored: number, skipped: number }>}
 */
async function mirrorStatus({ model, orderId, companyId, newStatus }) {
  try {
    if (!model || !orderId || !companyId || typeof newStatus !== 'string' || !newStatus.trim()) {
      return { mirrored: 0, skipped: 1 };
    }

    // Cheap gate before any DB work
    const active = await hasActiveConnection(companyId);
    if (!active) {
      return { mirrored: 0, skipped: 0 };
    }

    const prisma = getPrisma();
    const tenantContext = require('./tenantContext');

    // Load source record inside tenantContext.run(companyId, ...)
    const sourceRecord = await tenantContext.run(companyId, async () => {
      if (model === 'Order') {
        return await prisma.order.findUnique({
          where: { id: orderId }
        });
      } else if (model === 'GuestOrder') {
        return await prisma.guestOrder.findUnique({
          where: { id: orderId }
        });
      }
      return null;
    });

    if (!sourceRecord) {
      return { mirrored: 0, skipped: 1 };
    }

    // Resolve peers
    const peers = []; // array of { model: 'Order'|'GuestOrder', peer: object }
    if (model === 'Order' && sourceRecord.sourceType === 'internal_push' && sourceRecord.externalId) {
      // Provider copy: Peer is the consumer record with id === externalId
      const consumerPeer = await tenantContext.bypass(async () => {
        const orderPeer = await prisma.order.findUnique({
          where: { id: sourceRecord.externalId }
        });
        if (orderPeer) return { model: 'Order', peer: orderPeer };

        const guestPeer = await prisma.guestOrder.findUnique({
          where: { id: sourceRecord.externalId }
        });
        if (guestPeer) return { model: 'GuestOrder', peer: guestPeer };

        return null;
      });

      if (consumerPeer) {
        peers.push(consumerPeer);
      }
    } else {
      // Consumer original (regular Order or GuestOrder):
      // Peers are provider copies with externalId === orderId and sourceType === 'internal_push'
      const providerCopies = await tenantContext.bypass(async () => {
        return await prisma.order.findMany({
          where: {
            externalId: orderId,
            sourceType: 'internal_push'
          },
          take: 20
        });
      });

      if (Array.isArray(providerCopies)) {
        for (const copy of providerCopies) {
          peers.push({ model: 'Order', peer: copy });
        }
      }
    }

    if (peers.length === 0) {
      return { mirrored: 0, skipped: 0 };
    }

    let mirrored = 0;
    let skipped = 0;

    for (const item of peers) {
      try {
        const peer = item.peer;
        const peerModel = item.model;

        // Skip when peer already has the target status (idempotent, no duplicate history)
        const orderStatus = String(newStatus).trim().toUpperCase();
        if (peerModel === 'Order') {
          if (String(peer.status || '').toUpperCase() === orderStatus) {
            skipped++;
            continue;
          }
        } else if (peer.status === newStatus) {
          skipped++;
          continue;
        }

        if (peerModel === 'Order') {
          if (!isValidOrderStatusEnum(orderStatus)) {
            console.warn(`⚠️ [LINKED-SYNC] Invalid status "${newStatus}" for Order ${peer.id}, skipping`);
            skipped++;
            continue;
          }

          await tenantContext.run(peer.companyId, async () => {
            return await runSuppressed(async () => {
              return await prisma.order.update({
                where: { id: peer.id },
                data: {
                  status: orderStatus,
                  customStatusCode: null,
                  updatedAt: new Date(),
                  statusHistory: {
                    create: {
                      status: orderStatus,
                      oldStatus: peer.status,
                      changedBy: null,
                      userName: 'System',
                      reason: 'مزامنة تلقائية من الشركة المرتبطة'
                    }
                  }
                }
              });
            });
          });
          mirrored++;
        } else if (peerModel === 'GuestOrder') {
          const guestStatus = String(newStatus).slice(0, 40);
          await tenantContext.run(peer.companyId, async () => {
            return await runSuppressed(async () => {
              return await prisma.guestOrder.update({
                where: { id: peer.id },
                data: {
                  status: guestStatus,
                  updatedAt: new Date(),
                  OrderStatusHistory: {
                    create: {
                      status: guestStatus,
                      oldStatus: peer.status,
                      changedBy: null,
                      userName: 'System',
                      reason: 'مزامنة تلقائية من الشركة المرتبطة'
                    }
                  }
                }
              });
            });
          });
          mirrored++;
        }
      } catch (peerErr) {
        console.warn(`⚠️ [LINKED-SYNC] Failed updating peer ${item.peer?.id}:`, peerErr.message);
        skipped++;
      }
    }

    return { mirrored, skipped };
  } catch (err) {
    console.warn('⚠️ [LINKED-SYNC] mirrorStatus failed:', err.message);
    return { mirrored: 0, skipped: 1 };
  }
}

module.exports = {
  scheduleMirror,
  mirrorStatus,
  runSuppressed,
  isSuppressed,
  __setPrismaForTests,
  __clearConnectionCache
};
