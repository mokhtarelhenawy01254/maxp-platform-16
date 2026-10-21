// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CourierDuesPage from '../CourierDuesPage';
import courierService from '../../../../services/courierService';

vi.mock('../../../../services/courierService', () => ({
  default: {
    getCommissions: vi.fn(),
    getTreasuryAccounts: vi.fn(),
    payCommissions: vi.fn(),
  },
}));

vi.mock('../../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} EGP`,
  }),
}));

const mockSummary = [
  {
    courierId: 'cour-1',
    name: 'محمود عبد الرحيم',
    phone: '01012345678',
    dueAmount: 850,
    dueCount: 4,
    paidAmount: 2400,
    paidCount: 12,
  },
  {
    courierId: 'cour-2',
    name: 'خالد السعيد',
    phone: '01123456789',
    dueAmount: 0,
    dueCount: 0,
    paidAmount: 1800,
    paidCount: 9,
  },
];

const mockEntries = [
  {
    id: 'comm-101',
    courierId: 'cour-1',
    amount: 150,
    commissionType: 'FIXED_PER_ORDER',
    status: 'DUE',
    notes: 'مأمورية التوصيل رقم 4421',
    createdAt: '2026-10-18T10:00:00Z',
    courier: {
      id: 'cour-1',
      name: 'محمود عبد الرحيم',
      phone: '01012345678',
    },
  },
];

const mockTreasuryAccounts = [
  { id: 'acc-main', name: 'الخزينة الرئيسية', balance: 50000 },
];

describe('CourierDuesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (courierService.getCommissions as any).mockResolvedValue({
      success: true,
      summary: mockSummary,
      data: mockEntries,
      pagination: { total: 1, page: 1, pages: 1 },
    });
    (courierService.getTreasuryAccounts as any).mockResolvedValue({
      success: true,
      data: mockTreasuryAccounts,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders header, telemetry metrics, and courier summary', async () => {
    render(
      <MemoryRouter>
        <CourierDuesPage />
      </MemoryRouter>
    );

    expect(screen.getByText('مستحقات وعمولات المناديب')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('محمود عبد الرحيم').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('خالد السعيد')).toBeInTheDocument();
    });

    // Check KPI metric ribbon
    expect(screen.getAllByText('850 EGP').length).toBeGreaterThanOrEqual(1); // totalDue
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // metrics count
  });

  it('opens pay commission modal and triggers payout', async () => {
    (courierService.payCommissions as any).mockResolvedValue({
      success: true,
      message: 'تم صرف المستحقات بنجاح',
    });

    render(
      <MemoryRouter>
        <CourierDuesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('محمود عبد الرحيم').length).toBeGreaterThanOrEqual(1);
    });

    const payBtn = screen.getByText('صرف المستحقات');
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(screen.getByText('صرف مستحقات محمود عبد الرحيم')).toBeInTheDocument();
      expect(screen.getByText(/الخزينة الرئيسية/)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByText('تأكيد الصرف');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(courierService.payCommissions).toHaveBeenCalledWith('cour-1', {
        treasuryAccountId: 'acc-main',
      });
    });
  });

  it('changes status filter and re-fetches commissions', async () => {
    render(
      <MemoryRouter>
        <CourierDuesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('تفاصيل قيود العمولات')).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue('المعلقة فقط (DUE)');
    fireEvent.change(select, { target: { value: 'ALL' } });

    await waitFor(() => {
      expect(courierService.getCommissions).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ALL',
        })
      );
    });
  });
});
