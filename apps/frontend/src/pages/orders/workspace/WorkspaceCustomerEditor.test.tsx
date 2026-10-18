import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkspaceCustomerEditor, parseCleanAddress } from './WorkspaceCustomerEditor';
import type { WorkspaceOrder } from './types';

jest.mock('../../../services/apiClient', () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({ data: { success: true, data: { cost: 50 } } }),
  },
}));

jest.mock('../../../components/ui/GovernorateAreaSearch', () => ({
  GovernorateAreaSearch: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="gov-search"
      placeholder={placeholder}
      value={`${value.governorate} - ${value.area}`}
      onChange={(e) => onChange({ governorate: 'الجيزة', area: 'الدقي' })}
    />
  ),
}));

describe('WorkspaceCustomerEditor Suite', () => {
  const mockOrder: WorkspaceOrder = {
    id: 'ord-123',
    orderNumber: 'ORD-123',
    customerName: 'أحمد محمود',
    customerPhone: '01012345678',
    secondaryPhone: '01198765432',
    governorate: 'القاهرة',
    city: 'المعادي',
    shippingAddress: 'شارع 9، عمارة 12',
    notes: 'الاتصال قبل التوصيل',
    total: 350,
    shipping: 40,
    status: 'PENDING',
    paymentStatus: 'UNPAID',
    items: [],
    createdAt: new Date().toISOString(),
  };

  it('correctly parses JSON address strings or returns plain text', () => {
    expect(parseCleanAddress('{"address":"شارع النصر"}')).toBe('شارع النصر');
    expect(parseCleanAddress('شارع عادي')).toBe('شارع عادي');
    expect(parseCleanAddress('')).toBe('');
  });

  it('renders customer name, phones, and address in view mode', () => {
    render(
      <WorkspaceCustomerEditor
        order={mockOrder}
        isArabic={true}
        onSaveCustomer={jest.fn()}
      />
    );

    expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
    expect(screen.getByText('01012345678')).toBeInTheDocument();
    expect(screen.getByText('01198765432')).toBeInTheDocument();
    expect(screen.getByText(/القاهرة • المعادي/)).toBeInTheDocument();
  });

  it('switches to edit mode on edit button click and renders inputs', () => {
    const onSaveCustomer = jest.fn();
    render(
      <WorkspaceCustomerEditor
        order={mockOrder}
        isArabic={true}
        onSaveCustomer={onSaveCustomer}
      />
    );

    const editBtn = screen.getByTitle('تعديل بيانات العميل');
    fireEvent.click(editBtn);

    expect(screen.getByText('اسم العميل')).toBeInTheDocument();
    expect(screen.getByText('رقم الهاتف الأساسي')).toBeInTheDocument();
    expect(screen.getByText('حفظ البيانات')).toBeInTheDocument();

    const cancelBtn = screen.getByText('إلغاء');
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('حفظ البيانات')).not.toBeInTheDocument();
  });
});
