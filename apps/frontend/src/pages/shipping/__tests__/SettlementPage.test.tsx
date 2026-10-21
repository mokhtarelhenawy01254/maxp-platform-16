// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettlementPage from '../SettlementPage';
import shippingSettlementService from '../../../services/shippingSettlementService';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, fallback?: string) => fallback || key,
    }),
  };
});

vi.mock('../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} EGP`,
  }),
}));

vi.mock('../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: (val: string) => val,
  }),
}));

vi.mock('../../../services/shippingSettlementService', () => ({
  default: {
    getSummary: vi.fn(),
    getOrders: vi.fn(),
    settle: vi.fn(),
    unsettle: vi.fn(),
  },
}));

const mockSummary = [
  {
    company: { id: 'TURBO', name: 'Turbo Express' },
    deliveredShipments: 12,
    pendingAmount: 3600,
    settledAmount: 12000,
  },
  {
    company: { id: 'BOSTA', name: 'Bosta' },
    deliveredShipments: 5,
    pendingAmount: 1500,
    settledAmount: 8000,
  },
];

const mockOrders = [
  {
    id: 'ord-101',
    orderNumber: 'ORD-101',
    sourceType: 'TURBO',
    trackingNumber: 'TRK-9901',
    customerName: 'أحمد محمود',
    customerPhone: '01011112222',
    codAmount: 450,
    shippingFee: 50,
    settlementStatus: 'PENDING',
    status: 'DELIVERED',
    createdAt: '2026-10-18T10:00:00Z',
  },
];

describe('SettlementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (shippingSettlementService.getSummary as any).mockResolvedValue({
      data: mockSummary,
    });
    (shippingSettlementService.getOrders as any).mockResolvedValue({
      data: mockOrders,
      pagination: { pages: 1, total: 1 },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders header, KPIs, company summaries, and order records', async () => {
    render(
      <MemoryRouter>
        <SettlementPage />
      </MemoryRouter>
    );

    expect(screen.getByText('تسويات شركات الشحن')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Turbo Express')).toBeInTheDocument();
      expect(screen.getByText('Bosta')).toBeInTheDocument();
    });

    // Check KPI metrics
    expect(screen.getByText('5100 EGP')).toBeInTheDocument(); // total pending: 3600 + 1500
    expect(screen.getByText('17')).toBeInTheDocument(); // total delivered: 12 + 5
    expect(screen.getByText('20000 EGP')).toBeInTheDocument(); // total settled: 12000 + 8000

    // Check order row
    await waitFor(() => {
      expect(screen.getByText('ORD-101')).toBeInTheDocument();
      expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
    });
  });

  it('filters by company when company card is clicked', async () => {
    render(
      <MemoryRouter>
        <SettlementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Turbo Express')).toBeInTheDocument();
    });

    const bostaBtn = screen.getByText('Bosta').closest('button');
    expect(bostaBtn).not.toBeNull();
    fireEvent.click(bostaBtn!);

    await waitFor(() => {
      expect(shippingSettlementService.getOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          shippingCompanyId: 'BOSTA',
        })
      );
    });
  });

  it('handles bulk settlement for selected orders', async () => {
    (shippingSettlementService.settle as any).mockResolvedValue({
      data: { updated: 1 },
    });

    render(
      <MemoryRouter>
        <SettlementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-101')).toBeInTheDocument();
    });

    // Check the order checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // First is header (select all), second is row
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText(/تسوية المحددة/)).toBeInTheDocument();
    });

    const bulkBtn = screen.getByText(/تسوية المحددة/).closest('button');
    expect(bulkBtn).not.toBeNull();
    fireEvent.click(bulkBtn!);

    await waitFor(() => {
      expect(shippingSettlementService.settle).toHaveBeenCalledWith({
        shipmentIds: [],
        turboOrderIds: ['ord-101'],
      });
    });
  });
});
