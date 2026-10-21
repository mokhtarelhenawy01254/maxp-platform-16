/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import CustomerLists from '../CustomerLists';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', dir: () => 'rtl' },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const listsResponse = {
  success: true,
  data: [
    {
      id: 'all',
      name: 'جميع العملاء',
      description: 'جميع العملاء النشطين',
      count: 500,
      criteria: { type: 'all' },
      isDefault: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'list_vip',
      name: 'عملاء VIP',
      description: 'كبار العملاء',
      count: 42,
      criteria: { type: 'orderStatus', status: 'DELIVERED', days: 30 },
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-05T00:00:00Z',
    },
  ],
};

vi.mock('../../../services/broadcastService', () => ({
  broadcastService: {
    getCustomerLists: vi.fn(),
    getCustomersInListPaginated: vi.fn(),
    createCustomerList: vi.fn(),
    updateCustomerList: vi.fn(),
    deleteCustomerList: vi.fn(),
    refreshCustomerListCount: vi.fn(),
    previewCustomerListCount: vi.fn(),
  },
}));

vi.mock('../../../services/customerService', () => ({
  customerService: {
    getDistinctTags: vi.fn().mockResolvedValue([{ name: 'VIP' }, { name: 'جدد' }]),
  },
}));

import { broadcastService } from '../../../services/broadcastService';

const mockBroadcastService = broadcastService as unknown as {
  getCustomerLists: ReturnType<typeof vi.fn>;
  getCustomersInListPaginated: ReturnType<typeof vi.fn>;
  createCustomerList: ReturnType<typeof vi.fn>;
  updateCustomerList: ReturnType<typeof vi.fn>;
  deleteCustomerList: ReturnType<typeof vi.fn>;
  refreshCustomerListCount: ReturnType<typeof vi.fn>;
  previewCustomerListCount: ReturnType<typeof vi.fn>;
};

describe('CustomerLists', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockBroadcastService.getCustomerLists.mockResolvedValue(listsResponse);
    mockBroadcastService.previewCustomerListCount.mockResolvedValue({ success: true, data: { count: 123 } });
  });

  const renderPage = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CustomerLists />
        <Toaster richColors position="bottom-left" />
      </MemoryRouter>,
    );

  it('يعرض العناوين والقوائم والإحصائيات', async () => {
    renderPage();

    expect(await screen.findByText('إدارة قوائم العملاء')).toBeInTheDocument();
    expect(screen.getByText('جميع العملاء')).toBeInTheDocument();
    expect(screen.getByText('عملاء VIP')).toBeInTheDocument();
    expect(screen.getByText('٥٠٠')).toBeInTheDocument();
    expect(screen.getByText('٤٢')).toBeInTheDocument();
  });

  it('يقوم بفلترة القوائم بالبحث', async () => {
    renderPage();
    await screen.findByText('عملاء VIP');

    const search = screen.getByPlaceholderText('ابحث في القوائم...');
    await userEvent.type(search, 'VIP');

    expect(screen.queryByText('جميع العملاء')).not.toBeInTheDocument();
    expect(screen.getByText('عملاء VIP')).toBeInTheDocument();
  });

  it('يفتح نافذة الإنشاء ويعرض معاينة العدد', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getByRole('button', { name: /قائمة جديدة/ }));
    expect(await screen.findByText('إنشاء قائمة عملاء جديدة')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockBroadcastService.previewCustomerListCount).toHaveBeenCalled();
    });
  });

  it('ينشئ قائمة جديدة عند الحفظ', async () => {
    const user = userEvent.setup();
    mockBroadcastService.createCustomerList.mockResolvedValue({ success: true, data: { id: 'new' } });
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getByRole('button', { name: /قائمة جديدة/ }));
    await screen.findByText('إنشاء قائمة عملاء جديدة');

    const nameInput = screen.getByLabelText('اسم القائمة *');
    await user.type(nameInput, 'قائمة تجريبية');

    await user.click(screen.getByRole('button', { name: 'إنشاء القائمة' }));

    await waitFor(() => {
      expect(mockBroadcastService.createCustomerList).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'قائمة تجريبية' }),
      );
    });
  });

  it('يفتح التعديل لقائمة مخصصة مع بياناتها', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getAllByRole('button', { name: /تعديل/ })[0]);

    expect(await screen.findByText('تعديل قائمة العملاء')).toBeInTheDocument();
    expect(screen.getByLabelText('اسم القائمة *')).toHaveValue('عملاء VIP');
  });

  it('يحذف قائمة مخصصة بعد التأكيد', async () => {
    const user = userEvent.setup();
    mockBroadcastService.deleteCustomerList.mockResolvedValue({ success: true });
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getAllByRole('button', { name: 'حذف' })[0]);

    expect(await screen.findByText('حذف قائمة العملاء')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'حذف' }));

    await waitFor(() => {
      expect(mockBroadcastService.deleteCustomerList).toHaveBeenCalledWith('list_vip');
    });
  });

  it('زر واتساب ينقل إلى template-broadcast مع listId', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getAllByRole('button', { name: /واتساب/ })[1]);

    expect(mockNavigate).toHaveBeenCalledWith('/whatsapp/template-broadcast?listId=list_vip');
  });

  it('يعرض أعضاء القائمة في الـ Sheet مع الترقيم', async () => {
    const user = userEvent.setup();
    mockBroadcastService.getCustomersInListPaginated.mockResolvedValue({
      success: true,
      data: [
        { id: 'c1', name: 'محمد أحمد', phone: '201000', email: '', lastActivity: '2026-01-01', status: 'active', rating: 'EXCELLENT', tags: '', totalSpent: 5000, ordersCount: 5, rfmScore: 76, rfmTier: 'gold' },
        { id: 'c2', name: 'سارة علي', phone: '201001', email: '', lastActivity: '2026-01-02', status: 'inactive', rating: 'GOOD', tags: '', totalSpent: 100, ordersCount: 1, rfmScore: 10, rfmTier: 'lead' },
      ],
      total: 2,
      page: 1,
      limit: 20,
      hasMore: false,
    });
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getAllByRole('button', { name: /الأعضاء/ })[1]);

    expect(await screen.findByText('محمد أحمد')).toBeInTheDocument();
    expect(screen.getByText('سارة علي')).toBeInTheDocument();
    expect(screen.getByText(/ذهبي/)).toBeInTheDocument();
    expect(mockBroadcastService.getCustomersInListPaginated).toHaveBeenCalledWith('list_vip', 1, 20, '');
  });

  it('ينسخ قائمة مخصصة (Duplicate)', async () => {
    const user = userEvent.setup();
    mockBroadcastService.createCustomerList.mockResolvedValue({ success: true, data: { id: 'copy' } });
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getAllByRole('button', { name: /نسخ/ })[0]);

    await waitFor(() => {
      expect(mockBroadcastService.createCustomerList).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'عملاء VIP (نسخة)' }),
      );
    });
  });

  it('يعرض قوالب RFM في نافذة الإنشاء', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getByRole('button', { name: /قائمة جديدة/ }));
    await screen.findByText('إنشاء قائمة عملاء جديدة');

    expect(screen.getByText('أفضل العملاء')).toBeInTheDocument();
    expect(screen.getByText('العملاء الأوفياء')).toBeInTheDocument();
    expect(screen.getByText('معرضون للفقدان')).toBeInTheDocument();
    expect(screen.getByText('عملاء جدد')).toBeInTheDocument();
  });

  it('اختيار قالب RFM يضبط المعايير ويعاين العدد', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getByRole('button', { name: /قائمة جديدة/ }));
    await screen.findByText('إنشاء قائمة عملاء جديدة');

    await user.click(screen.getByText('أفضل العملاء'));

    await waitFor(() => {
      expect(mockBroadcastService.previewCustomerListCount).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'preset', preset: 'champions' }),
      );
    });
  });
});
