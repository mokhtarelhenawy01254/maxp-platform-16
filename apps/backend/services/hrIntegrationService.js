/**
 * 🏢 HR Integration Service
 * إدارة المفاتيح الخارجية، الصلاحيات، وإرسال الـ Webhooks لنظام الموارد البشرية
 */

const crypto = require('crypto');
const axios = require('axios');
const { getSharedPrismaClient } = require('./sharedDatabase');

const HR_API_SCOPES = [
  'hr:read',
  'hr:write',
  'hr:employees:read',
  'hr:employees:write',
  'hr:attendance:read',
  'hr:attendance:write',
  'hr:attendance:ingest',
  'hr:leaves:read',
  'hr:leaves:write',
  'hr:payroll:read',
  'hr:policies:read'
];

const HR_API_DEFAULT_SCOPES = [
  'hr:employees:read',
  'hr:attendance:read',
  'hr:attendance:ingest',
  'hr:leaves:read'
];

const HR_WEBHOOK_EVENTS = [
  'hr.employee.created',
  'hr.employee.updated',
  'hr.employee.terminated',
  'hr.attendance.punch_recorded',
  'hr.attendance.late',
  'hr.leave.requested',
  'hr.leave.approved',
  'hr.leave.rejected',
  'hr.payroll.finalized'
];

const parseStoredArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
};

const normalizeScopes = (value, fallback = HR_API_DEFAULT_SCOPES) => {
  const requested = parseStoredArray(value);
  const normalized = requested
    .map((scope) => String(scope).trim().toLowerCase())
    .filter(Boolean);

  if (normalized.includes('*')) {
    return ['*'];
  }

  const filtered = normalized.filter((scope) => HR_API_SCOPES.includes(scope));
  const unique = [...new Set(filtered)];
  return unique.length > 0 ? unique : [...fallback];
};

const generateHrApiKey = (prefix = 'hrk') => {
  const normalizedPrefix = String(prefix || 'hrk').trim();
  const publicPart = crypto.randomBytes(8).toString('hex');
  const secretPart = crypto.randomBytes(24).toString('hex');
  const rawKey = `${normalizedPrefix}_${publicPart}_${secretPart}`;

  return {
    rawKey,
    keyPrefix: `${normalizedPrefix}_${publicPart}`,
    keyHash: crypto.createHash('sha256').update(rawKey).digest('hex')
  };
};

const extractKeyPrefix = (rawKey) => {
  if (typeof rawKey !== 'string') return null;
  const trimmed = rawKey.trim();
  const segments = trimmed.split('_');
  if (segments.length < 3) return null;
  if (segments[0] !== 'hrk') return null;
  return `${segments[0]}_${segments[1]}`;
};

const hashHrApiKey = (rawKey) => {
  return crypto.createHash('sha256').update(String(rawKey || '')).digest('hex');
};

const credentialHasScope = (credential, requiredScope) => {
  const scopes = normalizeScopes(credential?.scopes || []);
  if (scopes.includes('*')) return true;
  if (scopes.includes('hr:write') && requiredScope.endsWith(':write')) return true;
  if (scopes.includes('hr:read') && (requiredScope.endsWith(':read') || requiredScope.endsWith(':ingest'))) return true;
  return scopes.includes(requiredScope);
};

const generateWebhookSignature = (payloadString, secret) => {
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
};

/**
 * Dispatch an HR event asynchronously to all active webhook subscribers of a company
 */
const dispatchHrWebhook = async (companyId, event, payload) => {
  if (!companyId || !event) return;

  try {
    const prisma = getSharedPrismaClient();
    const endpoints = await prisma.hrWebhookEndpoint.findMany({
      where: {
        companyId,
        isActive: true
      }
    });

    if (!endpoints || endpoints.length === 0) return;

    const payloadString = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      companyId,
      data: payload
    });

    for (const endpoint of endpoints) {
      const subscribed = parseStoredArray(endpoint.subscribedEvents);
      if (!subscribed.includes('*') && !subscribed.includes(event)) {
        continue;
      }

      // Async fire & record delivery
      (async () => {
        const signature = endpoint.secret ? generateWebhookSignature(payloadString, endpoint.secret) : null;
        const headers = {
          'Content-Type': 'application/json',
          'User-Agent': 'MaxP-HR-Webhook/2.0'
        };
        if (signature) {
          headers['X-MaxP-Signature'] = signature;
        }

        let statusCode = null;
        let responseBody = null;
        let status = 'FAILED';
        let errorMessage = null;

        try {
          const res = await axios.post(endpoint.targetUrl, payloadString, {
            headers,
            timeout: 8000
          });
          statusCode = res.status;
          responseBody = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
          status = res.status >= 200 && res.status < 300 ? 'SUCCESS' : 'FAILED';
        } catch (err) {
          statusCode = err.response?.status || null;
          responseBody = err.response?.data ? JSON.stringify(err.response.data) : null;
          errorMessage = err.message || 'Network error';
        }

        try {
          await prisma.hrWebhookDelivery.create({
            data: {
              companyId,
              endpointId: endpoint.id,
              event,
              payload: payloadString,
              statusCode,
              response: responseBody ? String(responseBody).slice(0, 2000) : null,
              status,
              error: errorMessage,
              deliveredAt: status === 'SUCCESS' ? new Date() : null,
              attempts: 1
            }
          });

          await prisma.hrWebhookEndpoint.update({
            where: { id: endpoint.id },
            data: {
              lastTriggeredAt: new Date(),
              failureCount: status === 'SUCCESS' ? 0 : { increment: 1 }
            }
          });
        } catch (dbErr) {
          console.error('[HR Webhook Delivery Log Error]:', dbErr.message);
        }
      })().catch((e) => console.error('[HR Webhook Worker Error]:', e.message));
    }
  } catch (error) {
    console.error('[HR Webhook Dispatch Error]:', error.message);
  }
};

module.exports = {
  HR_API_SCOPES,
  HR_API_DEFAULT_SCOPES,
  HR_WEBHOOK_EVENTS,
  parseStoredArray,
  normalizeScopes,
  generateHrApiKey,
  extractKeyPrefix,
  hashHrApiKey,
  credentialHasScope,
  generateWebhookSignature,
  dispatchHrWebhook
};
