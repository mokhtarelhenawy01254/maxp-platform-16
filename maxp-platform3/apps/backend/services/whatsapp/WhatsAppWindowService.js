/**
 * WhatsApp 24-Hour Messaging Window Service
 * Tracks and computes the remaining time in the customer service window
 * for Meta Cloud API sessions.
 *
 * The 24-hour window opens when a customer sends a message.
 * During the window, free-form messages are allowed.
 * Outside the window, only pre-approved templates can be sent.
 */

const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Compute the window status for a WhatsApp contact.
 * @param {object} contact - WhatsAppContact row (must include lastCustomerMessageAt)
 * @returns {{ isOpen: boolean, windowExpiresAt: string|null, remainingSeconds: number, remainingLabel: string }}
 */
function computeWindowStatus(contact) {
  if (!contact?.lastCustomerMessageAt) {
    return {
      isOpen: false,
      windowExpiresAt: null,
      remainingSeconds: 0,
      remainingLabel: '—'
    };
  }

  const lastMsg = new Date(contact.lastCustomerMessageAt).getTime();
  const now = Date.now();
  const expiresAt = lastMsg + WINDOW_DURATION_MS;
  const remaining = Math.max(0, expiresAt - now);
  const remainingSeconds = Math.floor(remaining / 1000);
  const isOpen = remaining > 0;

  return {
    isOpen,
    windowExpiresAt: new Date(expiresAt).toISOString(),
    remainingSeconds,
    remainingLabel: formatRemaining(remainingSeconds)
  };
}

/**
 * Format remaining seconds into a human-readable label (Arabic).
 */
function formatRemaining(totalSeconds) {
  if (totalSeconds <= 0) return 'انتهت المهلة';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours >= 24) return 'أكثر من 24 ساعة';
  if (hours > 0) {
    const mins = minutes > 0 ? ` و${minutes} د` : '';
    return `${hours} س${mins}`;
  }
  if (minutes > 0) return `${minutes} د`;
  return 'أقل من دقيقة';
}

module.exports = {
  computeWindowStatus,
  formatRemaining,
  WINDOW_DURATION_MS
};
