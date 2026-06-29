import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import WhatsAppMetaTemplates from '../WhatsAppMetaTemplates';

const mockT = jest.fn((key: string) => {
  const map: Record<string, string> = { 'common.back': 'رجوع' };
  return map[key] || key;
});

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

const { apiClient } = require('../../../services/apiClient') as {
  apiClient: {
    get: jest.Mock;
    put: jest.Mock;
    post: jest.Mock;
    delete: jest.Mock;
    patch: jest.Mock;
  };
};

describe('WhatsAppMetaTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders heading and empty state when no session selected', async () => {
    apiClient.get.mockResolvedValue({ data: { sessions: [] } });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppMetaTemplates />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'قوالب Meta API' })).toBeInTheDocument();
    expect(screen.getByText(/إدارة قوالب واتساب بزنس/)).toBeInTheDocument();
  });

  test('renders sessions and templates when data loads', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === '/whatsapp/sessions') {
        return Promise.resolve({
          data: {
            sessions: [
              { id: 's1', name: 'رقم المبيعات', phoneNumber: '201000000001', provider: 'META_CLOUD', metaWabaId: 'waba1' },
              { id: 's2', name: 'دعم العملاء', phoneNumber: '201000000002', provider: 'META_CLOUD', metaWabaId: 'waba2' },
            ],
          },
        });
      }
      if (url.includes('/whatsapp-templates/templates')) {
        return Promise.resolve({
          data: {
            templates: [
              { name: 'follow_up', status: 'APPROVED', category: 'MARKETING', language: 'en' },
              { name: 'greeting', status: 'APPROVED', category: 'MARKETING', language: 'ar' },
              { name: 'pending_temp', status: 'PENDING', category: 'UTILITY', language: 'en' },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppMetaTemplates />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('follow_up')).toBeInTheDocument();
    });

    expect(screen.getByText('greeting')).toBeInTheDocument();
    expect(screen.getByText('pending_temp')).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('MARKETING')).toBeInTheDocument();
    expect(screen.getByText('UTILITY')).toBeInTheDocument();

    expect(screen.getByText('رقم المبيعات')).toBeInTheDocument();
    expect(screen.getByText('دعم العملاء')).toBeInTheDocument();
  });

  test('shows fallback to phoneNumber when name is missing', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === '/whatsapp/sessions') {
        return Promise.resolve({
          data: {
            sessions: [
              { id: 's1', phoneNumber: '201000000001', provider: 'META_CLOUD', metaWabaId: 'waba1' },
            ],
          },
        });
      }
      if (url.includes('/whatsapp-templates/templates')) {
        return Promise.resolve({ data: { templates: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppMetaTemplates />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('201000000001')).toBeInTheDocument();
    });
  });

  test('shows "لا توجد قوالب" when templates array is empty', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === '/whatsapp/sessions') {
        return Promise.resolve({
          data: {
            sessions: [
              { id: 's1', name: 'Sales', phoneNumber: '201000000001', provider: 'META_CLOUD', metaWabaId: 'waba1' },
            ],
          },
        });
      }
      if (url.includes('/whatsapp-templates/templates')) {
        return Promise.resolve({ data: { templates: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppMetaTemplates />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('لا توجد قوالب. أنشئ أول قالب.')).toBeInTheDocument();
    });
  });

  test('opens create dialog and submits a new template', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === '/whatsapp/sessions') {
        return Promise.resolve({
          data: {
            sessions: [
              { id: 's1', name: 'Sales', phoneNumber: '201000000001', provider: 'META_CLOUD', metaWabaId: 'waba1' },
            ],
          },
        });
      }
      if (url.includes('/whatsapp-templates/templates')) {
        return Promise.resolve({ data: { templates: [] } });
      }
      return Promise.resolve({ data: {} });
    });
    apiClient.post.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppMetaTemplates />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('قالب جديد')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('قالب جديد'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('أنشئ قالب رسالة جديد في Meta Cloud API.')).toBeInTheDocument();
  });

  test('shows super admin title when companyName is provided', async () => {
    apiClient.get.mockResolvedValue({ data: { sessions: [] } });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppMetaTemplates companyId="c1" companyName="شركةテスト" superAdminMode />
      </MemoryRouter>,
    );

    expect(await screen.findByText('قوالب Meta API · شركةテスト')).toBeInTheDocument();
  });
});
