// @vitest-environment jsdom
/**
 * Shipping Ops COD Settlements (SHIP-W5) Frontend Tests
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SettlementsPage from '../SettlementsPage';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar' },
  }),
}));

const mockSettlements = [
  {
    id: 'set-1',
    settlementNumber: 'SET-20261103-1001',
    merchantId: 'merch-1',
    status: 'APPROVED',
    periodStart: '2026-11-01T00:00:00Z',
    periodEnd: '2026-11-03T23:59:59Z',
    totalShipments: 12,
    deliveredCount: 10,
    returnedCount: 2,
    grossCOD: 5000,
    shippingFeesTotal: 600,
    codFeesTotal: 75,
    returnFeesTotal: 50,
    netPayout: 4275,
    createdAt: '2026-11-03T12:00:00Z',
    merchant: {
      id: 'merch-1',
      name: 'متجر الأناقة',
      phone: '01012345678',
    },
  },
  {
    id: 'set-2',
    settlementNumber: 'SET-20261103-1002',
    merchantId: 'merch-2',
    status: 'PAID',
    periodStart: '2026-11-01T00:00:00Z',
    periodEnd: '2026-11-03T23:59:59Z',
    totalShipments: 5,
    deliveredCount: 5,
    returnedCount: 0,
    grossCOD: 2500,
    shippingFeesTotal: 250,
    codFeesTotal: 37.5,
    returnFeesTotal: 0,
    netPayout: 2212.5,
    paymentMethod: 'INSTAPAY',
    paymentReference: 'IP-998877',
    paidAt: '2026-11-03T14:00:00Z',
    createdAt: '2026-11-03T12:30:00Z',
    merchant: {
      id: 'merch-2',
      name: 'شركة النور للملابس',
      phone: '01099998888',
    },
  },
];

const mockMerchants = [
  { id: 'merch-1', name: 'متجر الأناقة', phone: '01012345678' },
  { id: 'merch-2', name: 'شركة النور للملابس', phone: '01099998888' },
];

describe('Shipping Ops SettlementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/shipping-portal/merchants')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockMerchants }),
        });
      }
      if (url.includes('/api/v1/shipping-portal/settlements')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, settlements: mockSettlements }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders settlements table and KPI metrics properly', async () => {
    render(<SettlementsPage />);

    expect(screen.getByText('تسويات وكشوف COD لعملاء الشحن')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('SET-20261103-1001')).toBeInTheDocument();
      expect(screen.getByText('SET-20261103-1002')).toBeInTheDocument();
    });

    expect(screen.getAllByText('متجر الأناقة').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('شركة النور للملابس').length).toBeGreaterThanOrEqual(1);
  });

  it('opens preview modal when clicking new settlement button', async () => {
    render(<SettlementsPage />);

    const newBtn = screen.getByText('معاينة وإنشاء كشف جديد');
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText('معاينة وتوليد كشف COD جديد')).toBeInTheDocument();
      expect(screen.getByText('عميل الشحن *')).toBeInTheDocument();
    });
  });

  it('opens detail modal when clicking view button', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/shipping-portal/settlements/set-1')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                ...mockSettlements[0],
                lines: [
                  {
                    id: 'line-1',
                    shipmentId: 'ship-101',
                    codAmount: 500,
                    collectedAmount: 500,
                    shippingFee: 50,
                    codFee: 10,
                    returnFee: 0,
                    net: 440,
                    shipment: {
                      barcode: 'BC-101',
                      recipientName: 'أحمد محمود',
                      destinationGovernorate: 'القاهرة',
                      status: 'DELIVERED',
                    },
                  },
                ],
              },
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, settlements: mockSettlements }),
      });
    });

    render(<SettlementsPage />);

    await waitFor(() => {
      expect(screen.getByText('SET-20261103-1001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByTitle('عرض تفاصيل الأسطر');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('أسطر الشحنات المدرجة (1 شحنة)')).toBeInTheDocument();
      expect(screen.getByText('BC-101')).toBeInTheDocument();
      expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
    });
  });
});
