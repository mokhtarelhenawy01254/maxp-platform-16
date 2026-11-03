// @vitest-environment jsdom
/**
 * Shipping Client Portal (SHIP-W2C) Frontend Acceptance Tests
 * Verifies rendering of:
 * 1. ClientDashboardPage (KPIs, recent shipments)
 * 2. ClientNewShipmentPage (Form fields, live rate-card quote)
 * 3. ClientPortalShell (NAV-1 compliant sidebar)
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClientDashboardPage from '../ClientDashboardPage';
import ClientNewShipmentPage from '../ClientNewShipmentPage';
import ClientPortalShell from '../ClientPortalShell';
import { shippingClientApi } from '../useShippingClientApi';

vi.mock('../useShippingClientApi', () => ({
  shippingClientApi: {
    getMe: vi.fn(),
    getSummary: vi.fn(),
    getShipments: vi.fn(),
    getShipmentById: vi.fn(),
    createShipment: vi.fn(),
    getRateCard: vi.fn(),
    getPickups: vi.fn(),
    createPickup: vi.fn(),
  },
}));

describe('Shipping Client Portal (SHIP-W2C) Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ClientDashboardPage', () => {
    it('renders KPIs and recent shipments list', async () => {
      const mockSummary = {
        success: true,
        data: {
          totalShipments: 42,
          deliveredCount: 38,
          returnedCount: 2,
          pendingCount: 2,
          deliveryRate: 95,
          estimatedPendingCod: 15400,
          recentShipments: [
            {
              id: 'ship-1',
              trackingNumber: 'TRK-ABC-123',
              recipientName: 'محمود أحمد',
              recipientPhone: '01012345678',
              destinationGovernorate: 'القاهرة',
              status: 'DELIVERED',
              codAmount: 650,
              currency: 'EGP',
              createdAt: '2026-11-03T10:00:00.000Z',
            },
          ],
        },
      };

      (shippingClientApi.getSummary as any).mockResolvedValue(mockSummary);

      render(
        <MemoryRouter>
          <ClientDashboardPage />
        </MemoryRouter>
      );

      // Verify KPI rendering
      await waitFor(() => {
        expect(screen.getByText('لوحة تحكم التاجر')).toBeInTheDocument();
      });

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('15,400')).toBeInTheDocument();

      // Verify Recent shipment row
      expect(screen.getByText('TRK-ABC-123')).toBeInTheDocument();
      expect(screen.getByText('محمود أحمد')).toBeInTheDocument();
      expect(screen.getByText('تم التسليم')).toBeInTheDocument();
    });
  });

  describe('ClientNewShipmentPage', () => {
    it('renders creation form and calculates live price from rate cards', async () => {
      (shippingClientApi.getRateCard as any).mockResolvedValue({
        success: true,
        data: [
          {
            id: 'rc-1',
            name: 'بطاقة القاهرة الكبرى',
            governorateCode: 'القاهرة',
            basePrice: 50,
            baseWeightKg: 1,
            extraKgPrice: 5,
            codFeeFixed: 0,
            codFeePercent: 0,
            returnFee: 20,
          },
        ],
      });

      render(
        <MemoryRouter>
          <ClientNewShipmentPage />
        </MemoryRouter>
      );

      // Verify form elements
      expect(screen.getByText('إنشاء شحنة جديدة')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('أحمد محمد')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('010XXXXXXXX')).toBeInTheDocument();

      // Verify live price calculation appears
      await waitFor(() => {
        expect(screen.getByText('تسعير لحظي (بطاقة الأسعار)')).toBeInTheDocument();
        expect(screen.getAllByText('50 ج.م').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('ClientPortalShell', () => {
    it('renders portal navigation and title without top navbar', () => {
      render(
        <MemoryRouter>
          <ClientPortalShell />
        </MemoryRouter>
      );

      expect(screen.getByText('بوابة العميل — الشحن')).toBeInTheDocument();
      expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
      expect(screen.getByText('شحناتي')).toBeInTheDocument();
      expect(screen.getByText('شحنة جديدة')).toBeInTheDocument();
      expect(screen.getByText('البيكاب')).toBeInTheDocument();
      expect(screen.getByText('رفع مجمّع')).toBeInTheDocument();
    });
  });
});
