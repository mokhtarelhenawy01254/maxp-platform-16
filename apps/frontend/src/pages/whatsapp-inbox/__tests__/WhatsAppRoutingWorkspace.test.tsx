import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ModeratorDashboard from '../ModeratorDashboard';
import WhatsAppRoutingWorkspace from '../WhatsAppRoutingWorkspace';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const translations = require('../../../locales/ar/sections/whatsappInbox.json');
const resolveTranslation = (key: string) => {
  const normalizedKey = key.replace(/^whatsappInbox\./, '');
  return normalizedKey.split('.').reduce<unknown>((value, segment) => {
    if (value && typeof value === 'object' && segment in value) {
      return (value as Record<string, unknown>)[segment];
    }
    return key;
  }, translations as unknown) as string;
};
const mockT = jest.fn((key: string) => resolveTranslation(key));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'ar', dir: () => 'rtl' },
  }),
}));

jest.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiClient } = require('../../../services/apiClient') as {
  apiClient: {
    get: jest.Mock;
    put: jest.Mock;
    post: jest.Mock;
    delete: jest.Mock;
    patch: jest.Mock;
  };
};

const workspacePayload = {
  success: true,
  numbers: [
    {
      id: 'assignment-1',
      sessionId: 'session-1',
      assignmentId: 'assignment-1',
      isConfigured: true,
      connectionStatus: 'CONNECTED',
      routingMode: 'NUMBER_OWNER',
      distributionStrategy: 'ROUND_ROBIN',
      assignedUser: {
        id: 'user-1',
        firstName: 'سارة',
        lastName: 'أحمد',
        email: 'sara@example.com',
        avatar: null,
        role: 'AGENT',
        isActive: true,
      },
      routingUsers: [
        {
          id: 'user-1',
          firstName: 'سارة',
          lastName: 'أحمد',
          email: 'sara@example.com',
          avatar: null,
          role: 'AGENT',
          isActive: true,
        },
      ],
      routingUserIds: ['user-1'],
      activeMemberCount: 1,
      lastDistributedUserId: 'user-1',
      lastDistributedAt: '2026-05-17T08:00:00.000Z',
      roundRobinCursor: 0,
      assignedAt: '2026-05-17T08:00:00.000Z',
      isActive: true,
      session: {
        id: 'session-1',
        name: 'رقم المبيعات',
        phoneNumber: '+201000000001',
        status: 'CONNECTED',
        provider: 'whatsapp-web',
        profileName: null,
        lastConnectedAt: null,
      },
    },
  ],
  moderators: [
    {
      id: 'user-1',
      firstName: 'سارة',
      lastName: 'أحمد',
      email: 'sara@example.com',
      role: 'AGENT',
      isActive: true,
      avatar: null,
    },
    {
      id: 'user-2',
      firstName: 'خالد',
      lastName: 'محمد',
      email: 'khaled@example.com',
      role: 'AGENT',
      isActive: true,
      avatar: null,
    },
  ],
  stats: {
    totalNumbers: 1,
    configuredNumbers: 1,
    exclusiveNumbers: 1,
    roundRobinNumbers: 0,
    connectedNumbers: 1,
  },
};

const settingsPayload = {
  success: true,
  settings: {
    defaultChatStatus: 'NEW',
    autoCloseEnabled: false,
    autoCloseAfterMin: 30,
    archiveAfterDays: 30,
    retentionDays: 90,
    maxChatsPerModerator: 50,
    allowTransfer: true,
    requireNoteOnClose: false,
    notifyOnNewChat: true,
    notifyOnTransfer: true,
    notifyOnClose: false,
    browserPushEnabled: true,
    soundEnabled: true,
    workingHoursEnabled: false,
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    workingDays: 'SAT,SUN,MON,TUE,WED,THU',
  },
};

describe('WhatsApp inbox admin pages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockT.mockImplementation((key: string) => resolveTranslation(key));
  });

  test('ModeratorDashboard renders Arabic labels and latest conversation data', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        cachedAt: '2026-05-17T08:00:00.000Z',
        stats: {
          newChats: 4,
          closedChats: 2,
          totalActive: 7,
          pendingChats: 3,
          todayConversations: 9,
          unreadCount: 5,
          avgResponseTime: 120,
        },
        sessionStatuses: [
          {
            id: 'session-1',
            name: 'المبيعات الرئيسية',
            phoneNumber: '+201000000001',
            status: 'CONNECTED',
            isOnline: true,
            lastConnectedAt: null,
          },
          {
            id: 'session-2',
            name: 'دعم الطلبات',
            phoneNumber: '+201000000002',
            status: 'DISCONNECTED',
            isOnline: false,
            lastConnectedAt: null,
          },
        ],
        latestConversations: [
          {
            id: 'conv-1',
            status: 'ACTIVE',
            lastMessageAt: '2026-05-17T07:59:00.000Z',
            lastMessagePreview: 'عايز أعرف السعر',
            isRead: false,
            customer: {
              id: 'customer-1',
              name: 'أحمد',
              phone: '01000000000',
              avatar: null,
            },
          },
        ],
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ModeratorDashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'لوحة تحكم المشرفين' }),
    ).toBeInTheDocument();
    expect(screen.getByText('أرقام متصلة')).toBeInTheDocument();
    expect(screen.getByText('أحدث المحادثات')).toBeInTheDocument();
    expect(screen.getByText('عايز أعرف السعر')).toBeInTheDocument();
  });

  test('WhatsAppRoutingWorkspace renders Arabic copy and toggles employee selection', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/inbox-settings')) {
        return Promise.resolve({ data: settingsPayload });
      }
      return Promise.resolve({ data: workspacePayload });
    });
    apiClient.put.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppRoutingWorkspace />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'تقسيم أرقام الواتساب على الفريق' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('رقم المبيعات').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ربط مباشر بموظف واحد').length).toBeGreaterThan(0);

    const saveButton = screen.getByRole('button', { name: 'حفظ التوزيع' });
    expect(saveButton).toBeDisabled();

    const khaledButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.includes('خالد'));
    if (khaledButton) {
      fireEvent.click(khaledButton);
    }

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/v1/admin/whatsapp-numbers/session-1/routing',
        expect.objectContaining({
          routingMode: 'NUMBER_OWNER',
          distributionStrategy: 'ROUND_ROBIN',
          userIds: ['user-2'],
        }),
      );
    });
  });

  test('WhatsAppRoutingWorkspace shows error feedback on save failure', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/inbox-settings')) {
        return Promise.resolve({ data: settingsPayload });
      }
      return Promise.resolve({ data: workspacePayload });
    });
    apiClient.put.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppRoutingWorkspace />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'تقسيم أرقام الواتساب على الفريق' });

    const khaledButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.includes('خالد'));
    if (khaledButton) fireEvent.click(khaledButton);

    const saveButton = screen.getByRole('button', { name: 'حفظ التوزيع' });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(document.querySelector('.text-rose-800, .dark\\:text-rose-200')).toBeTruthy();
    });
  });

  test('WhatsAppRoutingWorkspace validation prevents save with zero employees in NUMBER_OWNER', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/inbox-settings')) {
        return Promise.resolve({ data: settingsPayload });
      }
      return Promise.resolve({ data: workspacePayload });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppRoutingWorkspace />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'تقسيم أرقام الواتساب على الفريق' });

    const saraButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.includes('سارة'));
    if (saraButton) fireEvent.click(saraButton);

    const saveButton = screen.getByRole('button', { name: 'حفظ التوزيع' });
    await waitFor(() => expect(saveButton).toBeEnabled());

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(document.querySelector('.text-rose-800, .dark\\:text-rose-200')).toBeTruthy();
    });

    expect(apiClient.put).not.toHaveBeenCalled();
  });

  test('WhatsAppRoutingWorkspace shows empty state when no numbers', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/inbox-settings')) {
        return Promise.resolve({ data: settingsPayload });
      }
      return Promise.resolve({
        data: { success: true, numbers: [], moderators: [], stats: { totalNumbers: 0, configuredNumbers: 0, exclusiveNumbers: 0, roundRobinNumbers: 0, connectedNumbers: 0 } },
      });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppRoutingWorkspace />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'تقسيم أرقام الواتساب على الفريق' });
    expect(screen.getByText('لا توجد أرقام واتساب متاحة الآن.')).toBeInTheDocument();
  });

  test('WhatsAppRoutingWorkspace unassign flow works end-to-end', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/inbox-settings')) {
        return Promise.resolve({ data: settingsPayload });
      }
      return Promise.resolve({ data: workspacePayload });
    });
    apiClient.post.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppRoutingWorkspace />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'تقسيم أرقام الواتساب على الفريق' });

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء الإسناد' }));

    await waitFor(() => {
      expect(screen.getByText('هل أنت متأكد من إلغاء إسناد الرقم {{number}}؟')).toBeInTheDocument();
    });

    const confirmButtons = screen.getAllByRole('button', { name: 'إلغاء الإسناد' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/admin/whatsapp-numbers/unassign',
        { sessionId: 'session-1' },
      );
    });
  });

  test('WhatsAppRoutingWorkspace switches between numbers', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url.includes('/inbox-settings')) {
        return Promise.resolve({ data: settingsPayload });
      }
      return Promise.resolve({
        data: {
          success: true,
          numbers: [
            {
              id: 'assignment-1',
              sessionId: 'session-1',
              assignmentId: 'assignment-1',
              isConfigured: true,
              connectionStatus: 'CONNECTED',
              routingMode: 'NUMBER_OWNER',
              distributionStrategy: 'ROUND_ROBIN',
              assignedUser: null,
              routingUsers: [],
              routingUserIds: [],
              activeMemberCount: 0,
              lastDistributedUserId: null,
              lastDistributedAt: null,
              roundRobinCursor: 0,
              assignedAt: null,
              isActive: true,
              session: { id: 'session-1', name: 'رقم المبيعات', phoneNumber: '+201000000001', status: 'CONNECTED', provider: 'whatsapp-web', profileName: null, lastConnectedAt: null },
            },
            {
              id: 'assignment-2',
              sessionId: 'session-2',
              assignmentId: 'assignment-2',
              isConfigured: false,
              connectionStatus: 'DISCONNECTED',
              routingMode: 'NUMBER_OWNER',
              distributionStrategy: 'ROUND_ROBIN',
              assignedUser: null,
              routingUsers: [],
              routingUserIds: [],
              activeMemberCount: 0,
              lastDistributedUserId: null,
              lastDistributedAt: null,
              roundRobinCursor: 0,
              assignedAt: null,
              isActive: true,
              session: { id: 'session-2', name: 'رقم الدعم', phoneNumber: '+201000000002', status: 'DISCONNECTED', provider: 'whatsapp-web', profileName: null, lastConnectedAt: null },
            },
          ],
          moderators: [],
          stats: { totalNumbers: 2, configuredNumbers: 1, exclusiveNumbers: 0, roundRobinNumbers: 0, connectedNumbers: 1 },
        },
      });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppRoutingWorkspace />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'تقسيم أرقام الواتساب على الفريق' });

    await waitFor(() => {
      expect(screen.getAllByText('رقم الدعم').length).toBeGreaterThan(0);
    });
  });
});