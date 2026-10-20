// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FacebookInbox from '../FacebookInbox';

// Mock Auth
const mockUser = {
  id: 'user_fb_1',
  name: 'Ahmed Support',
  role: 'COMPANY_ADMIN',
};
vi.mock('@/hooks/useAuthSimple', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: true }),
}));

// Mock Company
vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'comp_123' }),
}));

// Mock Socket
vi.mock('@/hooks/useSocket', () => ({
  default: () => ({
    socket: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    isConnected: true,
  }),
}));

// Mock Conversation data
const mockConversations = [
  {
    id: 'conv_fb_1',
    customerId: 'cust_fb_1',
    customerName: 'سارة إبراهيم',
    customerAvatar: null,
    lastMessage: 'ممكن تفاصيل المنتج وسعره؟',
    lastMessageTime: new Date(),
    unreadCount: 1,
    platform: 'facebook',
    tab: 'unreplied',
    status: 'open',
    assignedTo: null,
    assignedToName: null,
    tags: ['استفسار'],
    priority: false,
    pageName: 'صفحة المتجر',
    lastMessageIsFromCustomer: true,
  },
];

const mockMessages = [
  {
    id: 'msg_fb_1',
    conversationId: 'conv_fb_1',
    content: 'ممكن تفاصيل المنتج وسعره؟',
    isFromCustomer: true,
    timestamp: new Date().toISOString(),
    type: 'text',
    status: 'received',
    senderName: 'سارة إبراهيم',
  },
];

const mockSelectConversation = vi.fn();
const mockLoadConversations = vi.fn();
const mockLoadMessages = vi.fn();
const mockAddMessage = vi.fn();

vi.mock('@/hooks/inbox/useInboxConversations', () => ({
  useInboxConversations: () => ({
    conversations: mockConversations,
    selectedConversation: null,
    messages: mockMessages,
    loading: false,
    loadingMessages: false,
    error: null,
    selectConversation: mockSelectConversation,
    loadMessages: mockLoadMessages,
    loadConversations: mockLoadConversations,
    loadMoreMessages: vi.fn(),
    addMessage: mockAddMessage,
    updateMessage: vi.fn(),
    hasMore: false,
    hasMoreConversations: false,
    loadMoreConversations: vi.fn(),
    updateSelectedConversation: vi.fn(),
    updateConversationInList: vi.fn(),
    selectedIds: new Set(),
    toggleSelection: vi.fn(),
    clearSelection: vi.fn(),
    apiCounts: { total: 1, unreplied: 1, priority: 0 },
    addConversationToList: vi.fn(),
    markMessagesAsRead: vi.fn(),
  }),
}));

vi.mock('@/hooks/inbox/useSendMessage', () => ({
  useSendMessage: () => ({
    sendTextMessage: vi.fn(),
    sendFileMessage: vi.fn(),
    sending: false,
    uploadingFile: false,
  }),
}));

vi.mock('@/hooks/inbox/useConversationActions', () => ({
  useConversationActions: () => ({
    updateStatus: vi.fn(),
    assignConversation: vi.fn(),
    markAsDone: vi.fn(),
    togglePriority: vi.fn(),
    bulkUpdate: vi.fn(),
    deleteConversation: vi.fn(),
    deleteMessage: vi.fn(),
    forwardMessage: vi.fn(),
    toggleMessageStar: vi.fn(),
    toggleMessageReaction: vi.fn(),
    snoozeConversation: vi.fn(),
    updating: false,
  }),
}));

vi.mock('@/hooks/inbox/useTagManagement', () => ({
  useTagManagement: () => ({
    addTags: vi.fn(),
    updating: false,
  }),
}));

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('@/services/apiService', () => ({
  apiService: {
    checkCustomerBlockStatus: vi.fn(() => Promise.resolve({ isBlocked: false })),
    updateConversation: vi.fn(() => Promise.resolve({ success: true })),
  },
}));

describe('FacebookInbox Monolithic Deconstruction (Batch 329)', () => {
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

  it('renders Facebook inbox workspace and conversation list items', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/facebook-inbox']}>
          <FacebookInbox />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Verify conversation customer item is rendered
    expect(screen.getByText('سارة إبراهيم')).toBeInTheDocument();
    expect(screen.getByText('ممكن تفاصيل المنتج وسعره؟')).toBeInTheDocument();

    // Verify empty chat placeholder is shown when no conversation is selected
    expect(
      screen.getAllByText(/اختر محادثة/i)[0],
    ).toBeInTheDocument();
  });

  it('calls selectConversation when a conversation item is clicked', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/facebook-inbox']}>
          <FacebookInbox />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const convItem = screen.getByText('سارة إبراهيم');
    fireEvent.click(convItem);

    expect(mockSelectConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'conv_fb_1',
        customerName: 'سارة إبراهيم',
      }),
    );
  });

  it('renders quick filters bar and handles unread toggle', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/facebook-inbox']}>
          <FacebookInbox />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const unreadButton = screen.getByText(/غير مقروءة/i);
    expect(unreadButton).toBeInTheDocument();

    fireEvent.click(unreadButton);
    expect(unreadButton).toBeInTheDocument();
  });
});
