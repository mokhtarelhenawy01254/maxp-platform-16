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
    const conversations = page.conversations.map((contact) => {
      if (normalizeWhatsAppCacheJid(contact.jid) !== targetJid) {
        return contact;
      }

      pageChanged = true;
      changed = true;
      return updater(contact);
    });

    return pageChanged ? { ...page, conversations } : page;
  });

  return changed ? ({ ...old, pages } as T) : old;
};
