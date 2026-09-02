import type { SidebarSection } from '../../../types/layout';

export const sectionHasVisibleItems = (section: SidebarSection): boolean =>
  !section.hidden && section.items.some((item) => !item.hidden);

const STRICT_CHAT_PATHS = new Set([
  '/whatsapp',
  '/whatsapp/chat',
  '/apps/whatsapp',
  '/apps/whatsapp/chat',
  '/apps/whatsapp/inbox',
  '/facebook-inbox',
  '/apps/facebook-inbox',
  '/instagram-inbox',
  '/apps/instagram-inbox',
  '/tiktok-inbox',
  '/apps/tiktok-inbox',
  '/unified-inbox',
  '/apps/unified-inbox',
  '/conversations/messenger',
  '/apps/messenger',
  '/apps/facebook/inbox',
  '/apps/instagram/inbox',
]);

const CHAT_PREFIX_PATHS = [
  '/whatsapp-chat/',
  '/whatsapp/routing',
  '/apps/whatsapp/routing',
  '/facebook-inbox/',
  '/instagram-inbox/',
  '/tiktok-inbox/',
  '/unified-inbox/',
];

const NON_CHAT_SUBPATHS = [
  '/settings',
  '/templates',
  '/meta-templates',
  '/template-broadcast',
  '/lead-followup',
  '/cloud-connect',
  '/employee-analytics',
  '/conversation-analytics',
  '/notification-logs',
  '/customer-journey',
  '/connections',
  '/analytics',
  '/posts',
  '/comments',
  '/post-creator',
  '/post-manager',
  '/stats',
  '/prediction',
];

export const isChatRoute = (pathname?: string): boolean => {
  if (!pathname) return false;
  const norm = pathname.split('?')[0].toLowerCase().replace(/\/+$/, '') || '/';

  // 1. Exclude non-chat subpaths immediately
  if (NON_CHAT_SUBPATHS.some((sub) => norm.includes(sub))) {
    return false;
  }

  // 2. Check exact matches
  if (STRICT_CHAT_PATHS.has(norm)) {
    return true;
  }

  // 3. Check dynamic prefix matches (e.g. /whatsapp-chat/123, /whatsapp/routing/456)
  if (CHAT_PREFIX_PATHS.some((prefix) => norm.startsWith(prefix) || norm === prefix.replace(/\/+$/, ''))) {
    return true;
  }

  return false;
};
