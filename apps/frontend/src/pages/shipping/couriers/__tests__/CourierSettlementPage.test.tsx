// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CourierSettlementPage from '../CourierSettlementPage';
import courierService from '../../../../services/courierService';

vi.mock('../../../../services/courierService', () => ({
  default: {
    getDeliveryRuns: vi.fn(),
    getTreasuryAccounts: vi.fn(),
    getFleetSettings: vi.fn(),
    getDeliveryRun: vi.fn(),
    settleDeliveryRun: vi.fn(),
  },
}));

vi.mock('../../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} EGP`,
  }),
}));

vi.mock('../../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: (val: string) => val,
  }),
}));

const mockRuns = [
  {
    id: 'run-101',
    runNumber: 'RUN-2026-101',
    status: 'COMPLETED',
    totalCODExpected: 1800,
    totalCODCollected: 1800,
    courier: { id: 'c-1', name: 'أحمد سعيد' },
    shipments: [
      {
        id: 'shp-1',
        status: 'DELIVERED',
        collectedAmount: 1800,
        order: { id: 'ord-1', total: 1800 },
      },
    ],
  },
];

const mockTreasuryAccounts = [
  { id: 'acc-1', name: 'الخزينة النقدية الرئيسية', type: 'CASH', balance: 25000 },
];

describe('CourierSettlementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (courierService.getDeliveryRuns as any).mockResolvedValue({
      success: true,
      data: mockRuns,
      pagination: { total: 1, page: 1, pages: 1 },
    });
    (courierService.getTreasuryAccounts as any).mockResolvedValue({
      success: true,
      data: mockTreasuryAccounts,
    });
    (courierService.getFleetSettings as any).mockResolvedValue({
      remittance: {
        requireTreasuryNoteOnVariance: false,
        shortagePolicy: 'DEDUCT_FROM_COURIER',
        allowPartialRemittance: true,
      },
    });
    (courierService.getDeliveryRun as any).mockResolvedValue({
      success: true,
      data: mockRuns[0],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders header, navigation links, and runs list', async () => {
    render(
      <MemoryRouter>
        <CourierSettlementPage />
      </MemoryRouter>
    );

    expect(screen.getByText('التوريد المالي وتسوية ورديات التوصيل')).toBeInTheDocument();
    expect(screen.getByText('شيتات المانيفست')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('RUN-2026-101')).toBeInTheDocument();
      expect(screen.getByText(/أحمد سعيد/)).toBeInTheDocument();
    });
  });

  it('loads run details and enables settlement confirmation', async () => {
    (courierService.settleDeliveryRun as any).mockResolvedValue({
      success: true,
      message: 'تمت تسوية الوردية بنجاح',
    });

    render(
      <MemoryRouter>
        <CourierSettlementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('RUN-2026-101')).toBeInTheDocument();
    });

    // Check that settlement form is displayed for the selected run
    await waitFor(() => {
      expect(screen.getByText('تأكيد التوريد وإيداع المبلغ في الخزينة')).toBeInTheDocument();
    });

    const settleBtn = screen.getByText('تأكيد التوريد وإيداع المبلغ في الخزينة');
    fireEvent.click(settleBtn);

    await waitFor(() => {
      expect(courierService.settleDeliveryRun).toHaveBeenCalledWith('run-101', {
        treasuryAccountId: 'acc-1',
        actualCashReceived: 1800,
        notes: undefined,
      });
    });
  });
});
