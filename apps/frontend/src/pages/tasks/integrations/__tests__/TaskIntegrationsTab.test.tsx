// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaskIntegrationsTab } from '../../components/TaskIntegrationsTab';

// Mock useAuth
const mockUser = {
  id: 'usr-1',
  role: 'OWNER',
  companyId: 'comp-1',
  name: 'Mokhtar Test',
};

vi.mock('@/hooks/useAuthSimple', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock tokenManager
vi.mock('@/utils/tokenManager', () => ({
  default: {
    getAccessToken: () => 'mock-jwt-token',
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TaskIntegrationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.role = 'OWNER';
    mockUser.companyId = 'comp-1';

    mockFetch.mockImplementation(async (url: string) => {
      let data: unknown = [];
      if (typeof url === 'string') {
        if (url.includes('credentials')) {
          data = [
            {
              id: 'cred-1',
              name: 'External Store API',
              description: 'Key for sync',
              ownershipType: 'COMPANY',
              userId: null,
              userName: null,
              defaultActingUserId: 'usr-1',
              defaultActingUserName: 'Mokhtar Test',
              scopes: ['tasks:read', 'tasks:write'],
              isActive: true,
              keyPrefixMasked: 'mp_live_...1234',
              lastUsedAt: null,
              expiresAt: null,
              revokedAt: null,
              revokedReason: null,
              createdAt: '2026-10-18T10:00:00Z',
              updatedAt: '2026-10-18T10:00:00Z',
            },
          ];
        } else if (url.includes('webhooks')) {
          data = [
            {
              id: 'wh-1',
              name: 'Orders Webhook',
              targetUrl: 'https://webhook.site/test',
              subscribedEvents: ['task.created', 'task.status_changed'],
              providerType: 'GENERIC',
              providerConfig: {
                name: 'Tasks',
                agentId: '',
                wakeMode: 'now',
                deliver: false,
                channel: 'last',
                to: '',
                model: '',
                thinking: '',
                timeoutSeconds: null,
                sessionMode: 'default',
                sessionKeyPrefix: 'hook:task:',
              },
              isActive: true,
              hasSigningSecret: true,
              lastTriggeredAt: null,
              lastSuccessAt: null,
              failureCount: 0,
              createdAt: '2026-10-18T10:00:00Z',
              updatedAt: '2026-10-18T10:00:00Z',
            },
          ];
        }
      }

      return {
        ok: true,
        text: async () => JSON.stringify({ success: true, data }),
      };
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders restricted access notice when user role is not management', () => {
    mockUser.role = 'EMPLOYEE';

    render(<TaskIntegrationsTab users={[]} />);

    expect(
      screen.getByText(/الوصول إلى تكاملات المهام محدود/i),
    ).toBeInTheDocument();
  });

  it('renders quick links and sections when user is manager', async () => {
    render(
      <TaskIntegrationsTab
        users={[
          {
            id: 'usr-1',
            firstName: 'Mokhtar',
            lastName: 'Test',
            name: 'Mokhtar Test',
          },
        ]}
      />,
    );

    // Header buttons
    expect(screen.getByRole('button', { name: 'مفتاح جديد' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Webhook جديدة' })).toBeInTheDocument();

    // Quick links card
    expect(screen.getByText('روابط العمل السريعة')).toBeInTheDocument();

    // Sections
    expect(
      screen.getByRole('heading', { level: 3, name: 'مفاتيح الـ API' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Webhooks' }),
    ).toBeInTheDocument();
  });

  it('opens and closes credential creation form', () => {
    render(<TaskIntegrationsTab users={[]} />);

    const newKeyButton = screen.getByRole('button', { name: 'مفتاح جديد' });
    fireEvent.click(newKeyButton);

    expect(screen.getByText('إنشاء مفتاح جديد')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/متجر الشريك/i)).toBeInTheDocument();

    // Click cancel
    const cancelButtons = screen.getAllByRole('button', { name: 'إلغاء' });
    fireEvent.click(cancelButtons[0]);

    expect(screen.queryByText('إنشاء مفتاح جديد')).not.toBeInTheDocument();
  });

  it('opens and closes webhook creation form', () => {
    render(<TaskIntegrationsTab users={[]} />);

    const newWebhookButton = screen.getByRole('button', { name: 'Webhook جديدة' });
    fireEvent.click(newWebhookButton);

    expect(screen.getByText('إنشاء Webhook جديدة')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/مزامنة متجر خارجي/i)).toBeInTheDocument();

    // Click cancel
    const cancelButtons = screen.getAllByRole('button', { name: 'إلغاء' });
    fireEvent.click(cancelButtons[0]);

    expect(screen.queryByText('إنشاء Webhook جديدة')).not.toBeInTheDocument();
  });
});
