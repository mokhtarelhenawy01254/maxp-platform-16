import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import ReturnSettingsPage from '../ReturnSettingsPage';
import { returnService } from '../../../services/returnService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'returns.k_160': 'إعدادات المرتجعات',
        'returns.k_161': 'تخصيص أعمدة العرض وأسباب الإرجاع وأنواع الشحن',
        'returns.k_162': 'إعدادات العرض',
        'returns.k_163': 'أسباب الإرجاع',
        'returns.k_230': 'أنواع المرتجع',
        'returns.k_164': 'أعمدة جدول المراجعة',
        'returns.k_165': 'تحديد الأعمدة الظاهرة',
        'returns.k_166': 'أزرار التحكم والتصفية',
        'returns.k_167': 'تحديد ظهور أزرار التحكم',
        'returns.k_170': 'حالات الطلب المرتبطة',
        'returns.k_171': 'تحديد الحالات',
        'returns.k_106': 'حفظ الإعدادات',
        'returns.k_105': 'جاري الحفظ...',
        'returns.k_172': 'إضافة الأسباب الافتراضية',
        'returns.k_173': 'تصنيفات الأسباب',
        'returns.k_174': '+ إضافة تصنيف',
        'returns.k_176': 'قائمة أسباب الإرجاع',
        'returns.k_177': '+ إضافة سبب',
        'returns.k_234': 'إضافة نوع مرتجع',
        'returns.k_231': 'إدارة أنواع المرتجعات وسياسات التكلفة',
        'returns.k_255': 'أنواع المرتجع',
        'returns.k_144': 'جاري التحميل...',
        'returns.k_47': 'عمود الطلب',
        'returns.k_48': 'عرض رقم الطلب',
        'returns.k_49': 'عمود العميل',
        'returns.k_50': 'عرض بيانات العميل',
        'returns.k_92': 'تم حفظ إعدادات العرض بنجاح',
        'returns.k_109': 'تعديل التصنيف',
        'returns.k_110': 'إضافة تصنيف جديد',
        'returns.k_182': 'اسم التصنيف',
        'returns.k_183': 'الدور الافتراضي المسند',
        'returns.k_184': 'العميل',
        'returns.k_111': 'المتجر',
        'returns.k_185': 'شركة الشحن',
        'returns.k_112': 'أخرى',
        'returns.k_158': 'إلغاء',
        'returns.k_186': 'حفظ',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('../../../services/returnService', () => ({
  returnService: {
    getSettings: jest.fn().mockResolvedValue({
      data: {
        reviewDisplayConfig: {
          showOrderColumn: true,
          showCustomerColumn: true,
          showCustomerRating: true,
          showCustomerSuccessScore: true,
          showCustomerPhone: true,
          showReasonColumn: true,
          showResponsiblePartyColumn: true,
          showStatusColumn: true,
          showReviewColumn: true,
          showDateColumn: true,
          showActionsColumn: true,
        },
      },
    }),
    updateSettings: jest.fn().mockResolvedValue({ success: true }),
    getCategories: jest.fn().mockResolvedValue({
      data: [
        { id: 'cat-1', name: 'خدمة العملاء', defaultRole: 'CUSTOMER' },
        { id: 'cat-2', name: 'الشحن والتوصيل', defaultRole: 'SHIPPING' },
      ],
    }),
    getReasons: jest.fn().mockResolvedValue({
      data: [
        { id: 'reason-1', categoryId: 'cat-1', reason: 'العميل تراجع عن الشراء', isActive: true },
        { id: 'reason-2', categoryId: 'cat-2', reason: 'تلف أثناء الشحن', isActive: true },
      ],
    }),
    getReturnShippingCompanies: jest.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 'ship-1',
            name: 'بوسطة Bosta',
            isActive: true,
            returnTypes: [
              { id: 'rt-1', name: 'استرجاع عادي', code: 'SENDER_PAYS', costModel: 'FIXED', fixedAmount: 45, isActive: true },
            ],
          },
        ],
      },
    }),
    createCategory: jest.fn().mockResolvedValue({ data: { id: 'cat-new' } }),
    updateCategory: jest.fn().mockResolvedValue({ success: true }),
    deleteCategory: jest.fn().mockResolvedValue({ success: true }),
    createReason: jest.fn().mockResolvedValue({ data: { id: 'reason-new' } }),
    updateReason: jest.fn().mockResolvedValue({ success: true }),
    deleteReason: jest.fn().mockResolvedValue({ success: true }),
    createReturnType: jest.fn().mockResolvedValue({ success: true }),
    updateReturnType: jest.fn().mockResolvedValue({ success: true }),
    deleteReturnType: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ReturnSettingsPage Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders display settings tab with columns and controls sections by default', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/settings?tab=display']}>
          <ReturnSettingsPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('إعدادات المرتجعات')).toBeInTheDocument();
    expect(screen.getByText('أعمدة جدول المراجعة')).toBeInTheDocument();
    expect(screen.getByText('عمود الطلب')).toBeInTheDocument();
    expect(screen.getByText('أزرار التحكم والتصفية')).toBeInTheDocument();
  });

  it('switches to reasons tab and displays categories and reasons lists', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/settings?tab=display']}>
          <ReturnSettingsPage />
        </MemoryRouter>
      );
    });

    const reasonsTabBtn = screen.getByRole('button', { name: /أسباب الإرجاع/i });
    await act(async () => {
      fireEvent.click(reasonsTabBtn);
    });

    expect(await screen.findByText('خدمة العملاء')).toBeInTheDocument();
    expect(screen.getByText('العميل تراجع عن الشراء')).toBeInTheDocument();
    expect(screen.getByText('إضافة الأسباب الافتراضية')).toBeInTheDocument();
  });

  it('switches to types tab and displays return shipping companies and return types', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/settings?tab=display']}>
          <ReturnSettingsPage />
        </MemoryRouter>
      );
    });

    const typesTabBtn = screen.getByRole('button', { name: /أنواع المرتجع/i });
    await act(async () => {
      fireEvent.click(typesTabBtn);
    });

    expect(await screen.findByText('بوسطة Bosta')).toBeInTheDocument();
    expect(screen.getByText('استرجاع عادي')).toBeInTheDocument();
  });

  it('saves display configuration when clicking save button', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/settings?tab=display']}>
          <ReturnSettingsPage />
        </MemoryRouter>
      );
    });

    const saveBtn = await screen.findByRole('button', { name: /حفظ الإعدادات/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(returnService.updateSettings).toHaveBeenCalled();
    });
  });

  it('opens category modal on clicking add category', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/settings?tab=reasons']}>
          <ReturnSettingsPage />
        </MemoryRouter>
      );
    });

    const addCatBtn = await screen.findByRole('button', { name: /\+ إضافة تصنيف/i });
    await act(async () => {
      fireEvent.click(addCatBtn);
    });

    expect(await screen.findByText('إضافة تصنيف جديد')).toBeInTheDocument();
  });
});
