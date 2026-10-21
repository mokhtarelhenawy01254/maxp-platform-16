import type { Contact } from "./useWhatsAppQueries";

export type ConversationsCacheData = {
  pages?: Array<{
    conversations?: Contact[];
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export const normalizeWhatsAppCacheJid = (jid?: string | null) => {
  if (!jid) return "";
  const bareJid = jid.split("@")[0]?.split(":")[0] || "";
  return bareJid.replace(/\D/g, "");
};

export const updateConversationPages = <T extends ConversationsCacheData | undefined>(
  old: T,
  remoteJid: string,
  updater: (contact: Contact) => Contact,
): T => {
  if (!old?.pages?.length) return old;

  const targetJid = normalizeWhatsAppCacheJid(remoteJid);
  let changed = false;

  const pages = old.pages.map((page) => {
    if (!Array.isArray(page.conversations)) return page;

    let pageChanged = false;
    let unreadCountReduction = 0;
    const conversations = page.conversations.map((contact) => {
      if (normalizeWhatsAppCacheJid(contact.jid) !== targetJid) {
        return contact;
      }

      pageChanged = true;
      changed = true;
      const updated = updater(contact);
      if ((contact.unreadCount || 0) > 0 && (updated.unreadCount || 0) === 0) {
        unreadCountReduction++;
      }
      return updated;
    });

    if (pageChanged && page.counts && typeof page.counts === "object") {
      const counts = page.counts as Record<string, any>;
      const currentUnread = typeof counts.unread === "number" ? counts.unread : 0;
      return {
        ...page,
        conversations,
        counts: {
          ...counts,
          unread: Math.max(0, currentUnread - unreadCountReduction),
        },
      };
    }

    return pageChanged ? { ...page, conversations } : page;
  });

  return changed ? ({ ...old, pages } as T) : old;
};
