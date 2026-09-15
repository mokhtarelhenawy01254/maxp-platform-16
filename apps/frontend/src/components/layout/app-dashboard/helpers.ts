import type { SidebarSection } from '../../../types/layout';

export const sectionHasVisibleItems = (section: SidebarSection): boolean =>
  !section.hidden && section.items.some((item) => !item.hidden);

// These are combined "list + conversation" inbox screens (master-detail). They
// render the contact list and the conversation on the SAME route, and hide the
// bottom nav inside the conversation through their own chat-active markers
// (data-chat-active, .business-inbox-shell--conversation-active,
//  .whatsapp-workspace--chat-active, body.app-shell-chat-active).
// They must NOT be treated as chat routes here, otherwise the bottom nav is
// hidden on the conversations LIST too — we want it visible there and hidden
// only once a conversation is actually open (handled by the markers + CSS).
const STRICT_CHAT_PATHS = new Set([
  '/facebook-inbox',
  '/apps/facebook-inbox',
  '/whatsapp',
  '/apps/whatsapp',
  '/apps/whatsapp/chat',
  '/apps/whatsapp/inbox',
  '/instagram-inbox',
  '/apps/instagram-inbox',
  '/tiktok-inbox',
  '/apps/tiktok-inbox',
  '/unified-inbox',
  '/apps/unified-inbox',
  '/conversations',
  '/conversations/messenger',
  '/apps/messenger',
  '/apps/facebook/inbox',
  '/apps/instagram/inbox',
  '/tickets',
  '/apps/tickets',
  '/settings/turbo-tickets',
]);

const CHAT_PREFIX_PATHS = [
  '/facebook-inbox/',
  '/apps/facebook-inbox/',
  '/whatsapp-chat/',
  '/whatsapp/routing',
  '/apps/whatsapp/routing',
  '/instagram-inbox/',
  '/tiktok-inbox/',
  '/unified-inbox/',
  '/conversations/',
  '/tickets/',
  '/apps/tickets/',
  '/settings/turbo-tickets/',
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
