import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import CourierPayrollPage from '../CourierPayrollPage';
import courierService from '../../../../services/courierService';

jest.mock('../../../../hooks/useCurrency', () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} ج.م`,
    currency: 'EGP',
  }),
}));

jest.mock('../../../../services/courierService', () => ({
  __esModule: true,
  default: {
    listPayroll: jest.fn().mockResolvedValue({
      success: true,
      data: {
        month: '2026-11',
        totals: {
          couriersCount: 2,
          totalBaseSalary: 8000,
          totalBonus: 400,
          totalCommission: 0,
          totalDeductions: 0,
          totalNetPayable: 8400,
        },
        payrolls: [
          {
            id: 'payroll-1',
            month: '2026-11',
            courierId: 'courier-1',
            courier: {
              name: 'كابتن محمود',
              phone: '01012345678',
            },
            documentsStatus: 'VERIFIED',
            compensationModel: 'SALARY_PLUS_BONUS',
            deliveredCount: 40,
            baseSalary: 4000,
            bonus: 60,
            commission: 0,
            deductions: 0,
            netPayable: 4060,
            status: 'DRAFT',
            notes: null,
          },
          {
            id: 'payroll-2',
            month: '2026-11',
            courierId: 'courier-2',
            courier: {
              name: 'كابتن سامح',
              phone: '01123456789',
            },
            documentsStatus: 'PENDING_REVIEW',
            compensationModel: 'SALARY_PLUS_BONUS',
            deliveredCount: 55,
            baseSalary: 4000,
            bonus: 340,
            commission: 0,
            deductions: 0,
            netPayable: 4340,
            status: 'APPROVED',
            notes: null,
          },
        ],
      },
    }),
    runPayroll: jest.fn().mockResolvedValue({ success: true, count: 2 }),
    approvePayroll: jest.fn().mockResolvedValue({ success: true, data: { id: 'payroll-1', status: 'APPROVED' } }),
    payPayroll: jest.fn().mockResolvedValue({ success: true, data: { id: 'payroll-2', status: 'PAID' } }),
    getTreasuryAccounts: jest.fn().mockResolvedValue({
      success: true,
      data: [{ id: 'treasury-main', name: 'الخزينة الرئيسية', balance: 50000 }],
    }),
  },
}));

describe('CourierPayrollPage Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payroll summary, ribbons, and courier rows cleanly', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CourierPayrollPage />
        </BrowserRouter>
      );
    });

    expect(await screen.findByText('مسير رواتب ومكافآت المناديب')).toBeInTheDocument();
    expect(await screen.findByText('كابتن محمود')).toBeInTheDocument();
    expect(await screen.findByText('كابتن سامح')).toBeInTheDocument();
  });

  it('allows clicking approve on a draft payroll', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <CourierPayrollPage />
        </BrowserRouter>
      );
    });

    const approveBtn = await screen.findByRole('button', { name: /اعتماد/i });
    expect(approveBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(approveBtn);
    });

    await waitFor(() => {
      expect(courierService.approvePayroll).toHaveBeenCalledWith('payroll-1');
    });
  });
});
