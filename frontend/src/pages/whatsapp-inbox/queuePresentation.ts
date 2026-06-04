type SupportedLanguage = 'ar' | 'en';

const QUEUE_LABELS: Record<SupportedLanguage, Record<string, string>> = {
  ar: {
    WAITING_QUEUE: 'قيد الانتظار',
    ASSIGNED_QUEUE: 'مسندة',
    PENDING_QUEUE: 'معلقة',
    CLOSED_QUEUE: 'مغلقة',
    NEW: 'جديدة',
    QUEUED: 'في الطابور',
    ASSIGNED: 'مسندة',
    ACTIVE: 'نشطة',
    PENDING: 'معلقة',
    WAITING_CUSTOMER: 'بانتظار العميل',
    ESCALATED: 'مصعدة',
    CLOSED: 'مغلقة',
    ARCHIVED: 'مؤرشفة',
    UNASSIGNED: 'بدون مسار',
  },
  en: {
    WAITING_QUEUE: 'Waiting',
    ASSIGNED_QUEUE: 'Assigned',
    PENDING_QUEUE: 'Pending',
    CLOSED_QUEUE: 'Closed',
    NEW: 'New',
    QUEUED: 'Queued',
    ASSIGNED: 'Assigned',
    ACTIVE: 'Active',
    PENDING: 'Pending',
    WAITING_CUSTOMER: 'Waiting for customer',
    ESCALATED: 'Escalated',
    CLOSED: 'Closed',
    ARCHIVED: 'Archived',
    UNASSIGNED: 'Unassigned',
  },
};

const STATUS_TO_QUEUE_KEY: Record<string, string> = {
  NEW: 'WAITING_QUEUE',
  QUEUED: 'WAITING_QUEUE',
  ASSIGNED: 'ASSIGNED_QUEUE',
  ACTIVE: 'ASSIGNED_QUEUE',
  PENDING: 'PENDING_QUEUE',
  WAITING_CUSTOMER: 'PENDING_QUEUE',
  ESCALATED: 'PENDING_QUEUE',
  CLOSED: 'CLOSED_QUEUE',
  ARCHIVED: 'CLOSED_QUEUE',
};

const normalizeToken = (value?: string | null) => String(value || '').trim().toUpperCase();
const resolveLanguage = (language?: string | null): SupportedLanguage =>
  String(language || '').toLowerCase().startsWith('en') ? 'en' : 'ar';

export const resolveQueueToken = (queueKey?: string | null, fallbackStatus?: string | null) => {
  const normalizedKey = normalizeToken(queueKey);
  if (normalizedKey) {
    return normalizedKey;
  }

  const normalizedStatus = normalizeToken(fallbackStatus);
  return STATUS_TO_QUEUE_KEY[normalizedStatus] || normalizedStatus || 'UNASSIGNED';
};

export const formatQueueLabel = (
  queueKey?: string | null,
  fallbackStatus?: string | null,
  language?: string | null,
) => {
  const token = resolveQueueToken(queueKey, fallbackStatus);
  const locale = resolveLanguage(language);
  return QUEUE_LABELS[locale][token] || token.replace(/_/g, ' ');
};

export const formatWorkflowStatus = (status?: string | null, language?: string | null) => {
  const token = normalizeToken(status) || 'UNASSIGNED';
  const locale = resolveLanguage(language);
  return QUEUE_LABELS[locale][token] || token.replace(/_/g, ' ');
};
