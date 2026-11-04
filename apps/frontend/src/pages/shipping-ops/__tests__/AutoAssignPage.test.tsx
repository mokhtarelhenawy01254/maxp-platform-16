// @vitest-environment jsdom
/**
 * Auto-Assign Page (SHIP-W8) Frontend Tests
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AutoAssignPage from '../AutoAssignPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar' },
  }),
}));

const mockCouriers = [
  {
    id: 'c1',
    name: 'كابتن محمود',
    phone: '01011112222',
    status: 'AVAILABLE',
    zones: ['القاهرة', 'الجيزة'],
    currentLoad: 2,
  },
  {
    id: 'c2',
    name: 'كابتن حسام',
    phone: '01033334444',
    status: 'AVAILABLE',
    zones: ['الإسكندرية'],
    currentLoad: 0,
  },
];

const mockSuggestions = {
  success: true,
  strategy: 'LEAST_LOAD',
  assignments: [
    {
      shipmentId: 'ship-101',
      trackingNumber: 'TRK-101',
      recipientName: 'عميل القاهرة',
      destinationGovernorate: 'القاهرة',
      destinationCity: 'المعادي',
      codAmount: 350,
      courierId: 'c1',
      courierName: 'كابتن محمود',
      reason: 'MATCH_ZONE',
    },
  ],
  unassigned: [
    {
      shipmentId: 'ship-102',
      destinationGovernorate: 'أسوان',
      reason: 'NO_COURIER_IN_ZONE',
    },
  ],
};

describe('AutoAssignPage (SHIP-W8)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn((url: string, opts?: any) => {
      if (url.includes('/api/v1/shipping-assign/couriers')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockCouriers }),
        });
      }
      if (url.includes('/api/v1/shipping-assign/suggest')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSuggestions),
        });
      }
      if (url.includes('/api/v1/shipping-assign/apply')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, assignedCount: 1, failedCount: 0 }),
        });
      }
      if (url.includes('/api/v1/shipping-assign/auto')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, assignedCount: 1, failedCount: 0, assignments: mockSuggestions.assignments, unassigned: [] }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders page header and loads couriers', async () => {
    render(<AutoAssignPage />);
    expect(screen.getByText('التوزيع التلقائي للشحنات على المناديب')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/2 مندوب نشط متاح للتوزيع/)).toBeInTheDocument();
    });
  });

  it('suggests distribution and displays suggested & unassigned badges', async () => {
    render(<AutoAssignPage />);
    const suggestBtn = screen.getByText('اقترح التوزيع');
    fireEvent.click(suggestBtn);

    await waitFor(() => {
      expect(screen.getByText('TRK-101')).toBeInTheDocument();
      expect(screen.getByText('المعادي')).toBeInTheDocument();
      expect(screen.getAllByText('مقترح').length).toBeGreaterThan(0);
      expect(screen.getByText('لا يوجد مندوب يغطي المحافظة')).toBeInTheDocument();
      expect(screen.getAllByText('فشل').length).toBeGreaterThan(0);
    });
  });

  it('allows manual courier adjustment and applies distribution with مُسند badge', async () => {
    render(<AutoAssignPage />);
    fireEvent.click(screen.getByText('اقترح التوزيع'));

    await waitFor(() => {
      expect(screen.getByText('TRK-101')).toBeInTheDocument();
    });

    const applyBtn = screen.getByText(/تطبيق التوزيع/);
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.getByText(/تم إسناد 1 شحنة بنجاح/)).toBeInTheDocument();
      expect(screen.getAllByText(/مُسند/).length).toBeGreaterThan(0);
    });
  });

  it('performs one-click auto-assignment directly', async () => {
    render(<AutoAssignPage />);
    const autoBtn = screen.getByText('توزيع تلقائي مباشر');
    fireEvent.click(autoBtn);

    await waitFor(() => {
      expect(screen.getByText(/تم التوزيع والتطبيق الفوري بنجاح/)).toBeInTheDocument();
    });
  });

  it('displays unassigned list with reasons and triggers retry after adding courier (SHIP-W12)', async () => {
    render(<AutoAssignPage />);
    fireEvent.click(screen.getByText('اقترح التوزيع'));

    await waitFor(() => {
      expect(screen.getByText(/لم يتم الإسناد/)).toBeInTheDocument();
      expect(screen.getByText('إعادة المحاولة بعد إضافة مندوب')).toBeInTheDocument();
    });

    const retryBtn = screen.getByText('إعادة المحاولة بعد إضافة مندوب');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/shipping-assign/couriers'),
        expect.anything()
      );
    });
  });
});
