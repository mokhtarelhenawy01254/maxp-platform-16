import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import CustomerLists from '../CustomerLists';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', dir: () => 'rtl' },
  }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

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

jest.mock('../../../services/broadcastService', () => ({
  broadcastService: {
    getCustomerLists: jest.fn(),
    getCustomersInListPaginated: jest.fn(),
    createCustomerList: jest.fn(),
    updateCustomerList: jest.fn(),
    deleteCustomerList: jest.fn(),
    refreshCustomerListCount: jest.fn(),
    previewCustomerListCount: jest.fn(),
  },
}));

jest.mock('../../../services/customerService', () => ({
  customerService: {
    getDistinctTags: jest.fn().mockResolvedValue([{ name: 'VIP' }, { name: 'جدد' }]),
  },
}));

const { broadcastService } = require('../../../services/broadcastService') as {
  broadcastService: {
    getCustomerLists: jest.Mock;
    getCustomersInListPaginated: jest.Mock;
    createCustomerList: jest.Mock;
    updateCustomerList: jest.Mock;
    deleteCustomerList: jest.Mock;
    refreshCustomerListCount: jest.Mock;
    previewCustomerListCount: jest.Mock;
  };
};

describe('CustomerLists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    broadcastService.getCustomerLists.mockResolvedValue(listsResponse);
    broadcastService.previewCustomerListCount.mockResolvedValue({ success: true, data: { count: 123 } });
  });

  const renderPage = () =>
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CustomerLists />
        <Toaster richColors position="bottom-left" />
      </MemoryRouter>,
    );

  test('يعرض العناوين والقوائم والإحصائيات', async () => {
    renderPage();

    expect(await screen.findByText('إدارة قوائم العملاء')).toBeInTheDocument();
    expect(screen.getByText('جميع العملاء')).toBeInTheDocument();
    expect(screen.getByText('عملاء VIP')).toBeInTheDocument();
    expect(screen.getByText('٥٠٠')).toBeInTheDocument();
    expect(screen.getByText('٤٢')).toBeInTheDocument();
  });

  test('يقوم بفلترة القوائم بالبحث', async () => {
    renderPage();
    await screen.findByText('عملاء VIP');

    const search = screen.getByPlaceholderText('ابحث في القوائم...');
    await userEvent.type(search, 'VIP');

    expect(screen.queryByText('جميع العملاء')).not.toBeInTheDocument();
    expect(screen.getByText('عملاء VIP')).toBeInTheDocument();
  });

  test('يفتح نافذة الإنشاء ويعرض معاينة العدد', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getByRole('button', { name: /قائمة جديدة/ }));
    expect(await screen.findByText('إنشاء قائمة عملاء جديدة')).toBeInTheDocument();

    await waitFor(() => {
      expect(broadcastService.previewCustomerListCount).toHaveBeenCalled();
    });
  });

  test('ينشئ قائمة جديدة عند الحفظ', async () => {
    const user = userEvent.setup();
    broadcastService.createCustomerList.mockResolvedValue({ success: true, data: { id: 'new' } });
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getByRole('button', { name: /قائمة جديدة/ }));
    await screen.findByText('إنشاء قائمة عملاء جديدة');

    const nameInput = screen.getByLabelText('اسم القائمة *');
    await user.type(nameInput, 'قائمة تجريبية');

    await user.click(screen.getByRole('button', { name: 'إنشاء القائمة' }));

    await waitFor(() => {
      expect(broadcastService.createCustomerList).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'قائمة تجريبية' }),
      );
    });
  });

  test('يفتح التعديل لقائمة مخصصة مع بياناتها', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getAllByRole('button', { name: /تعديل/ })[0]);

    expect(await screen.findByText('تعديل قائمة العملاء')).toBeInTheDocument();
    expect(screen.getByLabelText('اسم القائمة *')).toHaveValue('عملاء VIP');
  });

  test('يحذف قائمة مخصصة بعد التأكيد', async () => {
    const user = userEvent.setup();
    broadcastService.deleteCustomerList.mockResolvedValue({ success: true });
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getAllByRole('button', { name: 'حذف' })[0]);

    expect(await screen.findByText('حذف قائمة العملاء')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'حذف' }));

    await waitFor(() => {
      expect(broadcastService.deleteCustomerList).toHaveBeenCalledWith('list_vip');
    });
  });

  test('زر واتساب ينقل إلى template-broadcast مع listId', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('عملاء VIP');

    await user.click(screen.getAllByRole('button', { name: /واتساب/ })[1]);

    expect(mockNavigate).toHaveBeenCalledWith('/whatsapp/template-broadcast?listId=list_vip');
  });

  test('يعرض أعضاء القائمة في الـ Sheet مع الترقيم', async () => {
    const user = userEvent.setup();
    broadcastService.getCustomersInListPaginated.mockResolvedValue({
      success: true,
      data: [
        { id: 'c1', name: 'محمد أحمد', phone: '201000', email: '', lastActivity: '2026-01-01', status: 'active', rating: 'EXCELLENT', tags: '' },
        { id: 'c2', name: 'سارة علي', phone: '201001', email: '', lastActivity: '2026-01-02', status: 'inactive', rating: 'GOOD', tags: '' },
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
    expect(broadcastService.getCustomersInListPaginated).toHaveBeenCalledWith('list_vip', 1, 20);
  });
});
