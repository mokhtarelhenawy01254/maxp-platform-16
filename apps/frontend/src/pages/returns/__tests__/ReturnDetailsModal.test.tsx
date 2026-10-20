// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReturnDetailsModal from '../ReturnDetailsModal';
import { returnService } from '../../../services/returnService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'returns.k_189': 'طلب رقم #',
        'returns.k_190': 'تفاصيل ومراجعة',
        'returns.k_191': 'محاولات التواصل',
        'returns.k_192': 'سجل النشاط',
        'returns.k_209': 'تسجيل محاولة اتصال جديدة',
        'returns.k_210': 'وسيلة التواصل',
        'returns.k_211': 'النتيجة',
        'returns.k_212': 'إعادة اتصال لاحقاً',
        'returns.k_213': 'ملاحظات التواصل',
        'returns.k_214': 'حفظ محاولة التواصل',
        'returns.k_215': 'سجل التواصل السابقة',
        'returns.k_216': 'لا توجد محاولات تواصل مسجلة',
        'returns.k_217': 'لا يوجد نشاط مسجل',
        'returns.k_220': 'إغلاق',
        'returns.k_134': 'اعتماد المراجعة',
        'returns.k_105': 'جاري الحفظ...',
        'returns.k_13': 'الكل',
        'returns.k_30': '-- اختر --',
        'returns.k_201': 'بيانات المراجعة الإدارية',
        'returns.k_202': 'الجهة المسؤولة',
        'returns.k_154': 'سبب الإرجاع',
        'returns.k_156': 'ملاحظات العميل',
        'returns.k_207': 'ملاحظات الإدارة',
        'returns.k_254': 'شركة الشحن',
        'returns.k_255': 'نوع المرتجع',
        'returns.k_228': 'تكلفة الشحن الراجع',
        'returns.k_229': 'صافي التسوية',
        'returns.k_119': 'تم تحديث المراجعة بنجاح',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('../../../services/returnService', () => ({
  returnService: {
    getCategories: vi.fn().mockResolvedValue({
      data: [
        { id: 'cat-1', name: 'خدمة العملاء', defaultRole: 'CUSTOMER' },
        { id: 'cat-2', name: 'الشحن والتوصيل', defaultRole: 'SHIPPING' },
      ],
    }),
    getReasons: vi.fn().mockResolvedValue({
      data: [
        { id: 'reason-1', categoryId: 'cat-1', reason: 'العميل تراجع عن الشراء' },
        { id: 'reason-2', categoryId: 'cat-2', reason: 'تلف أثناء الشحن' },
      ],
    }),
    getReturnShippingCompanies: vi.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 'ship-1',
            name: 'بوسطة Bosta',
            isActive: true,
            returnTypes: [
              { id: 'rt-1', name: 'استرجاع عادي', costModel: 'FIXED', fixedAmount: 45, isActive: true },
            ],
          },
        ],
      },
    }),
    getContactHistory: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'attempt-1',
          method: 'PHONE',
          result: 'ANSWERED',
          notes: 'تم التواصل مع العميل وتم تأكيد الاسترجاع',
          createdAt: new Date().toISOString(),
          user: { firstName: 'أحمد', lastName: 'علي' },
        },
      ],
    }),
    getActivityLog: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'act-1',
          action: 'REVIEWED',
          createdAt: new Date().toISOString(),
          user: { firstName: 'سارة', lastName: 'محمد', role: 'ADMIN' },
          details: {
            responsibleParty: 'CUSTOMER',
            reason: 'العميل تراجع عن الشراء',
            shippingReturnCost: 45,
            settlementAmount: 150,
          },
        },
      ],
    }),
    updateRequest: vi.fn().mockResolvedValue({ success: true }),
    addContactAttempt: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ReturnDetailsModal Suite', () => {
  const mockRequest = {
    id: 'ret-123',
    orderId: 'ord-456',
    status: 'PENDING',
    responsibleParty: 'CUSTOMER',
    reasonId: 'reason-1',
    customerNotes: 'ملاحظة العميل الأصلية',
    adminNotes: 'ملاحظة الإدارة الأصلية',
    shippingReturnCost: 45,
    settlementAmount: 150,
    createdAt: new Date().toISOString(),
    order: {
      orderNumber: 'ORD-998877',
      currency: 'ج.م',
      codDepositPaid: true,
      codDepositAmount: 50,
      codDepositRefunded: true,
    },
  } as unknown as Parameters<typeof ReturnDetailsModal>[0]['request'];

  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders modal header, financial settlement, and review inputs', async () => {
    await act(async () => {
      render(
        <ReturnDetailsModal
          request={mockRequest}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />
      );
    });

    expect(screen.getByText(/ORD-998877/)).toBeInTheDocument();
    expect(screen.getByText(/التسوية المالية/)).toBeInTheDocument();
    expect(screen.getByText(/مستردة/)).toBeInTheDocument();

    await waitFor(() => {
      expect(returnService.getCategories).toHaveBeenCalled();
      expect(returnService.getReasons).toHaveBeenCalled();
    });
  });

  it('switches to contact tab and renders contact attempt form and history', async () => {
    await act(async () => {
      render(
        <ReturnDetailsModal
          request={mockRequest}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />
      );
    });

    const contactTabBtn = screen.getByRole('button', { name: /محاولات التواصل/i });
    await act(async () => {
      fireEvent.click(contactTabBtn);
    });

    await waitFor(() => {
      expect(returnService.getContactHistory).toHaveBeenCalledWith('ret-123');
    });

    expect(await screen.findByText(/أحمد علي/)).toBeInTheDocument();
    expect(screen.getByText(/تم التواصل مع العميل وتم تأكيد الاسترجاع/)).toBeInTheDocument();
  });

  it('switches to activity tab and displays activity timeline', async () => {
    await act(async () => {
      render(
        <ReturnDetailsModal
          request={mockRequest}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />
      );
    });

    const activityTabBtn = screen.getByRole('button', { name: /سجل النشاط/i });
    await act(async () => {
      fireEvent.click(activityTabBtn);
    });

    await waitFor(() => {
      expect(returnService.getActivityLog).toHaveBeenCalledWith('ret-123');
    });

    expect(await screen.findByText(/سارة محمد/)).toBeInTheDocument();
    expect(screen.getByText(/العميل تراجع عن الشراء/)).toBeInTheDocument();
  });

  it('submits updated review data and triggers onUpdate', async () => {
    await act(async () => {
      render(
        <ReturnDetailsModal
          request={mockRequest}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />
      );
    });

    const saveBtn = screen.getByRole('button', { name: /اعتماد المراجعة/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(returnService.updateRequest).toHaveBeenCalledWith('ret-123', expect.objectContaining({
        responsibleParty: 'CUSTOMER',
        isReviewed: true,
      }));
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    await act(async () => {
      render(
        <ReturnDetailsModal
          request={mockRequest}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />
      );
    });

    const closeBtn = screen.getByRole('button', { name: /إغلاق/i });
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
