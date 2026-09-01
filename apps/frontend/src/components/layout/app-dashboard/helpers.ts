import type { SidebarSection } from '../../../types/layout';

export const sectionHasVisibleItems = (section: SidebarSection): boolean =>
  !section.hidden && section.items.some((item) => !item.hidden);

const CHAT_ROUTE_PREFIXES = [
  '/whatsapp',
  '/whatsapp-chat',
  '/whatsapp-inbox',
  '/facebook-inbox',
  '/instagram-inbox',
  '/tiktok-inbox',
  '/unified-inbox',
  '/conversations',
  '/telegram-inbox',
  '/inbox',
  '/apps/whatsapp',
  '/apps/facebook-inbox',
  '/apps/facebook',
  '/apps/instagram-inbox',
  '/apps/instagram',
  '/apps/tiktok-inbox',
  '/apps/tiktok',
  '/apps/unified-inbox',
  '/apps/telegram',
  '/apps/messenger',
  '/apps/inbox',
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

export const isChatRoute = (
  pathname?: string,
  appId?: string,
  appCategory?: string,
): boolean => {
  const norm = (pathname || '').split('?')[0].toLowerCase().replace(/\/+$/, '') || '/';

  // If on a non-chat management page (e.g. /whatsapp/settings, /whatsapp/templates, etc.), not a chat
  if (NON_CHAT_SUBPATHS.some((subpath) => norm.includes(subpath))) {
    return false;
  }

  // Check against known chat route prefixes
  if (CHAT_ROUTE_PREFIXES.some((prefix) => norm === prefix || norm.startsWith(`${prefix}/`))) {
    return true;
  }

  // Check appId if category is communication
  if (appId && ['whatsapp', 'facebook', 'facebook-inbox', 'instagram', 'instagram-inbox', 'telegram', 'tiktok', 'tiktok-inbox', 'unified-inbox', 'messenger', 'inbox'].includes(appId.toLowerCase())) {
    return true;
  }

  return false;
};
