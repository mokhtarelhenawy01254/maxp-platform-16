// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InventoryAnalytics from '../InventoryAnalytics';
import { companyAwareApi } from '../../../services/companyAwareApi';

vi.mock('../../../services/companyAwareApi', () => ({
  companyAwareApi: {
    get: vi.fn(),
  },
}));

vi.mock('../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} EGP`,
  }),
}));

const mockStats = {
  totalProducts: 45,
  totalStock: 1200,
  totalValue: 180000,
  potentialRevenue: 270000,
  potentialProfit: 90000,
  lowStockCount: 2,
  outOfStockCount: 1,
  lowStockItems: [
    {
      id: 'low-1',
      name: 'عطر رجالي مميز',
      stock: 3,
      sku: 'PRF-001',
      category: 'عطور',
    },
    {
      id: 'low-2',
      name: 'محفظة جلدية فاخرة',
      stock: 4,
      sku: 'WLT-002',
      category: 'إكسسوارات',
    },
  ],
  outOfStockItems: [
    {
      id: 'out-1',
      name: 'نظارة شمسية كلاسيك',
      stock: 0,
      sku: 'GLS-003',
      category: 'إكسسوارات',
    },
  ],
};

describe('InventoryAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (companyAwareApi.get as any).mockResolvedValue({
      data: {
        success: true,
        data: mockStats,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders header, financial telemetry cards, and stock alert items', async () => {
    render(<InventoryAnalytics />);

    expect(screen.getByText('تحليلات المخزون والتقييم المالي')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('عطر رجالي مميز')).toBeInTheDocument();
      expect(screen.getByText('محفظة جلدية فاخرة')).toBeInTheDocument();
      expect(screen.getByText('نظارة شمسية كلاسيك')).toBeInTheDocument();
    });

    // Check financial metric cards
    expect(screen.getByText('180000 EGP')).toBeInTheDocument(); // totalValue
    expect(screen.getByText('270000 EGP')).toBeInTheDocument(); // potentialRevenue
    expect(screen.getByText('90000 EGP')).toBeInTheDocument(); // potentialProfit
    expect(screen.getByText('1,200')).toBeInTheDocument(); // totalStock
  });

  it('switches tabs to filter low stock only', async () => {
    render(<InventoryAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('عطر رجالي مميز')).toBeInTheDocument();
    });

    const lowTabBtn = screen.getByRole('button', { name: /منخفض المخزون/ });
    fireEvent.click(lowTabBtn);

    await waitFor(() => {
      expect(screen.getByText('عطر رجالي مميز')).toBeInTheDocument();
      expect(screen.getByText('محفظة جلدية فاخرة')).toBeInTheDocument();
      expect(screen.queryByText('نظارة شمسية كلاسيك')).not.toBeInTheDocument();
    });
  });

  it('filters alert items by search term', async () => {
    render(<InventoryAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('عطر رجالي مميز')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('بحث بالمنتج أو رمز SKU...');
    fireEvent.change(searchInput, { target: { value: 'PRF-001' } });

    await waitFor(() => {
      expect(screen.getByText('عطر رجالي مميز')).toBeInTheDocument();
      expect(screen.queryByText('محفظة جلدية فاخرة')).not.toBeInTheDocument();
    });
  });
});
