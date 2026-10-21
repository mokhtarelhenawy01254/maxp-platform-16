/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CustomerSegments from '../CustomerSegments';
import { apiClient } from '../../../services/apiClient';
import analyticsService from '../../../services/analyticsService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', dir: () => 'rtl' },
  }),
}));

vi.mock('../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../services/analyticsService', () => ({
  default: {
    getCustomerQualityAnalytics: vi.fn(),
  },
}));

const mockQualityData = {
  success: true,
  data: {
    customers: [
      {
        customerId: 'cust-1',
        customerName: 'أحمد محمود',
        customerPhone: '01011112222',
        totalOrders: 5,
        totalSpent: 4500,
        score: 95,
        tier: 'VIP',
      },
      {
        customerId: 'cust-2',
        customerName: 'سارة خالد',
        customerPhone: '01033334444',
        totalOrders: 2,
        totalSpent: 1200,
        score: 60,
        tier: 'متوسط',
      },
    ],
    totalCustomers: 2,
    tierCounts: { VIP: 1, متوسط: 1 },
    avgCustomerScore: '77.5',
  },
};

const mockLoyaltyCustomers = {
  data: {
    data: [
      {
        id: 'loyalty-1',
        customer: { id: 'cust-1', firstName: 'أحمد', lastName: 'محمود' },
        program: { id: 'prog-1', name: 'برنامج الولاء', nameAr: 'برنامج الولاء' },
        tier: { id: 'tier-gold', name: 'Gold', nameAr: 'ذهبي' },
        currentPoints: 250,
        totalEarned: 500,
        totalRedeemed: 250,
        lastActivity: '2026-02-01T12:00:00Z',
        status: 'ACTIVE',
      },
    ],
  },
};

const mockLoyaltyTiers = {
  data: {
    data: [
      {
        id: 'tier-gold',
        name: 'Gold',
        nameAr: 'ذهبي',
        minPoints: 200,
        maxPoints: 1000,
        benefits: ['خصم 10%'],
        color: '#f59e0b',
        icon: 'crown',
        customersCount: 1,
        programId: 'prog-1',
      },
    ],
  },
};

const mockCustomersList = {
  data: {
    data: [
      {
        id: 'cust-1',
        firstName: 'أحمد',
        lastName: 'محمود',
        email: 'ahmed@test.com',
        phone: '01011112222',
        tags: ['VIP', 'دائم'],
        status: 'ACTIVE',
        customerRating: 'EXCELLENT',
        successScore: 90,
      },
      {
        id: 'cust-2',
        firstName: 'سارة',
        lastName: 'خالد',
        email: 'sara@test.com',
        phone: '01033334444',
        tags: [],
        status: 'ACTIVE',
        customerRating: 'GOOD',
        successScore: 65,
      },
    ],
  },
};

const mockLeadCategories = {
  data: {
    data: [
      {
        id: 'cat-1',
        name: 'عملاء محتملون',
        color: '#6366f1',
        sortOrder: 1,
        autoFollowUp: true,
        autoPromoteCategoryId: null,
        triggerFlowId: null,
        triggerFlow: null,
        contactCount: 15,
        activeJourneyCount: 0,
      },
    ],
  },
};

const mockTags = {
  data: {
    data: [
      { name: 'VIP', count: 12 },
      { name: 'جدد', count: 4 },
    ],
  },
};

describe('CustomerSegments Component', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(analyticsService.getCustomerQualityAnalytics).mockResolvedValue(mockQualityData);

    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.includes('/hr/customer-loyalty/customers')) return mockLoyaltyCustomers;
      if (url.includes('/hr/customer-loyalty/tiers')) return mockLoyaltyTiers;
      if (url.includes('/customers?limit=200')) return mockCustomersList;
      if (url.includes('/whatsapp/lead-categories')) return mockLeadCategories;
      if (url.includes('/customers/tags/distinct')) return mockTags;
      if (url.includes('/whatsapp/automation/flows')) return { data: { data: [] } };
      return { data: { data: [] } };
    });
  });

  it('يعرض العنوان وشريط الأرقام الرئيسية وقائمة العملاء الموحدة', async () => {
    render(<CustomerSegments />);

    expect(await screen.findByText('مركز تقسيم العملاء')).toBeInTheDocument();
    expect(screen.getByText('إدارة شاملة لتصنيفات العملاء وجودتهم وولائهم')).toBeInTheDocument();

    // Verify customers rendered in table
    expect(await screen.findByText('أحمد محمود')).toBeInTheDocument();
    expect(screen.getByText('سارة خالد')).toBeInTheDocument();
  });

  it('يتنقل بين التبويبات بنجاح (الجودة، الولاء، التصنيفات، الوسوم)', async () => {
    render(<CustomerSegments />);
    await screen.findByText('أحمد محمود');

    // Switch to Quality tab
    const qualityTabButton = screen.getByRole('button', { name: /الجودة/ });
    fireEvent.click(qualityTabButton);
    expect(await screen.findByText('توزيع مستويات الجودة')).toBeInTheDocument();

    // Switch to Loyalty tab
    const loyaltyTabButton = screen.getByRole('button', { name: /الولاء/ });
    fireEvent.click(loyaltyTabButton);
    expect(await screen.findByText('أعضاء الولاء النشطون')).toBeInTheDocument();

    // Switch to Categories tab
    const categoriesTabButton = screen.getByRole('button', { name: /تصنيفات الليدات/ });
    fireEvent.click(categoriesTabButton);
    expect(await screen.findByText('عملاء محتملون')).toBeInTheDocument();

    // Switch to Tags tab
    const tagsTabButton = screen.getByRole('button', { name: /الوسوم/ });
    fireEvent.click(tagsTabButton);
    expect(await screen.findByText('عدد العملاء')).toBeInTheDocument();
  });

  it('يقوم بفلترة العملاء في التبويب الرئيسي بالبحث', async () => {
    render(<CustomerSegments />);
    await screen.findByText('أحمد محمود');

    const searchInput = screen.getByPlaceholderText('ابحث باسم العميل، إيميل، رقم الهاتف...');
    fireEvent.change(searchInput, { target: { value: 'أحمد' } });

    await waitFor(() => {
      expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
      expect(screen.queryByText('سارة خالد')).not.toBeInTheDocument();
    });
  });
});
