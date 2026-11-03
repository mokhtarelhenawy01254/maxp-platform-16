// @vitest-environment jsdom
/**
 * Shipping Client Settlements (SHIP-W5) Frontend Tests
 * Verifies client portal statement rendering and zero internal cost fields
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ClientSettlementsPage from '../ClientSettlementsPage';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockClientSettlements = [
  {
    id: 'set-client-1',
    settlementNumber: 'SET-20261103-5555',
    status: 'PAID',
    periodStart: '2026-11-01T00:00:00Z',
    periodEnd: '2026-11-03T23:59:59Z',
    totalShipments: 8,
    deliveredCount: 7,
    returnedCount: 1,
    grossCOD: 4200,
    shippingFeesTotal: 420,
    codFeesTotal: 63,
    returnFeesTotal: 25,
    netPayout: 3692,
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: 'WIRE-992211',
    paidAt: '2026-11-03T15:00:00Z',
    createdAt: '2026-11-03T12:00:00Z',
  },
];

describe('ClientSettlementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/shipping-client/settlements/set-client-1')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                ...mockClientSettlements[0],
                lines: [
                  {
                    id: 'line-1',
                    shipmentId: 'ship-c-1',
                    barcode: 'TRK-987654',
                    recipientName: 'سارة إبراهيم',
                    destinationGovernorate: 'الإسكندرية',
                    status: 'DELIVERED',
                    codAmount: 600,
                    collectedAmount: 600,
                    shippingFee: 60,
                    codFee: 9,
                    returnFee: 0,
                    net: 531,
                  },
                ],
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            settlements: mockClientSettlements,
          }),
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders client statements table and totals', async () => {
    render(<ClientSettlementsPage />);

    expect(screen.getByText('كشوف COD والتسويات الدورية')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('SET-20261103-5555')).toBeInTheDocument();
    });

    expect(screen.getAllByText('تم التوريد والصرف').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('8')).toBeInTheDocument(); // total shipments
  });

  it('opens detail modal and displays lines with zero internal costs', async () => {
    render(<ClientSettlementsPage />);

    await waitFor(() => {
      expect(screen.getByText('SET-20261103-5555')).toBeInTheDocument();
    });

    const viewBtn = screen.getByTitle('عرض الأسطر والتفاصيل');
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText('شحنات الكشف (1)')).toBeInTheDocument();
      expect(screen.getByText('TRK-987654')).toBeInTheDocument();
      expect(screen.getByText('سارة إبراهيم')).toBeInTheDocument();
    });

    // Verify internal cost keywords are NOT displayed
    expect(screen.queryByText(/تكلفة الشاحن/i)).toBeNull();
    expect(screen.queryByText(/internal cost/i)).toBeNull();
    expect(screen.queryByText(/carrier cost/i)).toBeNull();
  });
});
