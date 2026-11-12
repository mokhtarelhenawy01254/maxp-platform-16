const cron = require('node-cron');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { sendAbandonedCartNotification } = require('../services/whatsapp/WhatsAppNotificationService');

/**
 * 🆕 Wave 1 — Abandoned guest-cart recovery cron.
 * sendAbandonedCartNotification + templates + settings existed with ZERO callers
 * (orphaned feature). Now: hourly sweep over guest carts per enabled company,
 * one WhatsApp reminder per window (1H / 24H / 72H), deduped by notification log.
 */

const WINDOWS = [
  { eventType: 'CART_ABANDONED_1H', minHours: 1, maxHours: 2 },
  { eventType: 'CART_ABANDONED_24H', minHours: 24, maxHours: 48 },
  { eventType: 'CART_ABANDONED_72H', minHours: 72, maxHours: 96 }
];

function extractGuestContact(cart) {
  let checkout = null;
  try {
    checkout = typeof cart.checkoutData === 'string' ? JSON.parse(cart.checkoutData) : cart.checkoutData;
  } catch (e) {
    checkout = null;
  }
  if (!checkout || typeof checkout !== 'object') return null;
  const phone = checkout.customerPhone || checkout.phone || checkout.mobile || checkout.phoneNumber || null;
  const name = checkout.customerName || checkout.name || checkout.fullName || checkout.firstName || null;
  if (!phone) return null;
  return { phone: String(phone).trim(), name: name ? String(name).trim() : null };
}

async function processAbandonedCarts() {
  const prisma = getSharedPrismaClient();
  const now = Date.now();
  let sent = 0;

  const enabledCompanies = await prisma.whatsAppNotificationSettings.findMany({
    where: { abandonedCartEnabled: true },
    select: { companyId: true }
  });

  for (const { companyId } of enabledCompanies) {
    for (const window of WINDOWS) {
      const olderThan = new Date(now - window.minHours * 60 * 60 * 1000);
      const newerThan = new Date(now - window.maxHours * 60 * 60 * 1000);

      const carts = await prisma.guestCart.findMany({
        where: { companyId, updatedAt: { gte: newerThan, lte: olderThan } },
        take: 200
      });

      for (const cart of carts) {
        try {
          const alreadySent = await prisma.whatsAppNotificationLog.findFirst({
            where: { companyId, cartId: cart.id, eventType: window.eventType },
            select: { id: true }
          });
          if (alreadySent) continue;

          const contact = extractGuestContact(cart);
          if (!contact) continue;

          let items = [];
          try {
            items = typeof cart.items === 'string' ? JSON.parse(cart.items) : (cart.items || []);
          } catch (e) {
            items = [];
          }

          const result = await sendAbandonedCartNotification({
            id: cart.id,
            companyId: cart.companyId,
            customerId: null,
            customerPhone: contact.phone,
            customerName: contact.name,
            items,
            total: parseFloat(cart.total) || 0,
            currency: 'EGP'
          }, window.eventType);

          if (result && result.success) sent += 1;
        } catch (cartError) {
          console.error('[CART-RECOVERY-CRON] Cart processing failed:', cart.id, cartError.message);
        }
      }
    }
  }

  return { sent };
}

function startAbandonedCartRecoveryScheduler() {
  console.log('[CART-RECOVERY-CRON] Initializing abandoned cart recovery scheduler...');

  cron.schedule('5 * * * *', async () => {
    console.log('[CART-RECOVERY-CRON] Sweeping abandoned guest carts...');
    try {
      const result = await processAbandonedCarts();
      if (result && result.sent > 0) {
        console.log(`[CART-RECOVERY-CRON] Sent ${result.sent} recovery reminder(s)`);
      }
    } catch (error) {
      console.error('[CART-RECOVERY-CRON] Error during sweep:', error.message);
    }
  });

  console.log('[CART-RECOVERY-CRON] Scheduler started (runs hourly at minute 5)');
}

module.exports = { startAbandonedCartRecoveryScheduler, processAbandonedCarts };
