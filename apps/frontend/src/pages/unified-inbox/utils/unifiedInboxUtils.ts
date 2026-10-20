export const isMediaOrProxyUrl = (text?: string | null): boolean => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return (
    /proxy-image/i.test(trimmed) ||
    /^\/?api\/v1\/proxy-image/i.test(trimmed) ||
    /^\/?uploads\/chat-media\//i.test(trimmed) ||
    /scontent.*?\.fbcdn\.net/i.test(trimmed) ||
    /cdn\.fbsbx\.com/i.test(trimmed) ||
    /cdninstagram\.com/i.test(trimmed) ||
    ((/^(https?:\/\/|\/|uploads\/|assets\/)/i.test(trimmed)) &&
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|mp4|mov|webm|m4a|mp3|ogg|opus|wav|pdf)(\?|$)/i.test(
        trimmed.split(/[\s\n]/)[0] || '',
      ))
  );
};

export const normalizeUrlCandidate = (candidate?: string | null): string | null => {
  if (!candidate) return null;
  const trimmed = candidate.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return null;
  return trimmed;
};

export const extractFirstAttachmentFromText = (
  text?: string | null,
): { cleanText: string; attachmentUrl: string | null; attachmentType: string | null } => {
  if (!text || typeof text !== 'string') {
    return { cleanText: '', attachmentUrl: null, attachmentType: null };
  }

  const trimmed = text.trim();
  if (isMediaOrProxyUrl(trimmed)) {
    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(trimmed) || /proxy-image/i.test(trimmed);
    const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(trimmed);
    const isAudio = /\.(m4a|mp3|ogg|opus|wav)(\?|$)/i.test(trimmed);
    const isDoc = /\.pdf(\?|$)/i.test(trimmed);

    let type = 'file';
    if (isImage) type = 'image';
    else if (isVideo) type = 'video';
    else if (isAudio) type = 'audio';
    else if (isDoc) type = 'document';

    return {
      cleanText: '',
      attachmentUrl: trimmed,
      attachmentType: type,
    };
  }

  return { cleanText: text, attachmentUrl: null, attachmentType: null };
};

export const formatUnifiedTime = (
  dateStr: string,
  language: string = 'ar',
  yesterdayLabel: string = 'أمس',
): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  if (days === 0) {
    return date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (days === 1) return yesterdayLabel;
  if (days < 7) return date.toLocaleDateString(locale, { weekday: 'short' });
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};
