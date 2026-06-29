import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import WhatsAppTemplateBroadcast from '../WhatsAppTemplateBroadcast';

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

describe('WhatsAppTemplateBroadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders heading and disabled send button', async () => {
    apiClient.get.mockResolvedValue({ data: { sessions: [] } });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppTemplateBroadcast />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'بث قالب واتساب' })).toBeInTheDocument();
    expect(screen.getByText(/أرسل قالب رسالة Meta API/)).toBeInTheDocument();

    const sendBtn = screen.getByRole('button', { name: /إرسال البث/ });
    expect(sendBtn).toBeDisabled();
  });

  test('loads sessions and renders approved template in select', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === '/whatsapp/sessions') {
        return Promise.resolve({
          data: {
            sessions: [
              { id: 's1', name: 'رقم المبيعات', phoneNumber: '201000000001', provider: 'META_CLOUD', metaWabaId: 'waba1' },
            ],
          },
        });
      }
      if (url.includes('/whatsapp-templates/templates')) {
        return Promise.resolve({
          data: {
            templates: [
              { name: 'promo', status: 'APPROVED', category: 'MARKETING', language: 'en' },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppTemplateBroadcast />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('رقم المبيعات')).toBeInTheDocument();
    });

    const trigger = screen.getByText('اختر قالباً');
    await userEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByText((c) => c.includes('promo'))).toBeInTheDocument();
    });
  });

  test('shows fallback to phoneNumber when session name missing', async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === '/whatsapp/sessions') {
        return Promise.resolve({
          data: {
            sessions: [
              { id: 's1', phoneNumber: '201099999999', provider: 'META_CLOUD', metaWabaId: 'waba1' },
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
        <WhatsAppTemplateBroadcast />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('201099999999')).toBeInTheDocument();
    });
  });

  test('shows empty templates message when no approved templates', async () => {
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
        <WhatsAppTemplateBroadcast />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('لا توجد قوالب معتمدة. أنشئ قالباً أولاً.')).toBeInTheDocument();
    });
  });

  test('adds recipients from textarea and shows count', async () => {
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
        return Promise.resolve({ data: { templates: [{ name: 'promo', status: 'APPROVED', category: 'MARKETING', language: 'en' }] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppTemplateBroadcast />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('0 مستلم')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/أرقام الهواتف/);
    await userEvent.type(textarea, '201234567890\n201098765432');
    await userEvent.click(screen.getByText('إضافة المستلمين'));

    expect(screen.getByText('2 مستلم')).toBeInTheDocument();
    expect(screen.getByText('201234567890')).toBeInTheDocument();
    expect(screen.getByText('201098765432')).toBeInTheDocument();
  });

  test('sends broadcast and shows result', async () => {
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
        return Promise.resolve({ data: { templates: [{ name: 'promo', status: 'APPROVED', category: 'MARKETING', language: 'en' }] } });
      }
      return Promise.resolve({ data: {} });
    });
    apiClient.post.mockResolvedValue({
      data: {
        results: { sent: 2, failed: 0, errors: [] },
      },
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <WhatsAppTemplateBroadcast />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Sales')).toBeInTheDocument();
    });

    const templateSelect = screen.getByText('اختر قالباً');
    await userEvent.click(templateSelect);
    await waitFor(() => {
      expect(screen.getByText(/promo/)).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText(/promo/));

    const textarea = screen.getByPlaceholderText(/أرقام الهواتف/);
    await userEvent.type(textarea, '201234567890');
    await userEvent.click(screen.getByText('إضافة المستلمين'));

    const sendBtn = screen.getByRole('button', { name: /إرسال البث/ });
    expect(sendBtn).not.toBeDisabled();
    await userEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('تم الإرسال')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
