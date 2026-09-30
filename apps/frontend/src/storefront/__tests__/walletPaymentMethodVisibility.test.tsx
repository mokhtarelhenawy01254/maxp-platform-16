// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PdpQuickOrderForm from '../sections/PdpQuickOrderForm';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockUseStorefrontSettings = vi.fn();

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => mockUseStorefrontSettings(),
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: { id: 'modern-minimal' },
  }),
}));

vi.mock('../hooks/useCart', () => ({
  useCart: () => ({
    items: [],
    addItem: vi.fn(),
  }),
}));

vi.mock('../hooks/useCheckoutShippingQuote', () => ({
  useCheckoutShippingQuote: () => ({
    shippingCost: 50,
    quoteStatus: 'idle',
    shippingClassBreakdown: [],
  }),
}));

vi.mock('../hooks/useMinimumOrderSettings', () => ({
  useMinimumOrderSettings: () => ({
    isMet: true,
    message: '',
    progress: 100,
  }),
}));

vi.mock('../../services/customerAuthService', () => ({
  customerAuthService: {
    getStoredCustomerUser: () => null,
  },
}));

vi.mock('../../services/customerAddressService', () => ({
  customerAddressService: {
    getAddresses: vi.fn().mockResolvedValue([]),
    createAddress: vi.fn(),
  },
}));

vi.mock('../../utils/checkoutAddressSettingsHelpers', () => ({
  getResolvedCheckoutAddressMode: () => 'dropdown',
}));

vi.mock('../../services/storeSettingsService', () => ({
  storeSettingsService: {
    getCanonicalGovernorates: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

const mockProduct = {
  id: 'prod-wallet-1',
  name: 'Test Wallet Product',
  slug: 'test-wallet-product',
  price: 250,
  imageUrl: '/wallet-prod.png',
  images: [],
  productVariants: [],
  hasVariants: false,
};

describe('PdpQuickOrderForm wallet payment method visibility', () => {
  it('does NOT render wallet payment option when wallet is deactivated in settings, even if walletNumber is set', () => {
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        company: { id: 'comp-1', currency: 'EGP', name: 'Test Shop' },
        storefront: {
          storefrontFeatures: {
            enabledPaymentMethods: ['cod'], // Wallet is deactivated!
          },
          settings: {
            currency: 'EGP',
            walletPaymentSettings: {
              enabled: false,
              walletNumber: '01012345678',
              recipientName: 'Test Shop',
            },
          },
        },
      },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <PdpQuickOrderForm product={mockProduct as any} />
      </MemoryRouter>
    );

    // Should NOT show wallet payment button
    expect(screen.queryByText('محفظة إلكترونية')).toBeNull();
    expect(screen.queryByText('طريقة الدفع')).toBeNull();
  });

  it('renders wallet payment option when wallet is active in settings and walletNumber is set', () => {
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        company: { id: 'comp-1', currency: 'EGP', name: 'Test Shop' },
        storefront: {
          storefrontFeatures: {
            enabledPaymentMethods: ['cod', 'wallet'], // Wallet is active!
          },
          settings: {
            currency: 'EGP',
            walletPaymentSettings: {
              enabled: true,
              walletNumber: '01012345678',
              recipientName: 'Test Shop',
            },
          },
        },
      },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <PdpQuickOrderForm product={mockProduct as any} />
      </MemoryRouter>
    );

    // Should show wallet payment button
    expect(screen.getByText(/wallet payment|محفظة إلكترونية/i)).toBeTruthy();
    expect(screen.getByText(/cash on delivery|الدفع عند الاستلام/i)).toBeTruthy();
  });

  it('does NOT render COD option when COD is deactivated in settings and wallet is active', () => {
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        company: { id: 'comp-1', currency: 'EGP', name: 'Test Shop' },
        storefront: {
          storefrontFeatures: {
            enabledPaymentMethods: ['wallet'], // COD is deactivated!
          },
          settings: {
            currency: 'EGP',
            walletPaymentSettings: {
              enabled: true,
              walletNumber: '01012345678',
              recipientName: 'Test Shop',
            },
          },
        },
      },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <PdpQuickOrderForm product={mockProduct as any} />
      </MemoryRouter>
    );

    // Wallet button should be visible
    expect(screen.getByText(/wallet payment|محفظة إلكترونية/i)).toBeTruthy();
    // COD button should NOT be visible
    expect(screen.queryByText(/cash on delivery|الدفع عند الاستلام/i)).toBeNull();
  });

  it('renders Card payment option when card is enabled in settings', () => {
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        company: { id: 'comp-1', currency: 'EGP', name: 'Test Shop' },
        storefront: {
          storefrontFeatures: {
            enabledPaymentMethods: ['cod', 'card'],
          },
          settings: {
            currency: 'EGP',
            walletPaymentSettings: null,
          },
        },
      },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <PdpQuickOrderForm product={mockProduct as any} />
      </MemoryRouter>
    );

    // Card button should be visible
    expect(screen.getByText(/card|بطاقة بنكية/i)).toBeTruthy();
    // COD button should also be visible
    expect(screen.getByText(/cash on delivery|الدفع عند الاستلام/i)).toBeTruthy();
  });

  it('updates submit button and shows guidance when card payment method is selected', async () => {
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        company: { id: 'comp-1', currency: 'EGP', name: 'Test Shop' },
        storefront: {
          storefrontFeatures: {
            enabledPaymentMethods: ['cod', 'card'],
          },
          settings: {
            currency: 'EGP',
            walletPaymentSettings: null,
          },
        },
      },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <PdpQuickOrderForm product={mockProduct as any} />
      </MemoryRouter>
    );

    const cardButton = screen.getByText(/card|بطاقة بنكية/i);
    fireEvent.click(cardButton);

    // The submit button text should clearly invite user to proceed to card payment
    expect(screen.getByRole('button', { name: /متابعة للدفع بالبطاقة|Proceed to Card Payment/i })).toBeTruthy();
    // Reassurance badge should be visible
    expect(screen.getByText(/256-bit SSL|تشفير وحماية مصرفية/i)).toBeTruthy();
  });

  it('renders discount badge with discount percent on payment buttons when discount is enabled', () => {
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        company: { id: 'comp-1', currency: 'EGP', name: 'Test Shop' },
        storefront: {
          storefrontFeatures: {
            enabledPaymentMethods: ['cod', 'card'],
          },
          settings: {
            currency: 'EGP',
            walletPaymentSettings: {
              enabled: true,
              discountEnabled: true,
              discountPercent: 10,
              showDiscountBadge: true,
            },
          },
        },
      },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <PdpQuickOrderForm product={mockProduct as any} />
      </MemoryRouter>
    );

    // Verify discount badge text appears
    expect(screen.getByText(/خصم 10%/i)).toBeTruthy();
  });
});
