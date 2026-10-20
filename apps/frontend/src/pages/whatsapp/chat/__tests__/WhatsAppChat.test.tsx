// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WhatsAppChat from "../../WhatsAppChat";

// Stable mock user
const mockUser = {
  id: "user-1",
  name: "Sales Agent",
  role: "COMPANY_ADMIN",
};
const mockAuthReturn = { user: mockUser, isLoading: false, isAuthenticated: true };

vi.mock("@/hooks/useAuthSimple", () => ({
  useAuth: () => mockAuthReturn,
}));
vi.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockAuthReturn,
}));

// Mock useSocket
vi.mock("@/hooks/useSocket", () => ({
  default: () => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
}));
vi.mock("../../../../hooks/useSocket", () => ({
  default: () => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
}));

// Mock useWhatsAppQueries
const mockSessions = [
  {
    id: "sess_1",
    name: "مبيعات القاهرة",
    phoneNumber: "201012345678",
    status: "CONNECTED",
    liveStatus: "connected",
  },
];

const mockContacts = [
  {
    id: "contact_1",
    jid: "201011112222@s.whatsapp.net",
    sessionId: "sess_1",
    phoneNumber: "201011112222",
    name: "محمود حسن",
    pushName: "Mahmoud",
    unreadCount: 2,
    lastMessageAt: new Date().toISOString(),
    isArchived: false,
    isPinned: false,
    isMuted: false,
    isBlocked: false,
    lastMessage: {
      content: "أهلاً، هل المنتج متاح؟",
      messageType: "TEXT",
      fromMe: false,
      timestamp: new Date().toISOString(),
    },
    session: { name: "مبيعات القاهرة", phoneNumber: "201012345678" },
  },
];

const mockMessages = [
  {
    messageId: "msg_1",
    remoteJid: "201011112222@s.whatsapp.net",
    fromMe: false,
    content: "أهلاً، هل المنتج متاح؟",
    messageType: "TEXT",
    timestamp: new Date().toISOString(),
    status: "READ",
  },
];

vi.mock("@/hooks/useWhatsAppQueries", () => ({
  useWhatsAppSessions: () => ({
    data: mockSessions,
    isLoading: false,
  }),
  useWhatsAppConversations: () => ({
    data: {
      pages: [
        {
          conversations: mockContacts,
          pagination: { page: 1, limit: 30, total: 1, totalPages: 1 },
          counts: { all: 1, unread: 1, groups: 0, unreplied: 1, archived: 0 },
        },
      ],
    },
    isLoading: false,
    isLoadingMoreConversations: false,
    hasMoreConversations: false,
    conversationsError: false,
    fetchNextConversationsPage: vi.fn(),
    refetchConversations: vi.fn(),
  }),
  useWhatsAppMessages: () => ({
    data: {
      pages: [
        {
          messages: mockMessages,
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        },
      ],
    },
    isLoading: false,
    fetchNextMessagesPage: vi.fn(),
    hasNextPage: false,
    messagesError: false,
    refetchMessages: vi.fn(),
  }),
  useWhatsAppQuickReplies: () => ({
    data: [],
  }),
}));

// Mock useWhatsAppMutations
vi.mock("@/hooks/useWhatsAppMutations", () => ({
  useSendMessage: () => ({ mutate: vi.fn(), isPending: false }),
  useSendMedia: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useSendTemplate: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkAsRead: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteConversation: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteConversationsBulk: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteAllConversations: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveConversation: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Mock useWhatsAppStatuses
vi.mock("@/hooks/useWhatsAppStatuses", () => ({
  useStatuses: () => ({ data: [], isLoading: false }),
  usePostStatus: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Mock virtual scrolling
vi.mock("@/hooks/useVirtualScroll", () => ({
  useVirtualMessages: () => ({
    virtualizer: {
      getVirtualItems: () => [],
      getTotalSize: () => 0,
      measureElement: vi.fn(),
      scrollToIndex: vi.fn(),
    },
    isAtBottom: true,
    scrollToBottom: vi.fn(),
    scrollToTop: vi.fn(),
  }),
  useInfiniteScroll: vi.fn(),
}));

// Mock apiClient
vi.mock("@/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe("WhatsAppChat Monolithic Deconstruction (Batch 328)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders WhatsApp workspace shell and sidebar contacts", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/whatsapp"]}>
          <WhatsAppChat />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Workspace title is accessible
    expect(screen.getByText("لوحة تشغيل واتساب")).toBeInTheDocument();

    // Contact name appears in sidebar
    await waitFor(() => {
      expect(screen.getByText("محمود حسن")).toBeInTheDocument();
    });

    // Last message snippet is rendered
    expect(screen.getByText("أهلاً، هل المنتج متاح؟")).toBeInTheDocument();
  });

  it("allows selecting a contact and renders chat window", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/whatsapp"]}>
          <WhatsAppChat />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("محمود حسن")).toBeInTheDocument();
    });

    // Click on the contact
    const contactItem = screen.getByText("محمود حسن").closest("button");
    if (contactItem) {
      fireEvent.click(contactItem);
    }

    // Input field for message is present
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/اكتب رسالة/i)).toBeInTheDocument();
    });
  });

  it("renders search input in sidebar for filtering chats", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/whatsapp"]}>
          <WhatsAppChat />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const searchInput = (document.querySelector('input.whatsapp-search-input') ||
      screen.getByPlaceholderText(/بحث|search/i)) as HTMLInputElement;
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "محمود" } });
    expect(searchInput).toHaveValue("محمود");
  });
});
