import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import NewParcelPage from '../NewParcelPage';
import ShippingParcelsList from '../ShippingParcelsList';
import { shippingOpsService } from '../../../services/shippingOpsService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, defaultValue?: string) => defaultValue || k,
    i18n: { language: 'ar' },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../services/shippingOpsService', () => ({
  shippingOpsService: {
    getQuote: vi.fn(),
    createShipment: vi.fn(),
    getShipments: vi.fn(),
    getShipmentById: vi.fn(),
    cancelShipment: vi.fn(),
    getRateCards: vi.fn(),
    createRateCard: vi.fn(),
    updateRateCard: vi.fn(),
    deleteRateCard: vi.fn(),
    getDashboardStats: vi.fn(),
    getMerchants: vi.fn(),
  },
}));

describe('Shipping Operations Frontend (SHIP-W1B Acceptance Gate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (shippingOpsService.getMerchants as any).mockResolvedValue([
      { id: 'merchant-1', name: 'متجر الأناقة' },
    ]);
  });

  describe('1. NewParcelPage - Real-Time Dynamic Quote', () => {
    it('calculates and renders the price correctly from quote response', async () => {
      (shippingOpsService.getQuote as any).mockResolvedValue({
        price: 80,
        currency: 'EGP',
        breakdown: {
          basePrice: 70,
          extraWeightFee: 10,
          codFee: 0,
        },
      });

      render(
        <MemoryRouter>
          <NewParcelPage />
        </MemoryRouter>
      );

      // Fill in governorate & weight to trigger quote
      const govSelect = screen.getByTestId('governorate-select');
      fireEvent.change(govSelect, { target: { value: 'الإسكندرية' } });

      const weightInput = screen.getByTestId('weight-input');
      fireEvent.change(weightInput, { target: { value: '2.5' } });

      await waitFor(() => {
        expect(shippingOpsService.getQuote).toHaveBeenCalled();
      });

      // Price 80 EGP should be visible on the card
      await waitFor(() => {
        expect(screen.getByText(/80/)).toBeDefined();
      });
    });
  });

  describe('2. ShippingParcelsList - Displays Mock Parcels Table', () => {
    it('renders 3 parcel rows correctly from mock data', async () => {
      const mockParcels = [
        {
          id: 'ship-1',
          trackingNumber: 'TRK-1001',
          recipientName: 'أحمد محمود',
          recipientPhone: '01011112222',
          governorate: 'القاهرة',
          city: 'مدينة نصر',
          codAmount: 350,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          merchant: { name: 'متجر الأزياء' },
        },
        {
          id: 'ship-2',
          trackingNumber: 'TRK-1002',
          recipientName: 'سارة خالد',
          recipientPhone: '01122223333',
          governorate: 'الجيزة',
          city: 'الدقي',
          codAmount: 500,
          status: 'OUT_FOR_DELIVERY',
          createdAt: new Date().toISOString(),
          merchant: { name: 'متجر التقنية' },
        },
        {
          id: 'ship-3',
          trackingNumber: 'TRK-1003',
          recipientName: 'محمد علي',
          recipientPhone: '01233334444',
          governorate: 'الإسكندرية',
          city: 'سموحة',
          codAmount: 0,
          status: 'DELIVERED',
          createdAt: new Date().toISOString(),
          merchant: null,
        },
      ];

      (shippingOpsService.getShipments as any).mockResolvedValue({
        data: mockParcels,
        items: mockParcels,
        pagination: {
          total: 3,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      render(
        <MemoryRouter>
          <ShippingParcelsList />
        </MemoryRouter>
      );

      // Verify all 3 tracking numbers appear in document
      await waitFor(() => {
        expect(screen.getByText('TRK-1001')).toBeDefined();
        expect(screen.getByText('TRK-1002')).toBeDefined();
        expect(screen.getByText('TRK-1003')).toBeDefined();
      });

      // Verify recipient names
      expect(screen.getByText('أحمد محمود')).toBeDefined();
      expect(screen.getByText('سارة خالد')).toBeDefined();
      expect(screen.getByText('محمد علي')).toBeDefined();
    });
  });
});
