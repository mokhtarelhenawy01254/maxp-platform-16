import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSendMessage } from "../useWhatsAppMutations";
import type { Contact } from "../useWhatsAppQueries";

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock("../../services/indexedDBStorage", () => ({
  indexedDBStorage: {
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiClient } = require("../../services/apiClient") as {
  apiClient: { post: jest.Mock };
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { indexedDBStorage } = require("../../services/indexedDBStorage") as {
  indexedDBStorage: { removeItem: jest.Mock };
};

type ConversationsCache = {
  pages: Array<{
    conversations: Contact[];
  }>;
  pageParams: number[];
};

const buildContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: "contact-1",
  sessionId: "session-1",
  jid: "201234567890@s.whatsapp.net",
  phoneNumber: "201234567890",
  name: "Test Contact",
  pushName: null,
  profilePicUrl: null,
  isGroup: false,
  category: null,
  unreadCount: 3,
  lastMessageAt: "2026-05-07T07:00:00.000Z",
  isArchived: false,
  isPinned: false,
  isMuted: false,
  session: {
    name: "Primary Session",
    phoneNumber: "201111111111",
  },
  customer: null,
  ...overrides,
});

const buildConversationsCache = (contact: Contact): ConversationsCache => ({
  pages: [
    {
      conversations: [contact],
    },
  ],
  pageParams: [1],
});

describe("useWhatsAppMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears unread badges in both session and all-session caches after sending a reply", async () => {
    apiClient.post.mockResolvedValue({ data: { success: true } });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const contact = buildContact();
    queryClient.setQueryData(
      ["whatsapp", "conversations", "session-1", 30],
      buildConversationsCache(contact),
    );
    queryClient.setQueryData(
      ["whatsapp", "conversations", "all", 30],
      buildConversationsCache(contact),
    );
    queryClient.setQueryData(
      ["whatsapp", "messages", contact.jid, "session-1"],
      {
        pages: [{ messages: [] }],
        pageParams: [1],
      },
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        sessionId: "session-1",
        to: contact.jid,
        text: "reply from agent",
      });
    });

    await waitFor(() => {
      const sessionCache = queryClient.getQueryData<ConversationsCache>([
        "whatsapp",
        "conversations",
        "session-1",
        30,
      ]);
      const allCache = queryClient.getQueryData<ConversationsCache>([
        "whatsapp",
        "conversations",
        "all",
        30,
      ]);

      expect(sessionCache?.pages[0].conversations[0].unreadCount).toBe(0);
      expect(allCache?.pages[0].conversations[0].unreadCount).toBe(0);
      expect(sessionCache?.pages[0].conversations[0].lastMessage?.content).toBe(
        "reply from agent",
      );
      expect(allCache?.pages[0].conversations[0].lastMessage?.fromMe).toBe(true);
    });

    expect(apiClient.post).toHaveBeenCalledWith("/whatsapp/messages/send", {
      sessionId: "session-1",
      to: contact.jid,
      text: "reply from agent",
    });
    expect(indexedDBStorage.removeItem).toHaveBeenCalledWith(
      `whatsapp_messages_${contact.jid}_session-1`,
    );
    expect(indexedDBStorage.removeItem).toHaveBeenCalledWith(
      "whatsapp_conversations_session-1",
    );
    expect(indexedDBStorage.removeItem).toHaveBeenCalledWith(
      "whatsapp_conversations_all",
    );
  });
});
