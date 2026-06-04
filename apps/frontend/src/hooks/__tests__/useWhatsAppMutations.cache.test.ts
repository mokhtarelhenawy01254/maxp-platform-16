import type { Contact } from "../useWhatsAppQueries";
import {
  normalizeWhatsAppCacheJid,
  updateConversationPages,
} from "../whatsappMutationCache";

const buildContact = (overrides: Partial<Contact>): Contact => ({
  id: "contact-1",
  sessionId: "session-1",
  jid: "201270388115@s.whatsapp.net",
  phoneNumber: "201270388115",
  name: null,
  pushName: null,
  profilePicUrl: null,
  isGroup: false,
  category: null,
  unreadCount: 5,
  lastMessageAt: null,
  isArchived: false,
  isPinned: false,
  isMuted: false,
  session: {
    name: "Main",
    phoneNumber: null,
  },
  customer: null,
  ...overrides,
});

describe("WhatsApp mutation cache helpers", () => {
  it("normalizes JIDs with device suffixes for cache matching", () => {
    expect(normalizeWhatsAppCacheJid("201270388115:23@s.whatsapp.net")).toBe(
      "201270388115",
    );
    expect(normalizeWhatsAppCacheJid("201270388115@s.whatsapp.net")).toBe(
      "201270388115",
    );
  });

  it("updates matching conversations across all cached pages", () => {
    const cache = {
      pages: [
        {
          conversations: [
            buildContact({ id: "target-1", unreadCount: 5 }),
            buildContact({
              id: "other",
              jid: "201111111111@s.whatsapp.net",
              unreadCount: 2,
            }),
          ],
        },
        {
          conversations: [
            buildContact({
              id: "target-2",
              jid: "201270388115:11@s.whatsapp.net",
              unreadCount: 3,
            }),
          ],
        },
      ],
      pageParams: [1, 2],
    };

    const updated = updateConversationPages(
      cache,
      "201270388115@s.whatsapp.net",
      (contact) => ({ ...contact, unreadCount: 0 }),
    );

    expect(updated.pages[0].conversations[0].unreadCount).toBe(0);
    expect(updated.pages[0].conversations[1].unreadCount).toBe(2);
    expect(updated.pages[1].conversations[0].unreadCount).toBe(0);
    expect(cache.pages[0].conversations[0].unreadCount).toBe(5);
  });

  it("keeps the same cache reference when no conversation matches", () => {
    const cache = {
      pages: [
        {
          conversations: [buildContact({ jid: "201111111111@s.whatsapp.net" })],
        },
      ],
    };

    const updated = updateConversationPages(
      cache,
      "201270388115@s.whatsapp.net",
      (contact) => ({ ...contact, unreadCount: 0 }),
    );

    expect(updated).toBe(cache);
  });
});
