// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import CartUpsellHost from '../components/CartUpsellHost';
import { useCartStore } from '../store/useCartStore';
import { storefrontFetch } from '../../utils/storefrontApi';

vi.mock('../../utils/storefrontApi', () => ({
  storefrontFetch: vi.fn(async () => ({ data: [] })),
}));

vi.mock('../utils/appUsageTracking', () => ({
  trackStorefrontAppUsage: vi.fn(async () => undefined),
}));

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { currency: 'EGP' },
      storefront: {
        settings: { currency: 'EGP' },
      },
    },
  }),
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: 'khemet-luxe-eg',
      direction: 'rtl',
    },
  }),
}));

vi.mock('../preview/previewContext', () => ({
  isMarketplaceThemePreview: () => false,
  resolvePreviewThemeId: () => null,
}));

describe('KHEMET cart upsell fallback', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.mocked(storefrontFetch).mockClear();
    useCartStore.setState({
      isOpen: true,
      items: [
        {
          id: 'swan-blue-41',
          productId: 'swan',
          variantId: 'swan-blue-41',
          name: 'كوتشي سوان',
          price: 330,
          basePrice: 330,
          quantity: 1,
          imageUrl: 'https://example.com/swan.jpg',
          attributes: {
            اللون: 'كحلي',
            المقاس: '41',
          },
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    useCartStore.setState({ items: [], isOpen: false });
  });

  it('keeps an upsell surface visible when recommendation APIs return no products', async () => {
    render(
      <MemoryRouter initialEntries={['/product/kotshy-soan']}>
        <CartUpsellHost open />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('khemet-cart-conversion-nudges')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /زودي قطعة/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /افتحي الشوب/ })).toHaveAttribute(
      'href',
      '/shop',
    );
  });

  it('lets the fallback quantity CTA increase the current cart item', async () => {
    render(
      <MemoryRouter initialEntries={['/product/kotshy-soan']}>
        <CartUpsellHost open />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /زودي قطعة/ }));

    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });
});
