import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import DeliveryRunsPage from '../DeliveryRunsPage';
import courierService from '../../../../services/courierService';
import api from '../../../../services/api';

jest.mock('../../../../services/courierService', () => ({
  __esModule: true,
  default: {
    getDeliveryRuns: jest.fn(),
    getDeliveryRun: jest.fn(),
    getCouriers: jest.fn(),
    createDeliveryRun: jest.fn(),
    reassignShipments: jest.fn(),
    getRunShareLink: jest.fn()
  }
}));

jest.mock('../../../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn()
  }
}));

jest.mock('../../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} ج.م`
  })
}));

jest.mock('../../../../hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDate: (val: any) => '2026-10-20'
  })
}));

const mockRuns = [
  {
    id: 'run-1',
    runNumber: 'RUN-1001',
    status: 'DISPATCHED',
    dispatchDate: '2026-10-20T08:00:00Z',
    totalShipments: 4,
    totalCODExpected: 1500,
    totalCODCollected: 0,
    courierId: 'courier-1',
    courier: {
      id: 'courier-1',
      name: 'أحمد مندوب',
      phone: '01011112222'
    },
    shipments: [
      {
        id: 'ship-1',
        status: 'DISPATCHED',
        destinationAddress: 'المعادي - القاهرة',
        order: {
          id: 'ord-1',
          orderNumber: 'ORD-501',
          customerName: 'كريم عادل',
          customerPhone: '01022223333',
          customerAddress: 'شارع 9 المعادي',
          governorate: 'القاهرة',
          total: 600,
          items: [{ id: 'item-1', name: 'قميص أبيض', quantity: 1, price: 600 }]
        }
      }
    ]
  }
];

describe('DeliveryRunsPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (courierService.getDeliveryRuns as jest.Mock).mockResolvedValue({
      success: true,
      data: mockRuns,
      pagination: { total: 1, page: 1, pages: 1 }
    });
    (courierService.getDeliveryRun as jest.Mock).mockResolvedValue({
      success: true,
      data: mockRuns[0]
    });
    (courierService.getCouriers as jest.Mock).mockResolvedValue({
      success: true,
      data: [
        { id: 'courier-1', name: 'أحمد مندوب', phone: '01011112222', status: 'ON_DUTY' },
        { id: 'courier-2', name: 'سيد سائق', phone: '01033334444', status: 'AVAILABLE' }
      ]
    });
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        orders: [
          { id: 'ready-1', orderNumber: 'ORD-901', customerName: 'ياسين أحمد', total: 450 }
        ]
      }
    });
  });

  it('renders page header and navigation links properly', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/shipping/delivery-runs']}>
          <DeliveryRunsPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('رحلات التوزيع والمانيفست الميداني')).toBeInTheDocument();
    expect(screen.getByText('إنشاء مأمورية توزيع جديدة')).toBeInTheDocument();
    expect(screen.getByText('صالة تجهيز الطلبات')).toBeInTheDocument();
    expect(screen.getByText('شاشة التوريد وتسوية الخزينة')).toBeInTheDocument();
  });

  it('fetches and displays delivery runs in the table', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/shipping/delivery-runs']}>
          <DeliveryRunsPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('RUN-1001')).toBeInTheDocument();
    });

    expect(screen.getByText('أحمد مندوب')).toBeInTheDocument();
    expect(screen.getByText('1500 ج.م')).toBeInTheDocument();
    expect(screen.getAllByText('في الميدان').length).toBeGreaterThanOrEqual(1);
  });

  it('opens manifest detail modal when clicking eye icon', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/shipping/delivery-runs']}>
          <DeliveryRunsPage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('RUN-1001')).toBeInTheDocument();
    });

    const viewDetailBtn = screen.getByTitle('عرض تفاصيل المانيفست وطباعة البوالص');
    await act(async () => {
      fireEvent.click(viewDetailBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/مانيفست مأمورية التوصيل/i)).toBeInTheDocument();
      expect(screen.getByText('ORD-501')).toBeInTheDocument();
      expect(screen.getByText('كريم عادل')).toBeInTheDocument();
    });
  });

  it('opens create delivery run modal and displays ready-to-ship orders', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/shipping/delivery-runs']}>
          <DeliveryRunsPage />
        </MemoryRouter>
      );
    });

    const createBtn = screen.getByText('إنشاء مأمورية توزيع جديدة');
    await act(async () => {
      fireEvent.click(createBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('إنشاء مأمورية توزيع وإسناد شحنات')).toBeInTheDocument();
      expect(screen.getByText('ORD-901')).toBeInTheDocument();
    });
  });
});
