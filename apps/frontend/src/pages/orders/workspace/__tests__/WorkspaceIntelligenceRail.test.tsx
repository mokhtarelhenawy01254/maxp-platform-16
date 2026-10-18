import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { WorkspaceIntelligenceRail } from '../WorkspaceIntelligenceRail';
import type { WorkspaceOrder, WorkspaceStats } from '../types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar' },
  }),
}));

jest.mock('../../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

jest.mock('../../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: () => '18 أكتوبر 2026',
    getTimeAgo: () => 'منذ ساعتين',
  }),
}));

const mockCustomerHistory = {
  stats: {
    totalOrders: 3,
    deliveredCount: 2,
    cancelledCount: 1,
    returnedCount: 0,
    inProgressCount: 0,
    pendingCount: 0,
    deliverySuccessRate: 66.7,
    totalDeliveredSpent: 1200,
    totalAllOrdersValue: 1800,
    averageOrderValue: 600,
    firstOrderDate: '2026-08-01T10:00:00.000Z',
    lastOrderDate: '2026-10-18T10:00:00.000Z',
    isRepeatCustomer: true,
  },
  orders: [
    {
      id: 'ord-101',
      orderNumber: 'ORD-9901',
      createdAt: '2026-10-18T10:00:00.000Z',
      status: 'pending',
      category: 'PENDING',
      total: 620,
      currency: 'EGP',
      itemsCount: 1,
      items: [{ id: 'it-1', name: 'كوتشي فلات أسود', quantity: 1, price: 550 }],
      isCurrentOrder: true,
    },
    {
      id: 'ord-100',
      orderNumber: 'ORD-8850',
      createdAt: '2026-09-15T12:00:00.000Z',
      status: 'delivered',
      category: 'DELIVERED',
      total: 580,
      currency: 'EGP',
      itemsCount: 1,
      items: [{ id: 'it-2', name: 'سنيكرز أبيض', quantity: 1, price: 580 }],
      isCurrentOrder: false,
    },
  ],
  customerSummary: {
    matchedBy: ['phone'],
    customerName: 'كريم يوسف',
    phone: '01098765432',
  },
};

jest.mock('../../../../services/apiClient', () => ({
  apiClient: {
    get: jest.fn().mockImplementation((url: string) => {
      if (url.includes('/customer-history')) {
        return Promise.resolve({ data: { success: true, data: mockCustomerHistory } });
      }
      return Promise.resolve({ data: { success: true } });
    }),
    put: jest.fn().mockResolvedValue({ data: { success: true } }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('WorkspaceIntelligenceRail', () => {
  const mockOrder: WorkspaceOrder = {
    id: 'ord-101',
    orderNumber: 'ORD-9901',
    customerName: 'كريم يوسف',
    customerPhone: '01098765432',
    governorate: 'الإسكندرية',
    city: 'سموحة',
    total: 620,
    subtotal: 550,
    shipping: 70,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    callAttempts: 0,
    lastCallAt: null,
    followUpDate: null,
    customerStats: {
      deliveryRate: 75,
      totalDelivered: 2,
      totalOrdersCount: 3,
      customerRating: 'GOOD',
    },
    items: [],
  };

  const mockStats: WorkspaceStats = {
    total: 26,
    pending: 19,
    followup: 0,
    confirmed: 1,
    cancelled: 6,
  };

  it('renders customer rating and contact information for the active order', async () => {
    render(
      <BrowserRouter>
        <WorkspaceIntelligenceRail
          order={mockOrder}
          perspective="operator"
          stats={mockStats}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('تقييم العميل')).toBeInTheDocument();
    expect(screen.getByText('كريم يوسف')).toBeInTheDocument();
    expect(screen.getByText('01098765432')).toBeInTheDocument();
  });

  it('fetches and renders customer order history telemetry and past orders', async () => {
    render(
      <BrowserRouter>
        <WorkspaceIntelligenceRail
          order={mockOrder}
          perspective="operator"
          stats={mockStats}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('سجل طلبات العميل')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('#ORD-9901')).toBeInTheDocument();
      expect(screen.getByText('#ORD-8850')).toBeInTheDocument();
    });

    expect(screen.getByText('الطلب الحالي')).toBeInTheDocument();
  });

  it('renders live queue telemetry when in supervisor perspective', async () => {
    render(
      <BrowserRouter>
        <WorkspaceIntelligenceRail
          order={mockOrder}
          perspective="supervisor"
          stats={mockStats}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('تيليمتري الطابور الحي')).toBeInTheDocument();
    expect(screen.getByText('الطلبات المعلقة')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('إدارة توزيع الفريق')).toBeInTheDocument();
  });

  it('does not render supervisor telemetry or settings link when in operator perspective', () => {
    render(
      <BrowserRouter>
        <WorkspaceIntelligenceRail
          order={mockOrder}
          perspective="operator"
          stats={mockStats}
        />
      </BrowserRouter>
    );

    expect(screen.queryByText('تيليمتري الطابور الحي')).not.toBeInTheDocument();
    expect(screen.queryByText('ضبط إعدادات التوزيع')).not.toBeInTheDocument();
  });

  it('renders empty state when no order is selected and not in telemetry mode', () => {
    render(
      <BrowserRouter>
        <WorkspaceIntelligenceRail
          order={null}
          perspective="operator"
          stats={mockStats}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('لم يتم تحديد طلب')).toBeInTheDocument();
  });
});
