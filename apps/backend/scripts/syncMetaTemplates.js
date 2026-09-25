/**
 * syncMetaTemplates.js
 * 🔄 مزامنة أوتوماتيكية لقوالب ميتا المعتمدة من Meta Cloud API إلى الـ DB.
 * يُستدعى من cron (كل ساعة) ليتعرّف أي قالب جديد بعد اعتماده من ميتا تلقائياً
 * دون تدخل يدوي. يربط القوالب بأحداث الطلبات (ORDER_*) والمناسبات حسب الاسم.
 */
const axios = require('axios');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getMetaGraphApiVersion } = require('../config/metaApi');
const { decryptField } = require('../utils/fieldEncryption');
const prisma = getSharedPrismaClient();

const COMPANY_ID = process.env.SYNC_COMPANY_ID || 'cmleybpf70028juo2wwpmp8rt';
const API_VER = getMetaGraphApiVersion();

// خريطة أسماء القوالب الميتا الشائعة -> eventType في نظامنا
const META_NAME_TO_EVENT = {
  processing: 'PROCESSING',
  shipped: 'SHIPPED',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
  returned: 'RETURNED',
  refunded: 'REFUNDED',
  confirmed: 'CONFIRMED',
  order_created: 'ORDER_CREATED',
  loyalty_points_awarded: 'LOYALTY_POINTS_AWARDED',
  loyalty_points_expired: 'LOYALTY_POINTS_EXPIRED',
  loyalty_points_redeemed: 'LOYALTY_POINTS_REDEEMED',
  loyalty_points_expiry_warning: 'LOYALTY_POINTS_EXPIRY_WARNING',
  loyalty_tier_upgraded: 'LOYALTY_TIER_UPGRADED',
  loyalty_tier_downgraded: 'LOYALTY_TIER_DOWNGRADED',
  cashback_credited: 'CASHBACK_CREDITED',
  cashback_reversed: 'CASHBACK_REVERSED',
  customer_quality_upgraded: 'CUSTOMER_QUALITY_UPGRADED',
  customer_quality_downgraded: 'CUSTOMER_QUALITY_DOWNGRADED',
  birthday_wish: 'BIRTHDAY_WISH',
  back_in_stock: 'BACK_IN_STOCK',
  new_product: 'NEW_PRODUCT',
  price_drop: 'PRICE_DROP',
  promotional: 'PROMOTIONAL',
  customer_occasion_promo: 'CUSTOMER_OCCASION_PROMO',
};

function eventFromMetaName(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const [key, evt] of Object.entries(META_NAME_TO_EVENT)) {
    if (lower.includes(key)) return evt;
  }
  return null;
}

async function getSession() {
  return await prisma.whatsAppSession.findFirst({
    where: { companyId: COMPANY_ID, provider: 'META_CLOUD', status: 'CONNECTED' },
  });
}

async function fetchMetaTemplates(wabaId, accessToken) {
  let all = [];
  let url = `https://graph.facebook.com/${API_VER}/${wabaId}/message_templates?fields=name,status,category,language&limit=200`;
  while (url) {
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = res.data;
    if (data.data) all = all.concat(data.data);
    url = data.paging && data.paging.next ? data.paging.next : null;
  }
  return all;
}

async function main() {
  const log = [];
  const session = await getSession();
  if (!session) { console.log('SYNC_SKIP no META_CLOUD session'); return; }
  const accessToken = decryptField(session.metaAccessToken);
  const wabaId = session.metaWabaId || session.wabaId;
  const metaTpls = await fetchMetaTemplates(wabaId, accessToken);
  log.push(`META_FOUND ${metaTpls.length}`);

  const approved = metaTpls.filter(t => String(t.status).toUpperCase() === 'APPROVED');
  log.push(`META_APPROVED ${approved.length}`);

  let linked = 0, created = 0, skipped = 0;
  for (const t of approved) {
    const eventType = eventFromMetaName(t.name);
    if (!eventType) { skipped++; continue; }
    const existing = await prisma.whatsAppNotificationTemplate.findFirst({
      where: { companyId: COMPANY_ID, eventType, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) {
      if (!existing.metaTemplateName || existing.metaTemplateStatus !== 'APPROVED') {
        await prisma.whatsAppNotificationTemplate.update({
          where: { id: existing.id },
          data: { metaTemplateName: t.name, metaTemplateStatus: 'APPROVED', channel: existing.channel || 'AUTO' },
        });
        linked++;
        log.push(`LINKED ${eventType} -> ${t.name}`);
      } else { skipped++; }
    } else {
      await prisma.whatsAppNotificationTemplate.create({
        data: {
          companyId: COMPANY_ID, eventType, channel: 'AUTO',
          metaTemplateName: t.name, metaTemplateStatus: 'APPROVED',
          language: t.language || 'ar', content: '', isActive: true,
          variables: JSON.stringify([]),
        },
      });
      created++;
      log.push(`CREATED ${eventType} -> ${t.name}`);
    }
  }
  log.push(`DONE linked=${linked} created=${created} skipped=${skipped}`);
  console.log(log.join('\n'));
}

main().then(() => process.exit(0)).catch(e => { console.error('SYNC_ERROR', e.message); process.exit(1); });
