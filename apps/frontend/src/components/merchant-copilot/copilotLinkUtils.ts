import { toast } from 'sonner';

/**
 * Builds the canonical deep link URL for a specific Copilot session.
 * Format: https://<domain>/?copilot=1&session=<sessionId>
 */
export function buildCopilotSessionUrl(sessionId: string): string {
  if (!sessionId) return '';
  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://maxp.online';
  
  return `${origin}/?copilot=1&session=${encodeURIComponent(sessionId)}`;
}

/**
 * Copies the session deep link to the clipboard with fallback for unsupported browsers.
 * Shows a toast confirmation upon success or failure.
 */
export async function copyCopilotSessionLink(sessionId: string): Promise<boolean> {
  const url = buildCopilotSessionUrl(sessionId);
  if (!url) return false;

  let copied = false;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(url);
      copied = true;
    }
  } catch (err) {
    console.warn('[CopilotLink] navigator.clipboard.writeText failed, using fallback:', err);
  }

  // Fallback for browsers / webviews blocking clipboard API
  if (!copied && typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (fallbackErr) {
      console.error('[CopilotLink] Fallback copy failed:', fallbackErr);
    }
  }

  if (copied) {
    toast.success('تم نسخ لينك الجلسة بنجاح');
  } else {
    toast.error('تعذر نسخ اللينك، يرجى المحاولة يدوياً');
  }

  return copied;
}

/**
 * Opens the Copilot session in a new browser tab.
 */
export function openCopilotSessionInNewTab(sessionId: string): void {
  const url = buildCopilotSessionUrl(sessionId);
  if (!url || typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
