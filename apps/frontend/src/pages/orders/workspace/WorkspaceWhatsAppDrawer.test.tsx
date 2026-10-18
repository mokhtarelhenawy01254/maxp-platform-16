import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WorkspaceWhatsAppDrawer,
  normalizeArabicDigits,
  sanitizeWhatsAppPhone,
} from './WorkspaceWhatsAppDrawer';
import type { WorkspaceOrder } from './types';

jest.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
    i18n: { language: 'ar' },
  }),
}));

const mockOrder: WorkspaceOrder = {
  id: 'ord-123',
  orderNumber: '1001',
  customerName: 'أحمد محمود',
  customerPhone: '01012345678',
  total: 550,
  status: 'PENDING',
  shippingGovernorate: 'القاهرة',
  shippingCity: 'المعادي',
  shippingAddress: 'شارع النصر',
  items: [],
  createdAt: new Date().toISOString(),
  currency: 'EGP',
};

describe('WorkspaceWhatsAppDrawer Suite', () => {
  describe('Helper Functions', () => {
    it('normalizes Arabic-Indic digits to ASCII', () => {
      expect(normalizeArabicDigits('٠١٠١٢٣٤٥٦٧٨')).toBe('01012345678');
    });

    it('sanitizes Egyptian numbers to standard 201 format', () => {
      const { standardPhone } = sanitizeWhatsAppPhone('01012345678');
      expect(standardPhone).toBe('201012345678');
    });

    it('sanitizes Saudi numbers to standard 9665 format', () => {
      const { standardPhone } = sanitizeWhatsAppPhone('0512345678');
      expect(standardPhone).toBe('966512345678');
    });
  });

  describe('Component Rendering', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <WorkspaceWhatsAppDrawer isOpen={false} onClose={jest.fn()} order={mockOrder} />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders customer name, order number, and tabs when open', () => {
      render(
        <WorkspaceWhatsAppDrawer isOpen={true} onClose={jest.fn()} order={mockOrder} />
      );
      expect(screen.getByText('أحمد محمود')).toBeInTheDocument();
      expect(screen.getByText('№ 1001')).toBeInTheDocument();
      expect(screen.getByText('المحادثة الحية')).toBeInTheDocument();
      expect(screen.getByText('قوالب التأكيد والرسائل')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = jest.fn();
      render(
        <WorkspaceWhatsAppDrawer isOpen={true} onClose={onClose} order={mockOrder} />
      );
      const closeBtn = screen.getByLabelText('إغلاق محادثة واتساب');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('switches between chat and templates tab', () => {
      render(
        <WorkspaceWhatsAppDrawer isOpen={true} onClose={jest.fn()} order={mockOrder} />
      );
      const templatesTab = screen.getByText('قوالب التأكيد والرسائل');
      fireEvent.click(templatesTab);
      // Mode tabs should reflect active selection
      expect(templatesTab.closest('button')).toHaveClass('border-emerald-500');
    });
  });
});
