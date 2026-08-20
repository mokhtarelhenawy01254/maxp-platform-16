/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §5.1):
 * موازنة الجلسات + حل الجلسة عند الإرسال (Sticky / Round-Robin / JIT init).
 * مستخرجة من WhatsAppNotificationService.js لتقليل حجم الملف.
 */

const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const WhatsAppManager = require('./WhatsAppManager');
const { formatPhoneNumber } = require('../../utils/phoneFormat');

const sessionRotation = new Map();
const SESSION_ROTATION_MAX_SIZE = 5000;
function setSessionRotation(companyId, index) {
  if (sessionRotation.size >= SESSION_ROTATION_MAX_SIZE && !sessionRotation.has(companyId)) {
    const oldestKey = sessionRotation.keys().next().value;
    sessionRotation.delete(oldestKey);
  }
  sessionRotation.set(companyId, index);
}

const sessionInitializationInFlight = new Map();

async function getOrAssignSession({ companyId, customerId, recipientPhone, connectedSessions, settings }) {
  const prisma = getSharedPrismaClient();

  if (!connectedSessions || connectedSessions.length === 0) {
    return settings?.defaultSessionId || null;
  }

  // 1. البحث عن جلسة مثبتة (Sticky Session Affinity)
  // نطبق هذا المنطق فقط إذا كان الخيار مفعلاً في الإعدادات
  if (settings?.stickySessionEnabled !== false) {
    const connectedSessionIds = connectedSessions.map(s => s.sessionId);

    try {
      let existingSessionId = null;

      if (customerId) {
        const contact = await safeQuery(() => prisma.whatsAppContact.findFirst({
          where: {
            customerId,
            sessionId: { in: connectedSessionIds }
          },
          orderBy: { lastMessageAt: 'desc' },
          select: { sessionId: true }
        }));
        if (contact) existingSessionId = contact.sessionId;
      }

      if (!existingSessionId && recipientPhone) {
        const formattedPhone = formatPhoneNumber(recipientPhone);
        const contact = await safeQuery(() => prisma.whatsAppContact.findFirst({
          where: {
            phoneNumber: formattedPhone,
            sessionId: { in: connectedSessionIds }
          },
          orderBy: { lastMessageAt: 'desc' },
          select: { sessionId: true }
        }));
        if (contact) existingSessionId = contact.sessionId;
      }

      if (existingSessionId) {
        console.log(`🔗 [WHATSAPP-AFFINITY] Sticky session matched: ${existingSessionId}`);
        return existingSessionId;
      }
    } catch (err) {
      console.error('❌ [WHATSAPP-AFFINITY] Error checking affinity:', err);
    }
  } else {
    console.log(`⚖️ [WHATSAPP-LB] Sticky sessions disabled, forcing load balancing for every message.`);
  }

  // 2. إذا لم توجد جلسة مثبتة أو الخيار معطل، نستخدم التوزيع الموزون (Weighted Round Robin)
  if (connectedSessions.length > 1) {
    let weightedPool = [];
    connectedSessions.forEach(s => {
      // الأولوية لـ loadBalanceWeight ثم لـ isDefault
      const weight = s.loadBalanceWeight || (s.isDefault ? 3 : 1);
      for (let i = 0; i < weight; i++) {
        weightedPool.push(s.sessionId);
      }
    });

    let lastIndex = sessionRotation.get(companyId) || 0;
    let nextIndex = (lastIndex + 1) % weightedPool.length;
    setSessionRotation(companyId, nextIndex);

    const pickedId = weightedPool[nextIndex];
    console.log(`⚖️ [LOAD-BALANCER] New assignment via Weighted Round-Robin (Weight Strategy): ${pickedId} (Step ${nextIndex + 1}/${weightedPool.length})`);
    return pickedId;
  }

  // إذا كان هناك رقم واحد فقط متصل
  return connectedSessions[0].sessionId;
}

/**
 * يميّز أخطاء ميتا المتعلقة بنافذة 24 ساعة / القالب عن الأخطاء التانية
 * (فقط هذه الأخطاء تستحق fallback لـ Baileys).
 *
 * @param {{code?: string, message?: string}} metaError
 * @returns {boolean}
 */
function isMetaWindowError(metaError) {
  if (!metaError) return false;
  const code = metaError.code;
  const message = metaError.message || '';
  return (
    code === 'RECIPIENT_CANNOT_SEND' ||
    code === 'TEMPLATE_NOT_APPROVED' ||
    code === 131047 ||
    code === '131047' ||
    code === 131026 ||
    code === '131026' ||
    /24\s*hour|outside.*window|template.*window/i.test(message)
  );
}

/**
 * يبحث عن Baileys session متصلة في الشركة (مستثنية session الميتا الفاشلة)
 * — يستخدمها sendNotification كـ fallback لما ميتا ترفض الإرسال خارج نافذة 24 ساعة.
 *
 * @param {string} companyId - الشركة
 * @param {string} excludeSessionId - الجلسة المستثناة (الميتا الفاشلة)
 * @returns {Promise<{sessionId: string, name: string, phoneNumber: string}|null>}
 */
async function findAlternativeBaileysSession(companyId, excludeSessionId) {
  const prisma = getSharedPrismaClient();
  const candidates = await safeQuery(() => prisma.whatsAppSession.findMany({
    where: {
      companyId,
      provider: 'BAILEYS',
      status: 'CONNECTED',
      id: { not: excludeSessionId },
    },
    select: { id: true, name: true, phoneNumber: true },
  }));

  if (!candidates || candidates.length === 0) return null;

  // فلتر على الـ in-memory connectivity (مثل getOrAssignSession) —
  // الجلسة لازم تكون فعلاً socket متصلة في الذاكرة، مش بس CONNECTED في DB.
  for (const c of candidates) {
    const live = WhatsAppManager.getSession(c.id);
    if (live && live.status === 'connected') {
      return { sessionId: c.id, name: c.name, phoneNumber: c.phoneNumber };
    }
  }
  return null;
}

async function ensureRuntimeSessionConnected(sessionId, companyId) {
  let pendingInitialization = sessionInitializationInFlight.get(sessionId);

  if (!pendingInitialization) {
    pendingInitialization = (async () => {
      let session = WhatsAppManager.getSession(sessionId);
      if (session && session.status === 'connected') {
        return session;
      }

      const dbSession = await safeQuery(() => getSharedPrismaClient().whatsAppSession.findUnique({
        where: { id: sessionId },
        select: { status: true, authState: true }
      }));

      if (!dbSession || dbSession.status !== 'CONNECTED' || !dbSession.authState) {
        return session;
      }

      console.log(`🔄 [WHATSAPP-JIT] Session ${sessionId} is CONNECTED in DB but null in memory. Initializing...`);

      try {
        await WhatsAppManager.createSession(sessionId, companyId);

        let waitTime = 0;
        while (waitTime < 5000) {
          session = WhatsAppManager.getSession(sessionId);
          if (session && session.status === 'connected') {
            console.log(`✅ [WHATSAPP-JIT] Session ${sessionId} initialized and connected successfully via JIT`);
            return session;
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
          waitTime += 1000;
        }
      } catch (err) {
        console.error(`❌ [WHATSAPP-JIT] Failed to initialize session ${sessionId}:`, err.message);
      }

      return WhatsAppManager.getSession(sessionId);
    })().finally(() => {
      sessionInitializationInFlight.delete(sessionId);
    });

    sessionInitializationInFlight.set(sessionId, pendingInitialization);
  } else {
    console.log(`⏳ [WHATSAPP-JIT] Awaiting in-flight initialization for session ${sessionId}`);
  }

  return pendingInitialization;
}

module.exports = { getOrAssignSession, ensureRuntimeSessionConnected, findAlternativeBaileysSession, isMetaWindowError };
