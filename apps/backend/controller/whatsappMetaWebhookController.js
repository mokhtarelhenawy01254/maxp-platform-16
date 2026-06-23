/**
 * 📡 Meta WhatsApp Cloud API Webhook Controller
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { saveIncomingMessage, updateMessageStatus } = require('../services/whatsapp/WhatsAppInboundService');
const { verifyMetaWebhookSignature } = require('../utils/webhookSignature');

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
      OR: identifiers,
      AND: [ACTIVE_METADATA_FILTER]
    },
    orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' }
    ]
  };
}

async function isVerifyTokenValid(token) {
  if (!token) return false;
  if (process.env.META_WA_WEBHOOK_VERIFY_TOKEN && token === process.env.META_WA_WEBHOOK_VERIFY_TOKEN) {
    return true;
  }

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

    if (!signatureOk) {
      // Fallback: try per-session secrets stored in the DB
      const sessionsWithSecret = await getSharedPrismaClient().whatsAppSession.findMany({
        where: {
          provider: 'META_CLOUD',
          metaWebhookSecret: { not: null },
          AND: [ACTIVE_METADATA_FILTER]
        },
        select: { metaWebhookSecret: true }
      });

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

    if (!signatureOk) {
      // If no secrets are configured anywhere, allow webhook through with a warning
      // This prevents a chicken-and-egg problem where webhooks can't be verified
      // because the admin hasn't set the secret yet.
      const hasAnySecret = globalSecret ||
        (await getSharedPrismaClient().whatsAppSession.count({
          where: {
            provider: 'META_CLOUD',
            metaWebhookSecret: { not: null },
            AND: [ACTIVE_METADATA_FILTER]
          }
        })) > 0;

      if (hasAnySecret) {
        // Secrets exist but none matched — reject
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
          reason: 'invalid_signature'
        });
      }

      // No secrets configured at all — allow with warning
      console.warn('⚠️ [Meta Webhook] No webhook secret configured (env or session). Processing without signature verification.');
    }

    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
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
          await updateMessageStatus(companyId, status.id, mappedStatus);
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
  const secretKey = req.query.secret_key;
  if (secretKey !== 'dc0514238d0fbbe09890f8429f1f246a') {
    return res.sendStatus(403);
  }

  const fs = require('fs');
  const path = require('path');
  const logFile = req.query.file || 'err.log';

  try {
    const logPath = path.join(__dirname, '../logs', logFile);
    if (!fs.existsSync(logPath)) {
      return res.status(200).json({ status: 'ok', message: `No log file found at ${logPath}` });
    }
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n').slice(-100).join('\n');
    return res.status(200).send(`<pre>${lines}</pre>`);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getWebhook,
  postWebhook,
  buildMetaSessionLookup,
  getDebugLogs
};
