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

const CHAT_APP_IDS = new Set([
  'whatsapp',
  'facebook',
  'facebook-inbox',
  'instagram',
  'instagram-inbox',
  'telegram',
  'tiktok',
  'tiktok-inbox',
  'unified-inbox',
  'messenger',
  'inbox',
]);

export const isChatRoute = (
  pathname?: string,
  appId?: string,
  appCategory?: string,
): boolean => {
  const norm = (pathname || '').split('?')[0].toLowerCase().replace(/\/+$/, '') || '/';

  if (CHAT_ROUTE_PREFIXES.some((prefix) => norm === prefix || norm.startsWith(`${prefix}/`))) {
    return true;
  }

  if (appId && CHAT_APP_IDS.has(appId.toLowerCase())) {
    return true;
  }

  if (appCategory === 'communication') {
    return true;
  }

  return false;
};
