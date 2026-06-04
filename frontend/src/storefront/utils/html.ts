import DOMPurify from 'dompurify';

export const sanitizeStorefrontHtml = (html?: string | null): string => {
  if (typeof html !== 'string' || !html.trim()) {
    return '';
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
};
