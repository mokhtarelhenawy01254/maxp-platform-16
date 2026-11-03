export interface MetaErrorInfo {
  code: string;
  title: string;
  description: string;
  actionText?: string;
  actionUrl?: string;
}

export const META_ERROR_CODES: Record<string, MetaErrorInfo> = {
  '131042': {
    code: '131042',
    title: 'حساب واتساب عليه مدفوعات معلّقة — لازم تسوية الدفع في Meta',
    description:
      'حساب الدفع في Meta Business بحاجة إلى تسوية الفواتير المعلقة أو تحديث وسيلة الدفع لتتمكن من استئناف إرسال الرسائل.',
    actionText: 'فتح في Meta',
    actionUrl: 'https://business.facebook.com/billing_hub/',
  },
  '131047': {
    code: '131047',
    title: 'خارج نافذة الـ 24 ساعة للرد',
    description:
      'انتهت نافذة الـ 24 ساعة المسموحة للمحادثة المجانية مع العميل. لإرسال رسالة الآن يجب استخدام قالب معتمد من Meta (Template).',
    actionText: 'فتح في Meta',
    actionUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#customer-service-window',
  },
  '132000': {
    code: '132000',
    title: 'قالب غير معتمد أو غير موجود في Meta',
    description:
      'القالب المحدد غير موجود على حساب Meta أو لم تتم الموافقة عليه بعد، أو لا يتطابق كود اللغة المحدد مع القالب المعتمد.',
    actionText: 'فتح في Meta',
    actionUrl: 'https://business.facebook.com/wa/manage/message-templates/',
  },
  '132018': {
    code: '132018',
    title: 'خطأ في متغيرات القالب (عدد المتغيرات غير مطابق)',
    description:
      'عدد المتغيرات أو المعاملات المرسلة لا يطابق البنية المعتمدة للقالب في Meta (معاملات زائدة أو ناقصة).',
    actionText: 'فتح في Meta',
    actionUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates',
  },
  '131026': {
    code: '131026',
    title: 'رقم الهاتف غير مسجل في واتساب',
    description:
      'رقم هاتف المستلم غير مسجل في تطبيق واتساب أو غير متاح لاستقبال الرسائل.',
    actionText: 'فتح في Meta',
    actionUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes',
  },
  '130429': {
    code: '130429',
    title: 'تم تجاوز معدل الإرسال المسموح (Rate Limit)',
    description:
      'تم إرسال عدد كبير جداً من الطلبات في وقت قصير وتجاوز حد الإرسال المسموح به من خوادم Meta.',
    actionText: 'فتح في Meta',
    actionUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/guides/throughput',
  },
  '131053': {
    code: '131053',
    title: 'تم تجاوز حد المراسلة اليومي للحساب (Tier Limit)',
    description:
      'وصل الحساب إلى الحد الأقصى لعدد المحادثات المسموح بها يومياً طبقاً لتصنيف الحساب في Meta.',
    actionText: 'فتح في Meta',
    actionUrl: 'https://developers.facebook.com/docs/whatsapp/messaging-limits',
  },
};

/**
 * Extracts any HTTP/HTTPS or business.facebook.com URL from raw text.
 */
export function extractUrlFromMessage(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(/(https?:\/\/[^\s),]+|business\.facebook\.com[^\s),]+)/i);
  if (!match) return null;
  let url = match[1];
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url;
}

/**
 * Resolves comprehensive Arabic error details and guidance for Meta/WhatsApp errors.
 */
export function getMetaErrorInfo(
  code?: string | null,
  failureReason?: string | null
): MetaErrorInfo {
  const normalizedCode = code ? String(code).trim() : '';
  const urlInMessage = extractUrlFromMessage(failureReason);

  if (normalizedCode && META_ERROR_CODES[normalizedCode]) {
    const info = META_ERROR_CODES[normalizedCode];
    return {
      ...info,
      actionUrl: urlInMessage || info.actionUrl,
      actionText: 'فتح في Meta',
    };
  }

  if (normalizedCode) {
    return {
      code: normalizedCode,
      title: 'كود غير معروف — التفاصيل التقنية تحت',
      description:
        'لم يتم التعرف على كود الخطأ تلقائياً. يرجى مراجعة التفاصيل التقنية أدناه لمعرفة السبب بالتفصيل.',
      actionText: urlInMessage ? 'فتح في Meta' : undefined,
      actionUrl: urlInMessage || undefined,
    };
  }

  return {
    code: '',
    title: 'فشل إرسال الإشعار',
    description:
      'تعذر إرسال الإشعار. يرجى مراجعة سبب الفشل والتفاصيل التقنية أدناه لمعرفة السبب.',
    actionText: urlInMessage ? 'فتح في Meta' : undefined,
    actionUrl: urlInMessage || undefined,
  };
}
