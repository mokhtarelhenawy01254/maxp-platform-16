// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PaymentSection from '../sections/PaymentSection';
import { useCartStore } from '../store/useCartStore';
import { useCheckoutStore } from '../store/useCheckoutStore';

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: {
        id: 'company-test',
        name: 'Swan Store',
        currency: 'EGP',
        settings: {},
      },
      storefront: {
        storefrontFeatures: {
          enabledPaymentMethods: ['cod', 'wallet'],
        },
        settings: {
          walletPaymentSettings: {
            enabled: true,
            walletNumber: '01012345678',
            recipientName: 'سوان ستور',
            discountEnabled: true,
            discountPercent: 11,
            showDiscountBadge: true,
          },
        },
      },
    },
    isLoading: false,
  }),
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: { id: 'modern-minimal', pages: {} },
  }),
}));

vi.mock('../hooks/useCheckoutShippingQuote', () => ({
  useCheckoutShippingQuote: () => ({
    shippingCost: 50,
    shippingHelpText: '',
  }),
}));

vi.mock('../hooks/useCheckout', () => ({
  useCheckout: () => ({
    handlePlaceOrder: vi.fn(),
    isSubmitting: false,
  }),
}));

vi.mock('../hooks/useStorefrontFacebookTracking', () => ({
  useStorefrontFacebookTracking: () => ({
    trackInitiateCheckoutEvent: vi.fn(),
  }),
}));

describe('PaymentSection payment offers discount', () => {
  beforeEach(() => {
    cleanup();
    useCheckoutStore.getState().resetCheckout();
    useCartStore.setState({
      isOpen: false,
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          name: 'Classic Sneaker',
          price: 1000,
          quantity: 1,
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('displays the 11% discount badge on wallet payment option even when COD is selected', () => {
    render(
      <MemoryRouter>
        <PaymentSection />
      </MemoryRouter>,
    );

    // COD is selected by default
    expect(useCheckoutStore.getState().paymentMethod).toBe('cod');

    // Incentive banner is visible
    expect(screen.getByText('عرض خاص:')).toBeInTheDocument();

    // Discount badge on wallet method button is visible
    expect(screen.getByText(/🎁 خصم 11% عند الدفع بالمحفظة/i)).toBeInTheDocument();
  });

  it('updates total and shows discount confirmation when wallet is clicked', () => {
    render(
      <MemoryRouter>
        <PaymentSection />
      </MemoryRouter>,
    );

    // Click wallet payment option
    const walletBtn = screen.getByRole('button', { name: /تحويل على سوان ستور/i });
    fireEvent.click(walletBtn);

    // Payment method switched to wallet
    expect(useCheckoutStore.getState().paymentMethod).toBe('wallet');

    // Confirmation banner is displayed
    expect(
      screen.getByText(/تم تطبيق خصم الدفع الإلكتروني \(11%\) بنجاح!/i),
    ).toBeInTheDocument();

    // 11% discount line is shown
    expect(screen.getAllByText(/خصم الدفع الإلكتروني \(11%\)/i).length).toBeGreaterThan(0);
  });
});
