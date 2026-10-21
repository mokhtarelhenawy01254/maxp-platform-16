// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StockMovementsPage from '../StockMovementsPage';
import stockMovementsService from '../../../services/stockMovementsService';

vi.mock('../../../services/stockMovementsService', () => ({
  default: {
    getMovements: vi.fn(),
  },
}));

vi.mock('../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: (val: string) => val,
  }),
}));

const mockMovements = [
  {
    id: 'mov-1',
    type: 'IN',
    quantity: 50,
    reason: 'أمر شراء PO-101',
    reference: 'PO-101',
    notes: 'استلام دفعة خامات جديدة',
    createdAt: '2026-10-19T10:00:00Z',
    product: {
      id: 'prod-1',
      name: 'ساعة يد أوتوماتيك',
      sku: 'WAT-001',
    },
  },
  {
    id: 'mov-2',
    type: 'OUT',
    quantity: 5,
    reason: 'شحن طلب ORD-550',
    reference: 'ORD-550',
    notes: 'تسليم لشركة بوسطة',
    createdAt: '2026-10-19T14:30:00Z',
    product: {
      id: 'prod-2',
      name: 'حزام جلد إيطالي',
      sku: 'BLT-002',
    },
  },
  {
    id: 'mov-3',
    type: 'ADJUSTMENT',
    quantity: 2,
    reason: 'تسوية جردية سنوية',
    reference: 'AUD-2026',
    notes: 'فائض جردي',
    createdAt: '2026-10-20T09:15:00Z',
    product: {
      id: 'prod-1',
      name: 'ساعة يد أوتوماتيك',
      sku: 'WAT-001',
    },
  },
];

describe('StockMovementsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (stockMovementsService.getMovements as any).mockResolvedValue({
      success: true,
      data: mockMovements,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders header, telemetry metrics strip, and data rows cleanly', async () => {
    render(<StockMovementsPage />);

    expect(screen.getByText('سجل حركات المخزون التفصيلية')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('ساعة يد أوتوماتيك').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('حزام جلد إيطالي')).toBeInTheDocument();
      expect(screen.getAllByText(/WAT-001/).length).toBeGreaterThanOrEqual(1);
    });

    // Check telemetry numbers: total 3, IN 1, OUT 1, adjust/transfer 1
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // total
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // in, out, adjust
  });

  it('filters movements by movement type', async () => {
    render(<StockMovementsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('كل أنواع الحركات')).toBeInTheDocument();
    });

    const select = screen.getByDisplayValue('كل أنواع الحركات');
    fireEvent.change(select, { target: { value: 'IN' } });

    await waitFor(() => {
      expect(stockMovementsService.getMovements).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'IN',
        })
      );
    });
  });

  it('renders empty state when no movements are returned', async () => {
    (stockMovementsService.getMovements as any).mockResolvedValue({
      success: true,
      data: [],
    });

    render(<StockMovementsPage />);

    await waitFor(() => {
      expect(screen.getByText('لا توجد حركات مخزون مسجلة')).toBeInTheDocument();
    });
  });
});
