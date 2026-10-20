import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import CourierManagementPage from '../CourierManagementPage';
import courierService from '../../../../services/courierService';

jest.mock('../../../../services/courierService', () => ({
  __esModule: true,
  default: {
    getCouriers: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'courier-1',
          name: 'محمد كمال',
          phone: '01012345678',
          nationalId: '29001011234567',
          vehicleType: 'MOTORCYCLE',
          plateNumber: 'ط ر ق 123',
          status: 'ON_DUTY',
          activeShipmentsCount: 5,
          pendingSettlementCash: 1200,
          successRate: 92,
          isActive: true,
        },
        {
          id: 'courier-2',
          name: 'إبراهيم حسن',
          phone: '01198765432',
          vehicleType: 'CAR',
          status: 'AVAILABLE',
          activeShipmentsCount: 0,
          pendingSettlementCash: 0,
          successRate: 85,
          isActive: true,
        },
      ],
    }),
    getSummary: jest.fn().mockResolvedValue({
      success: true,
      data: {
        totalCouriers: 12,
        activeCouriers: 7,
        availableCouriers: 5,
        totalParcelsInField: 38,
        totalExpectedCashInField: 15400,
        totalCashAwaitingRemittance: 4200,
      },
    }),
    getFleetSettings: jest.fn().mockResolvedValue({
      commission: { defaultType: 'FIXED_PER_ORDER', defaultValue: 35 },
    }),
    createCourier: jest.fn().mockResolvedValue({ success: true }),
    updateCourier: jest.fn().mockResolvedValue({ success: true }),
    deleteCourier: jest.fn().mockResolvedValue({ success: true }),
    setCourierPin: jest.fn().mockResolvedValue({ success: true, message: 'تم التحديث' }),
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

describe('CourierManagementPage Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header, telemetry summary cards, and couriers list cleanly', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CourierManagementPage />
        </BrowserRouter>
      );
    });

    expect(screen.getByText('إدارة المناديب والتوصيل الداخلي')).toBeInTheDocument();
    expect(screen.getByText('إجمالي الأسطول')).toBeInTheDocument();
    expect(screen.getByText('مناديب في الميدان')).toBeInTheDocument();

    expect(await screen.findByText('محمد كمال')).toBeInTheDocument();
    expect(screen.getByText('01012345678')).toBeInTheDocument();
    expect(screen.getByText('ط ر ق 123', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('إبراهيم حسن')).toBeInTheDocument();
  });

  it('opens create modal when clicking add courier button', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CourierManagementPage />
        </BrowserRouter>
      );
    });

    const addBtn = screen.getByRole('button', { name: /إضافة مندوب جديد/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    expect(await screen.findByText('إضافة مندوب توصيل داخلي')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('مثال: أحمد عبد الله')).toBeInTheDocument();
  });

  it('submits create courier form successfully', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CourierManagementPage />
        </BrowserRouter>
      );
    });

    const addBtn = screen.getByRole('button', { name: /إضافة مندوب جديد/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    const nameInput = screen.getByPlaceholderText('مثال: أحمد عبد الله');
    const phoneInput = screen.getByPlaceholderText('01xxxxxxxxx');

    fireEvent.change(nameInput, { target: { value: 'علي مصطفى' } });
    fireEvent.change(phoneInput, { target: { value: '01234567890' } });

    const submitBtn = screen.getByRole('button', { name: /إضافة المندوب/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(courierService.createCourier).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'علي مصطفى',
          phone: '01234567890',
        })
      );
    });
  });

  it('opens edit modal when clicking edit button', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CourierManagementPage />
        </BrowserRouter>
      );
    });

    const editBtns = await screen.findAllByTitle('تعديل بيانات المندوب');
    await act(async () => {
      fireEvent.click(editBtns[0]);
    });

    expect(await screen.findByText('تعديل بيانات المندوب')).toBeInTheDocument();
    expect(screen.getByDisplayValue('محمد كمال')).toBeInTheDocument();
  });
});
