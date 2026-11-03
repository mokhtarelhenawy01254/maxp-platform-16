// @vitest-environment jsdom
/**
 * Shipping Reports Profit Tab (SHIP-W9) Frontend Vitest Tests
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ShippingReportsProfitTab } from '../ShippingReportsProfitTab';
import { shippingReportsService } from '../../../../services/shippingReportsService';

vi.mock('../../../../services/shippingReportsService', () => ({
  shippingReportsService: {
    getProfitReport: vi.fn(),
    getUncoveredProfit: vi.fn(),
    recalcProfit: vi.fn(),
  },
}));

vi.mock('../../reports/shippingReportsHelpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../reports/shippingReportsHelpers')>();
  return {
    ...actual,
    exportToCsv: vi.fn(),
  };
});

const mockProfitReport = {
  success: true,
  groupBy: 'client' as const,
  range: { from: '2026-10-04', to: '2026-11-03' },
  rows: [
    {
      key: 'client_1',
      name: 'متجر الأناقة',
      shipments: 25,
      revenue: 2500,
      courierCost: 750,
      margin: 1750,
      marginPct: 70,
    },
    {
      key: 'client_2',
      name: 'متجر الرياضة',
      shipments: 15,
      revenue: 1200,
      courierCost: 450,
      margin: 750,
      marginPct: 62.5,
    },
  ],
  totals: {
    shipments: 40,
    revenue: 3700,
    courierCost: 1200,
    margin: 2500,
    marginPct: 67.57,
  },
  generatedAt: '2026-11-04T00:00:00Z',
};

describe('ShippingReportsProfitTab (SHIP-W9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (shippingReportsService.getProfitReport as any).mockResolvedValue(mockProfitReport);
    (shippingReportsService.getUncoveredProfit as any).mockResolvedValue({ success: true, count: 2, shipments: [] });
    (shippingReportsService.recalcProfit as any).mockResolvedValue({ success: true, updatedCount: 2 });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders profit KPI cards and table rows correctly', async () => {
    render(<ShippingReportsProfitTab getEffectiveDateRange={() => ({ from: '2026-10-04', to: '2026-11-03' })} />);

    await waitFor(() => {
      expect(screen.getByText('متجر الأناقة')).toBeInTheDocument();
      expect(screen.getByText('متجر الرياضة')).toBeInTheDocument();
    });

    expect(screen.getByText('إجمالي الشحنات')).toBeInTheDocument();
    expect(screen.getAllByText('إيرادات الشحن').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('تكلفة المناديب').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('صافي الهامش').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('هامش الربح %')).toBeInTheDocument();
  });

  it('switches groupBy to governorate and reloads data', async () => {
    render(<ShippingReportsProfitTab getEffectiveDateRange={() => ({ from: '2026-10-04', to: '2026-11-03' })} />);

    await waitFor(() => {
      expect(screen.getByText('متجر الأناقة')).toBeInTheDocument();
    });

    const govBtn = screen.getByText('المحافظات');
    fireEvent.click(govBtn);

    await waitFor(() => {
      expect(shippingReportsService.getProfitReport).toHaveBeenCalledWith(
        expect.objectContaining({ groupBy: 'governorate' })
      );
    });
  });

  it('handles profit recalculation and updates toast', async () => {
    render(<ShippingReportsProfitTab getEffectiveDateRange={() => ({ from: '2026-10-04', to: '2026-11-03' })} />);

    await waitFor(() => {
      expect(screen.getByText('متجر الأناقة')).toBeInTheDocument();
    });

    const recalcBtn = screen.getByRole('button', { name: /إعادة احتساب الأرباح/i });
    fireEvent.click(recalcBtn);

    await waitFor(() => {
      expect(shippingReportsService.recalcProfit).toHaveBeenCalled();
    });
  });

  it('triggers CSV export without crashing', async () => {
    const { exportToCsv } = await import('../../reports/shippingReportsHelpers');
    render(<ShippingReportsProfitTab getEffectiveDateRange={() => ({ from: '2026-10-04', to: '2026-11-03' })} />);

    await waitFor(() => {
      expect(screen.getByText('متجر الأناقة')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /تصدير/i });
    fireEvent.click(exportBtn);

    expect(exportToCsv).toHaveBeenCalledWith(
      'profit-report-client',
      expect.any(Array),
      expect.any(Array)
    );
  });
});
