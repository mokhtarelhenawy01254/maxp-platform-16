// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ShipmentTrackingPage from '../ShipmentTrackingPage';
import { shippingOpsService } from '../../../services/shippingOpsService';

vi.mock('../../../services/shippingOpsService', () => ({
  shippingOpsService: {
    trackPublicShipment: vi.fn(),
  },
}));

const renderTrackingComponent = (initialPath = '/track') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/track" element={<ShipmentTrackingPage />} />
        <Route path="/track/:waybill" element={<ShipmentTrackingPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Public Shipment Tracking Page (SHIP-W3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders search input and page heading', () => {
    renderTrackingComponent('/track');

    expect(screen.getByText('تتبع شحنتك لحظة بلحظة')).toBeDefined();
    expect(screen.getByPlaceholderText('مثال: TRK-XXXX-YYYY أو WB-12345')).toBeDefined();
    expect(screen.getByRole('button', { name: /تتبع الشحنة/i })).toBeDefined();
  });

  it('fetches and displays tracking details with masked PII and zero financials', async () => {
    const mockData = {
      waybill: 'WB-CAIRO-9921',
      trackingNumber: 'TRK-2026-X9921',
      status: 'OUT_FOR_DELIVERY',
      recipientName: 'أحمد م***',
      recipientPhone: '010*****432',
      destinationGovernorate: 'القاهرة',
      destinationCity: 'مدينة نصر',
      updatedAt: '2026-11-03T10:30:00Z',
      createdAt: '2026-11-02T08:00:00Z',
      events: [
        {
          id: 'ev-1',
          status: 'OUT_FOR_DELIVERY',
          toStatus: 'OUT_FOR_DELIVERY',
          reasonCode: 'DISPATCHED',
          notes: 'خرج مع المندوب للتوصيل',
          createdAt: '2026-11-03T09:00:00Z',
        },
      ],
    };

    (shippingOpsService.trackPublicShipment as any).mockResolvedValue(mockData);

    renderTrackingComponent('/track');

    const input = screen.getByPlaceholderText('مثال: TRK-XXXX-YYYY أو WB-12345');
    fireEvent.change(input, { target: { value: 'WB-CAIRO-9921' } });
    fireEvent.click(screen.getByRole('button', { name: /تتبع الشحنة/i }));

    await waitFor(() => {
      expect(shippingOpsService.trackPublicShipment).toHaveBeenCalledWith('WB-CAIRO-9921');
    });

    expect(await screen.findByText('WB-CAIRO-9921')).toBeDefined();
    expect(screen.getAllByText('خرج للتوصيل مع المندوب').length).toBeGreaterThan(0);
    expect(screen.getByText('أحمد م***')).toBeDefined();
    expect(screen.getByText('010*****432')).toBeDefined();
    expect(screen.getByText(/القاهرة/)).toBeDefined();
    expect(screen.getByText('سجل مسار الشحنة')).toBeDefined();
    expect(screen.getByText('خرج مع المندوب للتوصيل')).toBeDefined();

    // Verify zero financial terms in the UI
    expect(screen.queryByText(/سعر/)).toBeNull();
    expect(screen.queryByText(/تكلفة/)).toBeNull();
    expect(screen.queryByText(/COD/)).toBeNull();
    expect(screen.queryByText(/هامش/)).toBeNull();
  });

  it('automatically fetches and displays tracking data when waybill is in URL route param', async () => {
    const mockData = {
      waybill: 'TRK-AUTO-1234',
      trackingNumber: 'TRK-AUTO-1234',
      status: 'DELIVERED',
      recipientName: 'محمود خ***',
      recipientPhone: '012*****987',
      destinationGovernorate: 'الإسكندرية',
      destinationCity: 'سموحة',
      updatedAt: '2026-11-03T11:00:00Z',
      createdAt: '2026-11-01T10:00:00Z',
      events: [
        {
          id: 'ev-1',
          status: 'DELIVERED',
          toStatus: 'DELIVERED',
          notes: 'تم التسليم للعميل بنجاح',
          createdAt: '2026-11-03T11:00:00Z',
        },
      ],
    };

    (shippingOpsService.trackPublicShipment as any).mockResolvedValue(mockData);

    renderTrackingComponent('/track/TRK-AUTO-1234');

    await waitFor(() => {
      expect(shippingOpsService.trackPublicShipment).toHaveBeenCalledWith('TRK-AUTO-1234');
    });

    expect(await screen.findByText('TRK-AUTO-1234')).toBeDefined();
    expect(screen.getAllByText('تم التوصيل بنجاح').length).toBeGreaterThan(0);
    expect(screen.getByText('محمود خ***')).toBeDefined();
  });

  it('displays 404 error message when waybill is not found', async () => {
    (shippingOpsService.trackPublicShipment as any).mockRejectedValue({
      response: {
        data: {
          error: 'الشحنة غير موجودة أو رقم البوليصة غير صحيح',
        },
      },
    });

    renderTrackingComponent('/track/INVALID-WB');

    expect(await screen.findByText('الشحنة غير موجودة أو رقم البوليصة غير صحيح')).toBeDefined();
  });
});
