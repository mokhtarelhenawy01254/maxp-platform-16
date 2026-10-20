import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CourierMobileRunPage from '../CourierMobileRunPage';
import courierService from '../../../../services/courierService';

jest.mock('../../../../services/courierService', () => ({
  __esModule: true,
  default: {
    getDeliveryRun: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'run-123',
        runNumber: 'RUN-2026-001',
        courier: { name: 'كابتن محمود' },
        pinRequired: false,
        otpRequired: false,
        shipments: [
          {
            id: 'item-1',
            status: 'PENDING',
            collectedAmount: null,
            order: {
              orderNumber: 'ORD-7711',
              customerName: 'كريم أحمد',
              customerPhone: '01011223344',
              customerAddress: 'القاهرة - مصر الجديدة',
              total: 850,
              items: [{ id: 'it-1', name: 'ساعة يد كلاسيك', quantity: 1, price: 850 }],
            },
          },
          {
            id: 'item-2',
            status: 'DELIVERED',
            collectedAmount: 420,
            order: {
              orderNumber: 'ORD-7722',
              customerName: 'سارة خالد',
              customerPhone: '01155667788',
              customerAddress: 'الجيزة - الدقي',
              total: 420,
              items: [{ id: 'it-2', name: 'حزام جلد طبيعي', quantity: 1, price: 420 }],
            },
          },
        ],
      },
    }),
    updateShipmentStatus: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('../../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
    currency: 'ج.م',
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CourierMobileRunPage Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders mobile top bar, run number, courier name, and order card', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/shipping/courier-run/run-123']}>
          <Routes>
            <Route path="/shipping/courier-run/:id" element={<CourierMobileRunPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('RUN-2026-001')).toBeInTheDocument();
    expect(screen.getByText('كابتن محمود')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^المتبقي/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^تم\s*\(/i })).toBeInTheDocument();

    expect(await screen.findByText('كريم أحمد')).toBeInTheDocument();
    expect(screen.getByText('ORD-7711')).toBeInTheDocument();
    expect(screen.getByText('850 ج.م')).toBeInTheDocument();
  });

  it('switches between tabs and displays delivered shipments', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/shipping/courier-run/run-123']}>
          <Routes>
            <Route path="/shipping/courier-run/:id" element={<CourierMobileRunPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const deliveredTabBtn = screen.getByRole('button', { name: /^تم\s*\(/i });
    await act(async () => {
      fireEvent.click(deliveredTabBtn);
    });

    expect(await screen.findByText('سارة خالد')).toBeInTheDocument();
    expect(screen.getByText('ORD-7722')).toBeInTheDocument();
  });

  it('opens action modal on clicking delivered and confirms delivery', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/shipping/courier-run/run-123']}>
          <Routes>
            <Route path="/shipping/courier-run/:id" element={<CourierMobileRunPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const deliveredBtn = await screen.findByRole('button', { name: /تم التسليم/i });
    await act(async () => {
      fireEvent.click(deliveredBtn);
    });

    expect(await screen.findByText('تأكيد التسليم واستلام الكاش')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /تأكيد وحفظ/i });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(courierService.updateShipmentStatus).toHaveBeenCalledWith(
        'run-123',
        'item-1',
        expect.objectContaining({
          status: 'DELIVERED',
          collectedAmount: 850,
        }),
        undefined
      );
    });
  });

  it('opens waybill modal on clicking waybill button', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/shipping/courier-run/run-123']}>
          <Routes>
            <Route path="/shipping/courier-run/:id" element={<CourierMobileRunPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    const waybillBtn = await screen.findByRole('button', { name: /بوليصة/i });
    await act(async () => {
      fireEvent.click(waybillBtn);
    });

    expect(await screen.findByText('بوليصة شحن الكابتن')).toBeInTheDocument();
    expect(screen.getByText('كاش عند الاستلام')).toBeInTheDocument();
  });
});
