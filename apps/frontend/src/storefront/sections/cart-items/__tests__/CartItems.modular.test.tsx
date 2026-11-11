// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CartItems } from '../../CartItems';
import type { CartItem } from '../../../store/useCartStore';

const mockUseCartStore = vi.hoisted(() => vi.fn());

vi.mock('../../../store/useCartStore', () => ({
  useCartStore: () => mockUseCartStore(),
}));

vi.mock('../../../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { currency: 'EGP' },
      storefront: {
        settings: { currency: 'EGP' },
      },
    },
  }),
}));

vi.mock('../../../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: 'default',
      name: 'Default Store',
      direction: 'rtl',
    },
  }),
}));

vi.mock('../../../components/QuantitySelector', () => ({
  default: ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div data-testid="quantity-selector">
      <button onClick={() => onChange(value - 1)}>-</button>
      <span>{value}</span>
      <button onClick={() => onChange(value + 1)}>+</button>
    </div>
  ),
}));

vi.mock('../../../components/StorefrontProductImage', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} data-testid="storefront-product-image" />,
}));

vi.mock('../../../components/CartUpsellHost', () => ({
  default: () => <div data-testid="cart-upsell-host" />,
}));

describe('CartItems Modular Architecture', () => {
  let queryClient: QueryClient;
  const mockUpdateQuantity = vi.fn();
  const mockRemoveItem = vi.fn();
  const mockRemoveQuantityOfferGroup = vi.fn();

  beforeEach(() => {
    cleanup();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    mockUpdateQuantity.mockClear();
    mockRemoveItem.mockClear();
    mockRemoveQuantityOfferGroup.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders empty cart state with title, description and continue shopping link', () => {
    mockUseCartStore.mockReturnValue({
      items: [],
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      removeQuantityOfferGroup: mockRemoveQuantityOfferGroup,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CartItems
            section={{ variant: 'standard' }}
            settings={{
              emptyTitle: 'سلتك فارغة حالياً',
              emptyText: 'تصفح منتجاتنا المميزة وأضف ما يعجبك.',
              continueShoppingText: 'ابدأ التسوق الآن',
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('سلتك فارغة حالياً')).toBeInTheDocument();
    expect(screen.getByText('تصفح منتجاتنا المميزة وأضف ما يعجبك.')).toBeInTheDocument();
    expect(screen.getByText('ابدأ التسوق الآن')).toBeInTheDocument();
  });

  it('renders single cart item row with quantity update and remove button', () => {
    const singleItem: CartItem = {
      id: 'cart-item-1',
      productId: 'prod-1',
      name: 'هودي قطني مريح',
      price: 450,
      quantity: 2,
      attributes: { المقاس: 'L', اللون: 'أسود' },
    };

    mockUseCartStore.mockReturnValue({
      items: [singleItem],
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      removeQuantityOfferGroup: mockRemoveQuantityOfferGroup,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CartItems
            section={{ variant: 'standard' }}
            settings={{
              title: 'مراجعة المشتريات',
              subtitle: 'راجع الكميات والأسعار قبل إتمام الطلب.',
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('مراجعة المشتريات')).toBeInTheDocument();
    expect(screen.getByText('هودي قطني مريح')).toBeInTheDocument();
    expect(screen.getByText('المقاس: L')).toBeInTheDocument();
    expect(screen.getByText('اللون: أسود')).toBeInTheDocument();

    const increaseBtn = screen.getByText('+');
    fireEvent.click(increaseBtn);
    expect(mockUpdateQuantity).toHaveBeenCalledWith('cart-item-1', 3);

    const removeBtn = screen.getByRole('button', { name: /إزالة المنتج هودي قطني مريح/i });
    fireEvent.click(removeBtn);
    expect(mockRemoveItem).toHaveBeenCalledWith('cart-item-1');
  });

  it('renders command-cart variant with momentum timer and free shipping progress', () => {
    const singleItem: CartItem = {
      id: 'cart-item-pc',
      productId: 'prod-pc',
      name: 'كارت شاشة RTX 4070',
      price: 32000,
      quantity: 1,
    };

    mockUseCartStore.mockReturnValue({
      items: [singleItem],
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      removeQuantityOfferGroup: mockRemoveQuantityOfferGroup,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CartItems
            section={{ variant: 'command-cart' }}
            settings={{
              title: 'عربة الأجهزة',
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('عربة الأجهزة')).toBeInTheDocument();
    expect(screen.getByText(/حجز المخزون والمراجعة محفوظ لك لمدة:/i)).toBeInTheDocument();
    expect(screen.getByText('تم تفعيل الشحن المحمي')).toBeInTheDocument();
  });

  it('renders coupon row below items list with coupon input and apply button', () => {
    const singleItem: CartItem = {
      id: 'cart-item-coupon-test',
      productId: 'prod-1',
      name: 'منتج تجريبي',
      price: 250,
      quantity: 1,
    };

    mockUseCartStore.mockReturnValue({
      items: [singleItem],
      updateQuantity: mockUpdateQuantity,
      removeItem: mockRemoveItem,
      removeQuantityOfferGroup: mockRemoveQuantityOfferGroup,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CartItems
            section={{ variant: 'compact' }}
            settings={{
              couponPlaceholder: 'أدخل كود الخصم',
              couponButtonText: 'تطبيق الخصم',
              continueShoppingText: 'العودة للتسوق',
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByPlaceholderText('أدخل كود الخصم')).toBeInTheDocument();
    expect(screen.getByText('تطبيق الخصم')).toBeInTheDocument();
    expect(screen.getByText('العودة للتسوق')).toBeInTheDocument();
  });
});
