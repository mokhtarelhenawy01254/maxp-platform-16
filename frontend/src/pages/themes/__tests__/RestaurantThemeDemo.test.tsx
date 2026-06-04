// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../storefront/hooks/useProducts', () => ({
  useProducts: vi.fn(),
}));

import { useProducts } from '../../../storefront/hooks/useProducts';
import RestaurantThemeDemo from '../RestaurantThemeDemo';

const mockUseProducts = vi.mocked(useProducts);

describe('RestaurantThemeDemo', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    mockUseProducts.mockReturnValue({
      products: [],
      pagination: { total: 0, page: 1, limit: 20, pages: 1 },
      isLoading: false,
      error: null,
    });

    Object.defineProperty(window, 'scrollTo', {
      writable: true,
      value: vi.fn(),
    });
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts with an isolated empty demo cart even if storefront storage exists', async () => {
    localStorage.setItem(
      'sf-cart-storage',
      JSON.stringify({
        state: {
          items: [
            {
              id: 'persisted-item',
              productId: 'persisted-item',
              name: 'Persisted Storefront Item',
              price: 999,
              quantity: 3,
            },
          ],
        },
        version: 0,
      }),
    );

    render(<RestaurantThemeDemo />);

    expect(
      screen.getByRole('button', {
        name: /سلة الطلب/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /راش كومبو/i })).toBeInTheDocument();
  });

  it('turns the hero CTA into a real order flow from deal to confirmation', async () => {
    const user = userEvent.setup();

    render(<RestaurantThemeDemo />);

    await user.click(screen.getByRole('button', { name: /اطلب العرض/i }));

    expect(screen.getByRole('button', { name: /الكومبوهات/i })).toHaveClass('bg-[#ff6b2c]');
    expect(screen.queryByRole('heading', { name: /فايربيرد تشيكن/i })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /أضف للسلة/i })[0]!);
    expect(screen.getByRole('heading', { name: /سلة الطلب/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /كمّل الطلب/i }));
    expect(screen.getByRole('heading', { name: /كمّل بيانات الطلب/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText('الاسم الكامل'), 'مختار تست');
    await user.type(screen.getByLabelText('رقم الموبايل'), '01000000000');
    await user.type(screen.getByLabelText('العنوان'), 'مدينة نصر، عباس العقاد');

    await user.click(screen.getByRole('button', { name: /أكد الطلب الآن/i }));

    expect(screen.getByText(/تم تأكيد الطلب/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /مختار تست.*طلبك اتحرك/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /سلة الطلب/i,
      }),
    ).toBeInTheDocument();
  });
});
