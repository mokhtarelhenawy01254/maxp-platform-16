// @vitest-environment jsdom
/**
 * Shipping Client Admin (SHIP-W2C.1) Frontend Acceptance Tests
 * Verifies rendering of:
 * 1. ClientsPage table, KPIs, and search bar
 * 2. AddClientModal open, submission, and one-time credentials notice
 * 3. ResetAccountModal and status badges
 */

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ClientsPage from '../ClientsPage';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar' },
  }),
}));

const mockClients = [
  {
    id: 'merch-1',
    name: 'متجر الأناقة',
    email: 'elegance@example.com',
    phone: '01012345678',
    address: 'القاهرة',
    isActive: true,
    commissionRate: 10,
    hasAccount: true,
    account: {
      userId: 'usr-1',
      email: 'elegance@example.com',
      role: 'SHIPPING_CLIENT',
      isActive: true,
      lastLoginAt: '2026-11-03T10:00:00Z',
      createdAt: '2026-11-01T10:00:00Z',
    },
    metrics: {
      totalShipments: 15,
      monthShipments: 8,
      deliveredCount: 6,
      returnedCount: 1,
      pendingCount: 1,
      pendingCodAmount: 2450,
    },
  },
  {
    id: 'merch-2',
    name: 'بوتيك الموضة',
    email: 'fashion@example.com',
    phone: '01198765432',
    address: 'الجيزة',
    isActive: true,
    commissionRate: 12,
    hasAccount: false,
    account: null,
    metrics: {
      totalShipments: 0,
      monthShipments: 0,
      deliveredCount: 0,
      returnedCount: 0,
      pendingCount: 0,
      pendingCodAmount: 0,
    },
  },
];

describe('Shipping Client Admin (SHIP-W2C.1) Frontend Acceptance Tests', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/v1/shipping-clients-admin/clients') && (!options || options.method === 'GET' || !options.method)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockClients }),
        });
      }

      if (url.includes('/api/v1/shipping-clients-admin/clients') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'تم إنشاء عميل الشحن وحساب البوابة بنجاح',
              data: {
                merchant: { id: 'merch-3', name: 'متجر جديد', email: 'new@example.com' },
                account: { userId: 'usr-3', role: 'SHIPPING_CLIENT', isActive: true },
                credentials: { email: 'new@example.com', temporaryPassword: 'Ship!TestPass123' },
              },
            }),
        });
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }) as any;
  });

  it('1. Renders ClientsPage with KPI cards and client rows', async () => {
    render(<ClientsPage />);

    expect(screen.getByText('عملاء الشحن')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/البحث بالاسم/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('متجر الأناقة')).toBeInTheDocument();
      expect(screen.getByText('بوتيك الموضة')).toBeInTheDocument();
      expect(screen.getByText('elegance@example.com')).toBeInTheDocument();
      expect(screen.getByText('مفعّل')).toBeInTheDocument();
      expect(screen.getByText('بدون حساب')).toBeInTheDocument();
    });
  });

  it('2. Opens Add Client modal and shows temporary password on creation', async () => {
    render(<ClientsPage />);

    const addBtns = screen.getAllByText('إضافة عميل');
    fireEvent.click(addBtns[0]);

    expect(screen.getByText('إضافة عميل شحن جديد')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/مثال: متجر الرقي/)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/مثال: متجر الرقي/), {
      target: { value: 'متجر جديد' },
    });
    fireEvent.change(screen.getByPlaceholderText('client@example.com'), {
      target: { value: 'new@example.com' },
    });

    const submitBtn = screen.getByRole('button', { name: 'إنشاء العميل' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('بيانات دخول بوابة العميل المؤقتة')).toBeInTheDocument();
      expect(screen.getByText('Ship!TestPass123')).toBeInTheDocument();
      expect(screen.getByText(/انسخ كلمة المرور الآن/)).toBeInTheDocument();
    });
  });

  it('3. Opens Reset Password confirmation modal', async () => {
    render(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('متجر الأناقة').length).toBeGreaterThan(0);
    });

    const resetButtons = screen.getAllByTitle(/إعادة تعيين كلمة المرور/);
    expect(resetButtons.length).toBeGreaterThan(0);
    fireEvent.click(resetButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/هل أنت متأكد من إعادة تعيين كلمة مرور البوابة/)).toBeInTheDocument();
    });
  });
});
