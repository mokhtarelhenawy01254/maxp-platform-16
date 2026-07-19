// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { StorefrontThemeProvider } from '../engine/ThemeProvider';
import CheckoutForm from '../sections/CheckoutForm';
import { useCheckoutStore } from '../store/useCheckoutStore';
import { useCartStore } from '../store/useCartStore';

const renderCheckoutForm = (ui: ReactElement) =>
  render(
    <MemoryRouter>
      <StorefrontThemeProvider>{ui}</StorefrontThemeProvider>
    </MemoryRouter>,
  );

describe('CheckoutForm semantics', () => {
  afterEach(() => {
    cleanup();
    useCartStore.setState({ items: [], isOpen: false });
  });

  beforeEach(() => {
    sessionStorage.clear();
    useCheckoutStore.getState().resetCheckout();
    useCartStore.setState({
      items: [
        {
          id: 'test-item',
          productId: 'product-1',
          name: 'Test Product',
          price: 100,
          quantity: 1,
        },
      ],
    });
  });

  it('exposes every checkout field through an associated label and autocomplete hint', () => {
    renderCheckoutForm(<CheckoutForm />);

    expect(screen.getByLabelText('الاسم الكامل')).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText('البريد الإلكتروني')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('رقم الهاتف')).toHaveAttribute('autocomplete', 'tel');
    expect(screen.getByLabelText('العنوان بالتفصيل')).toHaveAttribute('autocomplete', 'street-address');
    expect(screen.getByLabelText('المدينة')).toHaveAttribute('autocomplete', 'address-level2');
    expect(screen.getByLabelText('المحافظة')).toHaveAttribute('autocomplete', 'address-level1');
    expect(screen.getByLabelText('ملاحظات على الطلب')).toHaveAttribute('autocomplete', 'off');
  });

  it('renders customized section titles when section settings are provided', () => {
    renderCheckoutForm(
      <CheckoutForm
        settings={{
          contactTitle: 'بيانات التواصل',
          shippingTitle: 'عنوان الشحن',
          notesTitle: 'ملاحظات إضافية',
          notesOptionalLabel: '(اختياري)',
        }}
      />,
    );

    expect(screen.getAllByText('بيانات التواصل').length).toBeGreaterThan(0);
    expect(screen.getAllByText('عنوان الشحن').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ملاحظات إضافية').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(اختياري)').length).toBeGreaterThan(0);
  });
});
