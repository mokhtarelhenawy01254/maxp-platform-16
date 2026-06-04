import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ModeratorDashboard from '../ModeratorDashboard';
import WhatsAppNumberSettings from '../WhatsAppNumberSettings';
import InboxSettingsPage from '../InboxSettingsPage';

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
  useTranslation: () => {
    return {
      t: mockT,
      i18n: { language: 'ar', dir: () => 'rtl' },
    };
  },
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
    expect(screen.getByText(/تحديث مباشر كل 30 ثانية/)).toBeInTheDocument();
    expect(screen.getByText('أرقام متصلة')).toBeInTheDocument();
    expect(screen.getByText('أحدث المحادثات')).toBeInTheDocument();
    expect(screen.getByText('عايز أعرف السعر')).toBeInTheDocument();
  });

  test('WhatsAppNumberSettings renders Arabic routing workspace copy', async () => {
    apiClient.get.mockResolvedValueOnce({
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
        ],
        stats: {
          totalNumbers: 1,
          configuredNumbers: 1,
          exclusiveNumbers: 1,
          roundRobinNumbers: 0,
          connectedNumbers: 1,
        },
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppNumberSettings />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'تقسيم أرقام الواتساب على الفريق' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('ربط مباشر بموظف واحد').length).toBeGreaterThan(0);
    expect(screen.getAllByText('رقم المبيعات').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'حفظ التوزيع' })).toBeEnabled();
    expect(screen.getByText('ملخص الخصوصية')).toBeInTheDocument();
  });

  test('InboxSettingsPage renders Arabic settings and saves changes', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        settings: {
          defaultChatStatus: 'NEW',
          autoCloseEnabled: true,
          autoCloseAfterMin: 20,
          archiveAfterDays: 30,
          retentionDays: 90,
          maxChatsPerModerator: 12,
          allowTransfer: true,
          requireNoteOnClose: false,
          notifyOnNewChat: true,
          notifyOnTransfer: true,
          notifyOnClose: false,
          browserPushEnabled: true,
          soundEnabled: true,
          workingHoursEnabled: true,
          workingHoursStart: '09:00',
          workingHoursEnd: '17:00',
          workingDays: 'SAT,SUN,MON',
        },
      },
    });
    apiClient.put.mockResolvedValueOnce({
      data: {
        success: true,
        settings: {
          defaultChatStatus: 'NEW',
          autoCloseEnabled: true,
          autoCloseAfterMin: 20,
          archiveAfterDays: 30,
          retentionDays: 90,
          maxChatsPerModerator: 12,
          allowTransfer: true,
          requireNoteOnClose: false,
          notifyOnNewChat: true,
          notifyOnTransfer: true,
          notifyOnClose: false,
          browserPushEnabled: true,
          soundEnabled: true,
          workingHoursEnabled: true,
          workingHoursStart: '09:00',
          workingHoursEnd: '17:00',
          workingDays: 'SAT,SUN,MON',
        },
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <InboxSettingsPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'إعدادات واتساب الداخلية' }),
    ).toBeInTheDocument();
    expect(screen.getByText('سياسة الظهور والصلاحيات')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الإعدادات' }));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledTimes(1);
    });
  });
});
