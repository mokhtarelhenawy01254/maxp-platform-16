/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CustomerPointsCenter from '../CustomerPointsCenter';
import { apiClient } from '../../../services/apiClient';

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockCustomersRes = {
  data: {
    data: [
      {
        id: 'rec-1',
        customer: {
          id: 'cust-1',
          firstName: 'إبراهيم',
          lastName: 'سليمان',
          email: 'ibrahim@test.com',
          phone: '01011112222',
        },
        program: {
          id: 'prog-1',
          name: 'VIP Club',
          nameAr: 'نادي النخبة',
          pointsPerAmount: 1,
          expiryMonths: 12,
          status: 'ACTIVE',
        },
        tier: {
          id: 'tier-gold',
          name: 'Gold',
          nameAr: 'المستوى الذهبي',
        },
        currentPoints: 450,
        totalEarned: 900,
        totalRedeemed: 450,
        lastActivity: '2026-02-15T10:00:00Z',
        status: 'ACTIVE',
      },
      {
        id: 'rec-2',
        customer: {
          id: 'cust-2',
          firstName: 'منى',
          lastName: 'فؤاد',
          email: 'mona@test.com',
          phone: '01055556666',
        },
        program: {
          id: 'prog-1',
          name: 'VIP Club',
          nameAr: 'نادي النخبة',
          pointsPerAmount: 1,
          expiryMonths: 12,
          status: 'ACTIVE',
        },
        tier: {
          id: 'tier-silver',
          name: 'Silver',
          nameAr: 'المستوى الفضي',
        },
        currentPoints: 120,
        totalEarned: 120,
        totalRedeemed: 0,
        lastActivity: '2026-02-10T10:00:00Z',
        status: 'ACTIVE',
      },
    ],
  },
};

const mockProgramsRes = {
  data: {
    data: [
      {
        id: 'prog-1',
        name: 'VIP Club',
        nameAr: 'نادي النخبة',
        pointsPerAmount: 1,
        expiryMonths: 12,
        status: 'ACTIVE',
      },
    ],
  },
};

const mockTiersRes = {
  data: {
    data: [
      {
        id: 'tier-silver',
        programId: 'prog-1',
        name: 'Silver',
        nameAr: 'المستوى الفضي',
        minPoints: 100,
        maxPoints: 300,
      },
      {
        id: 'tier-gold',
        programId: 'prog-1',
        name: 'Gold',
        nameAr: 'المستوى الذهبي',
        minPoints: 301,
        maxPoints: 1000,
      },
    ],
  },
};

describe('CustomerPointsCenter Component', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.includes('/hr/customer-loyalty/customers')) return mockCustomersRes;
      if (url.includes('/hr/customer-loyalty/programs')) return mockProgramsRes;
      if (url.includes('/hr/customer-loyalty/tiers')) return mockTiersRes;
      if (url.includes('/customers?limit=200')) return { data: { data: [] } };
      return { data: { data: [] } };
    });
  });

  it('يعرض العنوان وشريط الإحصائيات وجدول العملاء وملف العميل المختار', async () => {
    render(<CustomerPointsCenter />);

    expect(await screen.findByText('مركز نقاط العملاء')).toBeInTheDocument();
    expect(screen.getByText('لوحة شاملة لنقاط العملاء ومستوياتهم وحملات حفظ الولاء.')).toBeInTheDocument();

    // Verify customers rendered in table / profile
    const elements = await screen.findAllByText('إبراهيم سليمان');
    expect(elements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('منى فؤاد')).toBeInTheDocument();

    // Verify selected customer profile header
    expect(screen.getByText('ملف العميل المختار')).toBeInTheDocument();
  });

  it('يقوم بفلترة العملاء بالبحث', async () => {
    render(<CustomerPointsCenter />);
    await screen.findAllByText('إبراهيم سليمان');

    const searchInput = screen.getByPlaceholderText('ابحث باسم العميل، إيميل، رقم الهاتف...');
    fireEvent.change(searchInput, { target: { value: 'منى' } });

    await waitFor(() => {
      expect(screen.getByText('منى فؤاد')).toBeInTheDocument();
    });

    // Click on Mona to select her
    fireEvent.click(screen.getByText('منى فؤاد'));

    await waitFor(() => {
      expect(screen.queryByText('إبراهيم سليمان')).not.toBeInTheDocument();
    });
  });

  it('يفتح نافذة إضافة عميل لبرنامج ولاء', async () => {
    render(<CustomerPointsCenter />);
    await screen.findAllByText('إبراهيم سليمان');

    const enrollButton = screen.getByRole('button', { name: /إضافة عميل/ });
    fireEvent.click(enrollButton);

    expect(await screen.findByText('إضافة عميل لبرنامج ولاء')).toBeInTheDocument();
    expect(screen.getByText('برنامج الولاء المستهدف')).toBeInTheDocument();
  });

  it('يقوم بإرسال عملية إضافة نقاط بنجاح', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });

    render(<CustomerPointsCenter />);
    await screen.findAllByText('إبراهيم سليمان');

    const pointsInput = screen.getByPlaceholderText('أدخل عدد النقاط المُنفذة');
    fireEvent.change(pointsInput, { target: { value: '50' } });

    const submitBtn = screen.getByRole('button', { name: /تأكيد العملية/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/hr/customer-loyalty/add-points',
        expect.objectContaining({
          customerId: 'cust-1',
          programId: 'prog-1',
          points: 50,
        }),
      );
    });
  });
});
