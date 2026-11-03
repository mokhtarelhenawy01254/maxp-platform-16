// @vitest-environment jsdom
/**
 * Shipping Reports Page (SHIP-W7) Frontend Acceptance Tests
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ShippingReportsPage from '../ShippingReportsPage';
import { shippingReportsService } from '../../../services/shippingReportsService';

vi.mock('../../../services/shippingReportsService', () => ({
  shippingReportsService: {
    getSummary: vi.fn(),
    getByGovernorate: vi.fn(),
    getByClient: vi.fn(),
    getByCourier: vi.fn(),
  },
}));

const mockSummary = {
  success: true,
  range: { from: '2026-10-04', to: '2026-11-03' },
  rows: [
    { key: 'delivered', label: 'مسلّمة', count: 20, percentage: 66.7 },
    { key: 'returned', label: 'مرتجعة', count: 5, percentage: 16.7 },
    { key: 'pending', label: 'قيد التنفيذ', count: 5, percentage: 16.7 },
  ],
  totals: {
    total: 30,
    totalShipments: 30,
    delivered: 20,
    returned: 5,
    failed: 0,
    pending: 5,
    inProgress: 5,
    firstAttemptSuccessRate: 80,
    rtoRate: 20,
    avgDeliveryHours: 5.5,
  },
  generatedAt: '2026-11-03T17:00:00Z',
};

const mockGov = {
  success: true,
  range: { from: '2026-10-04', to: '2026-11-03' },
  rows: [
    {
      governorate: 'القاهرة',
      shipments: 20,
      totalShipments: 20,
      delivered: 16,
      returned: 4,
      failed: 0,
      successRate: 80,
      avgDeliveryHours: 4.2,
    },
    {
      governorate: 'الجيزة',
      shipments: 10,
      totalShipments: 10,
      delivered: 9,
      returned: 1,
      failed: 0,
      successRate: 90,
      avgDeliveryHours: 6.1,
    },
  ],
  totals: {
    totalShipments: 30,
    shipments: 30,
    delivered: 25,
    returned: 5,
    successRate: 83.3,
    avgDeliveryHours: 5.1,
  },
  generatedAt: '2026-11-03T17:00:00Z',
};

const mockClient = {
  success: true,
  range: { from: '2026-10-04', to: '2026-11-03' },
  rows: [
    {
      clientId: 'c1',
      merchantId: 'c1',
      clientName: 'متجر سوان',
      phone: '01011223344',
      shipments: 15,
      totalShipments: 15,
      delivered: 12,
      returned: 3,
      codCollected: 3600.5,
      collected: 3600.5,
      shippingFees: 450.25,
      fees: 450.25,
      returnFees: 45.0,
      returnedAmount: 45.0,
      net: 3105.25,
      netPayout: 3105.25,
    },
  ],
  totals: {
    totalShipments: 15,
    shipments: 15,
    delivered: 12,
    returned: 3,
    codCollected: 3600.5,
    collected: 3600.5,
    shippingFees: 450.25,
    fees: 450.25,
    returnFees: 45.0,
    returnedAmount: 45.0,
    net: 3105.25,
    netPayout: 3105.25,
  },
  generatedAt: '2026-11-03T17:00:00Z',
};

const mockCourier = {
  success: true,
  range: { from: '2026-10-04', to: '2026-11-03' },
  rows: [
    {
      courierId: 'courier-1',
      courierName: 'كابتن محمود',
      name: 'كابتن محمود',
      phone: '01234567890',
      shipments: 12,
      totalShipments: 12,
      delivered: 10,
      returned: 2,
      commissionsDue: 250.0,
      commissionsPaid: 100.0,
      due: 250.0,
      paid: 100.0,
      totalCommissions: 350.0,
    },
  ],
  totals: {
    delivered: 10,
    returned: 2,
    commissionsDue: 250.0,
    commissionsPaid: 100.0,
    totalCommissions: 350.0,
    due: 250.0,
    paid: 100.0,
  },
  generatedAt: '2026-11-03T17:00:00Z',
};

describe('SHIP-W7: ShippingReportsPage Frontend Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(shippingReportsService.getSummary).mockResolvedValue(mockSummary);
    vi.mocked(shippingReportsService.getByGovernorate).mockResolvedValue(mockGov);
    vi.mocked(shippingReportsService.getByClient).mockResolvedValue(mockClient);
    vi.mocked(shippingReportsService.getByCourier).mockResolvedValue(mockCourier);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders page title and 4 tabs', async () => {
    render(<ShippingReportsPage />);

    expect(screen.getByText('تقارير الشحن والتوصيل')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ملخص الأداء/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /المحافظات/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /العملاء/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /المناديب/ })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('إجمالي الشحنات')).toBeInTheDocument();
      expect(screen.getByText('80%')).toBeInTheDocument(); // First attempt rate
      expect(screen.getByText('20%')).toBeInTheDocument(); // RTO rate
    });
  });

  it('switches to governorate tab and displays governorate table', async () => {
    render(<ShippingReportsPage />);

    const govTabButton = screen.getByRole('button', { name: /المحافظات/ });
    fireEvent.click(govTabButton);

    await waitFor(() => {
      expect(shippingReportsService.getByGovernorate).toHaveBeenCalled();
      expect(screen.getByText('القاهرة')).toBeInTheDocument();
      expect(screen.getByText('الجيزة')).toBeInTheDocument();
    });
  });

  it('switches to client tab and verifies net payout = collected - fees - returnFees', async () => {
    render(<ShippingReportsPage />);

    const clientTabButton = screen.getByRole('button', { name: /العملاء/ });
    fireEvent.click(clientTabButton);

    await waitFor(() => {
      expect(shippingReportsService.getByClient).toHaveBeenCalled();
      expect(screen.getByText('متجر سوان')).toBeInTheDocument();
      // Net payout 3,105.25 EGP (row + footer)
      expect(screen.getAllByText(/3,105\.25/)[0]).toBeInTheDocument();
    });
  });

  it('switches to courier tab and shows commissions DUE/PAID', async () => {
    render(<ShippingReportsPage />);

    const courierTabButton = screen.getByRole('button', { name: /المناديب/ });
    fireEvent.click(courierTabButton);

    await waitFor(() => {
      expect(shippingReportsService.getByCourier).toHaveBeenCalled();
      expect(screen.getByText('كابتن محمود')).toBeInTheDocument();
      expect(screen.getAllByText(/250\.00/)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/100\.00/)[0]).toBeInTheDocument();
    });
  });

  it('triggers CSV export on button click without crashing', async () => {
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();

    render(<ShippingReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('إجمالي الشحنات')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /تصدير CSV/ });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);

    expect(URL.createObjectURL).toHaveBeenCalled();

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });
});
