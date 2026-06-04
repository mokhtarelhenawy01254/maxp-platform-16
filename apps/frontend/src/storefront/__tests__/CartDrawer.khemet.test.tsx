// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import CartDrawer from '../components/CartDrawer';
import { useCartStore } from '../store/useCartStore';

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
      pages: {
        cart: {
          settings: {
            title: 'سلة Flora',
            checkoutLabel: 'كمّلي الطلب',
            continueShoppingText: 'كمّلي التصفح',
            subtotalLabel: 'إجمالي السلة',
            dialogLabel: 'سلة Flora',
          },
        },
      },
    },
  }),
}));

vi.mock('../components/CartUpsellHost', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <section data-testid="cart-upsell">اقتراحات السلة</section> : null,
}));

vi.mock('../components/StorefrontProductImage', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe('KHEMET cart drawer conversion layout', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    scrollToSpy = vi.fn();
    Element.prototype.scrollTo = scrollToSpy;
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

  it('keeps checkout visible outside the scrollable upsell area when the drawer opens', async () => {
    render(
      <MemoryRouter initialEntries={['/product/kotshy-soan']}>
        <CartDrawer />
      </MemoryRouter>,
    );

    const dialog = screen.getByRole('dialog', { name: /سلة Flora/ });
    const scrollRegion = dialog.querySelector('.min-h-0.flex-1.overflow-y-auto');
    const checkoutButton = screen.getByRole('button', { name: /كمّلي الطلب/ });

    expect(scrollRegion).toBeInTheDocument();
    expect(scrollRegion).toContainElement(screen.getByText('كوتشي سوان'));
    expect(scrollRegion).toContainElement(await screen.findByTestId('cart-upsell'));
    expect(scrollRegion).not.toContainElement(checkoutButton);
    expect(checkoutButton.parentElement).toHaveClass('shrink-0');
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0 });
  });

  it('uses the larger KHEMET cart footprint and a stronger checkout CTA', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/product/kotshy-soan']}>
        <CartDrawer />
      </MemoryRouter>,
    );

    const dialog = screen.getByRole('dialog');
    const checkoutButton = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes('330'));

    expect(dialog).toHaveClass('max-w-[44rem]');
    expect(container.querySelector('.h-24.w-24')).toBeInTheDocument();
    expect(checkoutButton).toBeDefined();
    expect(checkoutButton!).toHaveClass('h-14', 'text-base');
  });

  it('keeps a direct quantity upsell available in the KHEMET drawer', () => {
    render(
      <MemoryRouter initialEntries={['/product/kotshy-soan']}>
        <CartDrawer />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('khemet-cart-quantity-upsell')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /زودي قطعة/ }));

    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
    expect(screen.getByRole('link', { name: /افتحي الشوب/ })).toHaveAttribute(
      'href',
      '/shop',
    );
  });
});
