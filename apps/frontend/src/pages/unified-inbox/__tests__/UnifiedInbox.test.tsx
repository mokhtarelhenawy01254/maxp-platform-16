// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedInbox } from '../UnifiedInbox';
import type { UnifiedConversation } from '../types/unifiedInboxTypes';

// Mock apiClient
const mockConversations: UnifiedConversation[] = [
  {
    id: 'conv_1',
    platform: 'facebook',
    contactName: 'أحمد محمود',
    contactAvatar: null,
    contactId: 'cust_1',
    contactEmail: 'ahmed@test.com',
    contactPhone: '01012345678',
    lastMessage: 'مرحبا، هل المنتج متوفر؟',
    lastMessageType: 'text',
    lastMessageTime: new Date().toISOString(),
    lastMessageIsFromCustomer: true,
    unreadCount: 2,
    status: 'open',
    assignedTo: null,
    isPinned: false,
    isMuted: false,
    tags: ['استفسار'],
    metadata: {},
    lastOrderNumber: '1001',
    totalOrders: 3,
    aiEnabled: true,
  },
  {
    id: 'conv_2',
    platform: 'whatsapp',
    contactName: 'منى خليل',
    contactAvatar: null,
    contactId: 'cust_2',
    contactEmail: null,
    contactPhone: '01234567890',
    lastMessage: 'شكراً لكم',
    lastMessageType: 'text',
    lastMessageTime: new Date().toISOString(),
    lastMessageIsFromCustomer: false,
    unreadCount: 0,
    status: 'resolved',
    assignedTo: null,
    isPinned: true,
    isMuted: false,
    tags: ['طلب'],
    metadata: {},
    aiEnabled: false,
  },
];

const mockMessages = [
  {
    id: 'msg_1',
    platform: 'facebook',
    content: 'مرحبا، هل المنتج متوفر؟',
    type: 'text',
    isFromCustomer: true,
    timestamp: new Date().toISOString(),
    status: 'received',
    mediaUrl: null,
    mediaType: null,
    mediaFileName: null,
    quotedMessage: null,
    sender: 'customer',
    interactiveData: null,
  },
];

vi.mock('@/services/apiClient', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url.includes('/api/v1/unified-inbox/conversations?')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockConversations,
            pagination: { totalPages: 1 },
          },
        });
      }
      if (url.includes('/messages')) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockMessages,
          },
        });
      }
      if (url.includes('/customer/')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              id: 'cust_1',
              name: 'أحمد محمود',
              firstName: 'أحمد',
              lastName: 'محمود',
              email: 'ahmed@test.com',
              phone: '01012345678',
              avatar: null,
              status: 'active',
              createdAt: '2025-01-01',
              totalOrders: 3,
              totalConversations: 1,
              recentOrders: [],
              recentConversations: [],
              tags: ['VIP'],
              notes: 'عميل مميز',
              ltv: 1500,
            },
          },
        });
      }
      if (url.includes('/quick-replies')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: 'qr_1', title: 'تحية', content: 'أهلاً بك يا فندم' }],
          },
        });
      }
      if (url.includes('/text-gallery')) {
        return Promise.resolve({
          data: {
            texts: [],
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    }),
    post: vi.fn(() => Promise.resolve({ data: { success: true } })),
    put: vi.fn(() => Promise.resolve({ data: { success: true } })),
    delete: vi.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

// Mock socketService
vi.mock('@/services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
    onMessage: vi.fn(),
    onNewConversation: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock PostsManagement
vi.mock('@/pages/comments/PostsManagement', () => ({
  default: () => <div data-testid="posts-management">Posts Management</div>,
}));

// Mock Theme
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ actualTheme: 'light', derivedTheme: 'light' }),
}));

describe('UnifiedInbox Component', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <UnifiedInbox />
      </MemoryRouter>,
    );

  it('renders header bar and conversation list successfully', async () => {
    renderComponent();

    // Verify page title heading exists
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
      expect(screen.getByText('منى خليل')).toBeInTheDocument();
    });
  });

  it('renders empty chat placeholder when no conversation is selected', async () => {
    renderComponent();

    // Verify empty state placeholder is present
    const placeholders = screen.getAllByText(/اختر محادثة/i);
    expect(placeholders.length).toBeGreaterThan(0);
    expect(placeholders[0]).toBeInTheDocument();
  });

  it('selects a conversation and displays the chat canvas and profile', async () => {
    renderComponent();

    // Wait for conversations
    await waitFor(() => {
      expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
    });

    // Click on first conversation item
    const convItem = screen.getByText('أحمد محمود');
    fireEvent.click(convItem);

    // Verify chat canvas displays customer name in header and message
    await waitFor(() => {
      expect(screen.getAllByText('أحمد محمود').length).toBeGreaterThan(1);
      expect(
        screen.getByText('مرحبا، هل المنتج متوفر؟'),
      ).toBeInTheDocument();
    });
  });
});
