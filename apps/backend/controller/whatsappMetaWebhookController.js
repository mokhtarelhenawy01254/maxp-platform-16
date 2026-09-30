/**
 * 📡 Meta WhatsApp Cloud API Webhook Controller
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { saveIncomingMessage, updateMessageStatus } = require('../services/whatsapp/WhatsAppInboundService');
const { verifyMetaWebhookSignature, shouldStrictlyEnforceMetaWebhookSignature } = require('../utils/webhookSignature');
const facebookAppConfig = require('../config/facebookAppConfig');

const DELETED_METADATA_FILTERS = [
  { metadata: { contains: '"isDeleted":true' } },
  { metadata: { contains: '"isDeleted": true' } }
];

const ACTIVE_METADATA_FILTER = {
  OR: [
    { metadata: null },
    { NOT: DELETED_METADATA_FILTERS }
  ]
};

function buildMetaSessionLookup({ phoneNumberId, displayPhoneNumber }) {
  const identifiers = [
    phoneNumberId ? { metaPhoneNumberId: phoneNumberId } : undefined,
    displayPhoneNumber ? { metaDisplayPhoneNumber: displayPhoneNumber } : undefined
  ].filter(Boolean);

  if (identifiers.length === 0) {
    return null;
  }

  return {
    where: {
      provider: 'META_CLOUD',
      status: 'CONNECTED',
      OR: identifiers,
      AND: [ACTIVE_METADATA_FILTER]
    },
    orderBy: [
      { updatedAt: 'desc' }
    ]
  };
}

async function isVerifyTokenValid(token) {
  if (!token) return false;
  
  // 1. Check global process environment variable
  if (process.env.META_WA_WEBHOOK_VERIFY_TOKEN && token === process.env.META_WA_WEBHOOK_VERIFY_TOKEN) {
    return true;
  }

  // 2. Check token configured in super admin facebook config
  const superAdminConfig = facebookAppConfig.getFacebookOAuthConfig();
  if (superAdminConfig.whatsappWebhookVerifyToken && token === superAdminConfig.whatsappWebhookVerifyToken) {
    return true;
  }

  // 3. Check session level token stored in DB
  const match = await getSharedPrismaClient().whatsAppSession.findFirst({
    where: {
      provider: 'META_CLOUD',
      metaWebhookVerifyToken: token,
      AND: [ACTIVE_METADATA_FILTER]
    }
  });
  return !!match;
}
function normalizeMetaMessage(msg) {
  const type = msg.type || 'text';
  const messageType = type.toUpperCase();
  let content = null;
  let mediaUrl = null;
  let mediaType = null;
  let mediaMimeType = null;
  let mediaFileName = null;
  let quotedMessageId = null;
  let interactiveData = null;

  if (type === 'text') {
    content = msg.text?.body || null;
  } else if (type === 'image') {
    content = msg.image?.caption || null;
    mediaType = 'image';
    mediaMimeType = msg.image?.mime_type || null;
    mediaUrl = msg.image?.id ? `meta-media:${msg.image.id}` : msg.image?.link;
  } else if (type === 'video') {
    content = msg.video?.caption || null;
    mediaType = 'video';
    mediaMimeType = msg.video?.mime_type || null;
    mediaUrl = msg.video?.id ? `meta-media:${msg.video.id}` : msg.video?.link;
  } else if (type === 'audio') {
    mediaType = 'audio';
    mediaMimeType = msg.audio?.mime_type || null;
    mediaUrl = msg.audio?.id ? `meta-media:${msg.audio.id}` : msg.audio?.link;
  } else if (type === 'document') {
    content = msg.document?.caption || null;
    mediaType = 'document';
    mediaMimeType = msg.document?.mime_type || null;
    mediaFileName = msg.document?.filename || null;
    mediaUrl = msg.document?.id ? `meta-media:${msg.document.id}` : msg.document?.link;
  } else if (type === 'sticker') {
    mediaType = 'sticker';
    mediaMimeType = msg.sticker?.mime_type || null;
    mediaUrl = msg.sticker?.id ? `meta-media:${msg.sticker.id}` : msg.sticker?.link;
  } else if (type === 'location') {
    content = JSON.stringify({
      latitude: msg.location?.latitude,
      longitude: msg.location?.longitude,
      name: msg.location?.name,
      address: msg.location?.address
    });
  } else if (type === 'contacts') {
    content = JSON.stringify(msg.contacts || []);
  } else if (type === 'interactive') {
    const interactive = msg.interactive || {};
    interactiveData = interactive;
    if (interactive.type === 'button_reply') {
      content = interactive.button_reply?.title || null;
    } else if (interactive.type === 'list_reply') {
      content = interactive.list_reply?.title || null;
    } else {
      content = JSON.stringify(interactive);
    }
  } else if (type === 'button') {
    // 🚨 PRODUCTION-FIX: أزرار QUICK_REPLY من قوالب الميتا تأتي بـ type="button".
    // سابقاً كان الـ else يلتقطها ويحفظ JSON خام — وبالتالي لا تصل لمعالج التفاعلات.
    // الآن نستخرج الـ payload/text + الـ context.id (wamid الرسالة الأصلية) لمعالجة الزر.
    const btn = msg.button || {};
    interactiveData = {
      type: 'button',
      payload: btn.payload || btn.text || null,
      text: btn.text || btn.payload || null,
      contextMessageId: msg.context?.id || null,
      contextFrom: msg.context?.from || null
    };
    content = btn.payload || btn.text || null;
  } else if (type === 'reaction') {
    content = msg.reaction?.emoji || null;
    quotedMessageId = msg.reaction?.message_id || null;
  } else {
    content = JSON.stringify(msg);
  }

  return {
    messageType,
    content,
    mediaUrl,
    mediaType,
    mediaMimeType,
    mediaFileName,
    quotedMessageId,
    interactiveData
  };
}

async function getWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && await isVerifyTokenValid(token)) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

async function postWebhook(req, res) {
  try {
    // ── Signature verification with per-session fallback ──────────────
    const globalSecret = String(
      process.env.META_WA_APP_SECRET || process.env.META_WA_WEBHOOK_SECRET || ''
    ).trim();

    let signatureOk = false;
    let hasSessionSecrets = false;

    if (globalSecret) {
      // Try global secret first
      const check = verifyMetaWebhookSignature(req, globalSecret);
      signatureOk = check.ok;
      if (!check.ok && check.reason !== 'missing_raw_body') {
        console.warn('⚠️ [Meta Webhook] Global secret signature mismatch, trying per-session secrets...');
      }
      if (check.reason === 'missing_raw_body') {
        return res.status(500).json({ success: false, error: 'Invalid signature', reason: 'missing_raw_body' });
      }
    }

    if (!signatureOk && globalSecret) {
      // Fallback: try per-session secrets stored in the DB
      const sessionsWithSecret = await getSharedPrismaClient().whatsAppSession.findMany({
        where: {
          provider: 'META_CLOUD',
          metaWebhookSecret: { not: null },
          AND: [ACTIVE_METADATA_FILTER]
        },
        select: { metaWebhookSecret: true }
      });
      hasSessionSecrets = sessionsWithSecret.length > 0;

      for (const s of sessionsWithSecret) {
        const secret = String(s.metaWebhookSecret || '').trim();
        if (!secret) continue;
        const check = verifyMetaWebhookSignature(req, secret);
        if (check.ok) {
          signatureOk = true;
          break;
        }
      }
    }

    if (!signatureOk && !globalSecret) {
      // مفيش سر عام متظبط — بنجرب أسرار الجلسات (بيتخلق معرفتهم يأثر على قرار الفرض الصارم تحت)
      try {
        const sessionsWithSecret = await getSharedPrismaClient().whatsAppSession.findMany({
          where: {
            provider: 'META_CLOUD',
            metaWebhookSecret: { not: null },
            AND: [ACTIVE_METADATA_FILTER]
          },
          select: { metaWebhookSecret: true }
        });
        hasSessionSecrets = sessionsWithSecret.length > 0;

        for (const s of sessionsWithSecret) {
          const secret = String(s.metaWebhookSecret || '').trim();
          if (!secret) continue;
          const check = verifyMetaWebhookSignature(req, secret);
          if (check.ok) {
            signatureOk = true;
            break;
          }
        }
      } catch (sessionLookupError) {
        console.error('⚠️ [Meta Webhook] Per-session secret lookup failed:', sessionLookupError.message);
      }
    }

    if (!signatureOk) {
      const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
      // في الإنتاج: الفرض صارم بمجرد إن فيه سر متاح (عام أو جلسة) — نفس معيار Facebook webhook.
      // لسه مفيش سر متظبط خالص؟ بنكمل بمعالجة بدون تحقق (تحذير صاخب) عشان الواتساب مايوقفش.
      const strictEnforced =
        shouldStrictlyEnforceMetaWebhookSignature() ||
        (isProduction && (Boolean(globalSecret) || hasSessionSecrets));

      if (globalSecret) {
        console.warn('⚠️ [Meta Webhook] Signature verification failed with all available secrets.');
      } else if (hasSessionSecrets) {
        console.warn('⚠️ [Meta Webhook] Signature verification failed with per-session secrets.');
      } else {
        console.warn('⚠️ [Meta Webhook] No webhook secret configured (env or session).');
      }

      if (strictEnforced) {
        console.warn('🚫 [Meta Webhook] Strict signature enforcement — rejecting unverified webhook.');
        return res.status(403).json({ success: false, error: 'Invalid signature' });
      }

      console.warn('⚠️ [Meta Webhook] Processing without verification — ظبط META_WA_APP_SECRET (أو metaWebhookSecret للجلسة) في الإنتاج لتفعيل الرفض التلقائي.');
    }

    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        // ── Handle template status updates from Meta ────────────────
        if (change.field === 'message_template_status_update') {
          const value = change.value || {};
          const templateName = value.message_template_name;
          const event = value.event; // APPROVED, PENDING, REJECTED, FLAGGED
          const reason = value.reason || '';

          if (templateName && event) {
            const statusMap = {
              APPROVED: 'APPROVED',
              PENDING: 'PENDING',
              REJECTED: 'REJECTED',
              FLAGGED: 'FLAGGED'
            };
            const mappedStatus = statusMap[event] || event;

            try {
              const updated = await getSharedPrismaClient().whatsAppNotificationTemplate.updateMany({
                where: { metaTemplateName: templateName },
                data: { metaTemplateStatus: mappedStatus, updatedAt: new Date() }
              });
              if (updated.count > 0) {
                console.log(`☁️ [TEMPLATE-STATUS] "${templateName}" → ${mappedStatus}${reason ? ': ' + reason : ''}`);
              }
            } catch (statusErr) {
              console.warn(`⚠️ [TEMPLATE-STATUS] Failed to update "${templateName}": ${statusErr.message}`);
            }
          }
          continue;
        }

        if (change.field !== 'messages') continue;

        const value = change.value || {};
        const metadata = value.metadata || {};
        const phoneNumberId = metadata.phone_number_id;
        const displayPhoneNumber = metadata.display_phone_number;

        const lookup = buildMetaSessionLookup({ phoneNumberId, displayPhoneNumber });
        const session = lookup
          ? await getSharedPrismaClient().whatsAppSession.findFirst(lookup)
          : null;

        if (!session) {
          continue;
        }

        const companyId = session.companyId;
        const messages = value.messages || [];
        const statuses = value.statuses || [];

        for (const msg of messages) {
          const remoteJid = `${msg.from}@s.whatsapp.net`;
          const normalized = normalizeMetaMessage(msg);

          const savedMessage = await saveIncomingMessage({
            sessionId: session.id,
            companyId,
            remoteJid,
            messageId: msg.id,
            messageType: normalized.messageType,
            content: normalized.content,
            mediaUrl: normalized.mediaUrl,
            mediaType: normalized.mediaType,
            mediaMimeType: normalized.mediaMimeType,
            mediaFileName: normalized.mediaFileName,
            quotedMessageId: normalized.quotedMessageId,
            interactiveData: normalized.interactiveData,
            timestamp: msg.timestamp ? Number(msg.timestamp) * 1000 : Date.now(),
            metadata: msg,
            pushName: value.contacts?.[0]?.profile?.name || null
          });

          // 🚨 PRODUCTION-FIX: معالجة أزرار القوالب (QUICK_REPLY) من Meta webhook.
          // سابقاً كانت الرسالة تُحفظ فقط (BUTTON) بدون أي معالجة للزر —
          // لذا ضغط "تأكيد الأوردر" لم يكن يحوّل الطلب ولا يبعت تأكيداً.
          // الآن نوجّهها لـ WhatsAppInteractionService (نفس مسار Baileys).
          if (normalized.messageType === 'BUTTON' || normalized.messageType === 'INTERACTIVE') {
            try {
              const WhatsAppInteractionService = require('../services/whatsapp/WhatsAppInteractionService');
              const handled = await WhatsAppInteractionService.handleButtonResponse(
                session.id,
                companyId,
                remoteJid,
                normalized.interactiveData
              );
              if (handled) {
                console.log(`⚡ [META-WEBHOOK] Button interaction handled: ${normalized.content}`);
              } else {
                console.log(`ℹ️ [META-WEBHOOK] Button not handled (no matching order): ${normalized.content}`);
              }
            } catch (interactionErr) {
              console.error(`❌ [META-WEBHOOK] Failed to process button interaction: ${interactionErr.message}`);
            }
          }

          void savedMessage;
        }

        for (const status of statuses) {
          const statusMap = {
            sent: 'SENT',
            delivered: 'DELIVERED',
            read: 'READ',
            failed: 'FAILED'
          };
          const mappedStatus = statusMap[status.status] || 'SENT';
          const errors = Array.isArray(status.errors) ? status.errors : [];
          const recipientId = status.recipient_id || null;
          const timestamp = status.timestamp ? Number(status.timestamp) * 1000 : Date.now();
          await updateMessageStatus(companyId, status.id, mappedStatus, {
            errors,
            recipientId,
            timestamp
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Meta webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
}

async function getDebugLogs(req, res) {
  // 🔐 الحارس: مفتاح من البيئة فقط (مفيش قيمة افتراضية في الكود) + مقارنة timing-safe.
  // لو META_WA_DEBUG_KEY مش متظبط (أو أقصر من 32 حرف) الإندبوينت مقفول تمامًا.
  const expectedKey = String(process.env.META_WA_DEBUG_KEY || '').trim();
  const providedKey = String(req.query.secret_key || '');
  const crypto = require('crypto');
  let keyOk = false;
  if (expectedKey.length >= 32 && providedKey.length === expectedKey.length) {
    try {
      keyOk = crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(expectedKey));
    } catch (_) {
      keyOk = false;
    }
  }
  if (!keyOk) {
    return res.sendStatus(403);
  }

  const fs = require('fs');
  const path = require('path');
  // اسم الملف فقط — بيمنع أي path traversal (../) خارج فولدر اللوجز
  const logFile = path.basename(String(req.query.file || 'err.log'));
  const logsDir = path.resolve(__dirname, '../logs');
  const logPath = path.resolve(logsDir, logFile);
  if (!logPath.startsWith(`${logsDir}${path.sep}`)) {
    return res.sendStatus(403);
  }

  try {
    if (!fs.existsSync(logPath)) {
      return res.status(200).json({ status: 'ok', message: 'No log file found' });
    }
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').slice(-100).join('\n');
    return res.status(200).send(`<pre>${lines}</pre>`);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read log file' });
  }
}

module.exports = {
  getWebhook,
  postWebhook,
  buildMetaSessionLookup,
  getDebugLogs
};
