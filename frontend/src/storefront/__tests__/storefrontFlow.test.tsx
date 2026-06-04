// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StorefrontShell from '../StorefrontShell';
import { useCartStore } from '../store/useCartStore';
import { useCheckoutStore } from '../store/useCheckoutStore';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const companyId = 'company123';

const categories = [
  { id: 'cat-clothing', name: 'Clothing', slug: 'clothing' },
  { id: 'cat-accessories', name: 'Accessories', slug: 'accessories' },
];

const products = [
  {
    id: 'tee-001',
    name: 'Atlas Tee',
    description: '<p>Soft cotton tee for daily wear.</p>',
    price: 1200,
    comparePrice: 1500,
    images: ['https://example.com/atlas-tee.jpg'],
    slug: 'atlas-tee',
    categoryId: 'cat-clothing',
    category: { id: 'cat-clothing', name: 'Clothing' },
    productVariants: [
      {
        id: 'tee-red-m',
        name: 'Red / M',
        price: 1200,
        comparePrice: 1500,
        sku: 'TEE-RED-M',
        attributes: { Color: 'Red', Size: 'M' },
      },
      {
        id: 'tee-blue-l',
        name: 'Blue / L',
        price: 1350,
        comparePrice: 1500,
        sku: 'TEE-BLUE-L',
        attributes: { Color: 'Blue', Size: 'L' },
      },
    ],
  },
  {
    id: 'bag-001',
    name: 'Orbit Tote',
    description: '<p>Structured everyday tote.</p>',
    price: 2200,
    images: ['https://example.com/orbit-tote.jpg'],
    slug: 'orbit-tote',
    categoryId: 'cat-accessories',
    category: { id: 'cat-accessories', name: 'Accessories' },
    productVariants: [],
  },
  {
    id: 'cap-001',
    name: 'North Cap',
    description: '<p>Lightweight cap.</p>',
    price: 700,
    images: ['https://example.com/north-cap.jpg'],
    slug: 'north-cap',
    categoryId: 'cat-accessories',
    category: { id: 'cat-accessories', name: 'Accessories' },
    productVariants: [],
  },
];

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

describe('Storefront browser flow', () => {
  let queryClient: QueryClient;
  let orderBodies: Array<Record<string, unknown>>;
  const asyncQueryTimeout = 3000;

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    useCartStore.setState({ items: [], isOpen: false });
    useCheckoutStore.getState().resetCheckout();
    queryClient = createQueryClient();
    orderBodies = [];

    window.history.pushState({}, '', `/shop?companyId=${companyId}`);
    localStorage.setItem('storefront_companyId', companyId);

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = (init?.method || 'GET').toUpperCase();
      const url = new URL(requestUrl, window.location.origin);

      const jsonResponse = (payload: unknown, status = 200) =>
        Promise.resolve(
          new Response(JSON.stringify(payload), {
            status,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );

      if (url.pathname.endsWith('/public/storefront/settings')) {
        return jsonResponse({
          success: true,
          data: {
            company: {
              id: companyId,
              name: 'Mock Outfitters',
              slug: 'mock-outfitters',
              logo: null,
              currency: 'EGP',
              settings: {},
            },
            storefront: {
              themeId: 'bold-fashion',
              pages: {
                home: { sections: ['hero-banner', 'featured-products', 'newsletter'] },
                shop: { sections: ['filters-sidebar', 'product-grid'] },
                pdp: { sections: ['product-gallery', 'product-info', 'reviews'] },
                cart: { sections: ['cart-items', 'order-summary'] },
                checkout: { sections: ['checkout-form', 'payment'] },
              },
              settings: {
                storeName: 'Mock Outfitters',
                currency: 'EGP',
              },
              storefrontFeatures: {
                quickViewEnabled: true,
                comparisonEnabled: false,
                wishlistEnabled: false,
                recentlyViewedEnabled: false,
                advancedFiltersEnabled: true,
                productCardStyle: 'default',
                gridAddToCartIcon: false,
                gridDiscountBanner: true,
              },
            },
            templateId: null,
            lastUpdated: '2026-03-25T00:00:00.000Z',
          },
        });
      }

      if (
        url.pathname.endsWith('/public/categories') ||
        url.pathname.endsWith('/public/products/categories')
      ) {
        return jsonResponse({ success: true, data: categories });
      }

      if (url.pathname.endsWith('/public/products') && method === 'GET') {
        const category = url.searchParams.get('category');
        const filteredProducts = category
          ? products.filter((product) => product.categoryId === category)
          : products;

        return jsonResponse({
          success: true,
          data: filteredProducts,
          pagination: {
            total: filteredProducts.length,
            page: 1,
            limit: Number(url.searchParams.get('limit') || 12),
            pages: 1,
          },
        });
      }

      if (url.pathname.includes('/public/products/') && method === 'GET') {
        const requestedId = decodeURIComponent(url.pathname.split('/').pop() || '');
        const product = products.find(
          (item) => item.id === requestedId || item.slug === requestedId,
        );

        return product
          ? jsonResponse({ success: true, data: product })
          : jsonResponse({ success: false, message: 'Not found' }, 404);
      }

      if (url.pathname.includes('/shipping-zones/public/') && method === 'GET') {
        return jsonResponse({ success: true, data: { price: 85 } });
      }

      if (url.pathname.endsWith('/public/orders') && method === 'POST') {
        const parsedBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
        orderBodies.push(parsedBody);

        return jsonResponse({
          success: true,
          data: {
            id: 'ord_12345678',
            orderNumber: 'MOCK-1001',
          },
        });
      }

      return jsonResponse({ success: false, message: `Unhandled request: ${url.pathname}` }, 404);
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useCartStore.setState({ items: [], isOpen: false });
    useCheckoutStore.getState().resetCheckout();
  });

  it(
    'covers shop filtering, PDP variant selection, cart, and checkout submission',
    async () => {
      const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <StorefrontShell subdomain="mock-outfitters" />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole(
        'heading',
        { name: 'All Products' },
        { timeout: asyncQueryTimeout },
      ),
    ).toBeInTheDocument();
    expect((await screen.findAllByRole('button', { name: 'Accessories' })).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: 'Accessories' })[0]!);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Category Collection' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Atlas Tee' })).not.toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button', { name: 'Clear all filters' })[0]!);

    expect(
      await screen.findByRole(
        'heading',
        { name: 'All Products' },
        { timeout: asyncQueryTimeout },
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Atlas Tee' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Atlas Tee/i }));

    expect(await screen.findByRole('heading', { name: 'Atlas Tee', level: 1 })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Select Color Blue' }));
    await user.click(screen.getByRole('button', { name: 'Select Size L' }));

    await waitFor(() => {
      expect(screen.getByText(/EGP\s*1,350\.00/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add to Cart' }));

    const checkoutLink = await screen.findByRole('link', { name: /Checkout/i });
    expect(await screen.findByText(/Color:\s*Blue/)).toBeInTheDocument();
    expect(await screen.findByText(/Size:\s*L/)).toBeInTheDocument();

    await user.click(checkoutLink);

    expect(await screen.findByRole('heading', { name: /1 Contact Information/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Full Name'), 'Mokhtar QA');
    await user.type(screen.getByLabelText('Email Address'), 'mokhtar@example.com');
    await user.type(screen.getByLabelText('Phone Number'), '+20 100 000 0000');
    await user.type(screen.getByLabelText('Street Address'), '42 Nile Street');
    await user.type(screen.getByLabelText('City'), 'Cairo');
    await user.selectOptions(screen.getByLabelText('Governorate'), 'Cairo');

    expect(await screen.findByText('Shipping to Cairo calculated successfully.')).toBeInTheDocument();
    expect(screen.getByText(/EGP\s*1,435\.00/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm Order' }));

    expect(await screen.findByRole('heading', { name: 'Order Placed!' })).toBeInTheDocument();
    expect(screen.getByText(/MOCK-1001/i)).toBeInTheDocument();

      expect(orderBodies).toHaveLength(1);
      expect(orderBodies[0]).toEqual(
        expect.objectContaining({
          companyId,
          guestName: 'Mokhtar QA',
          guestEmail: 'mokhtar@example.com',
          guestPhone: '+20 100 000 0000',
          paymentMethod: 'cod',
          shippingAddress: expect.objectContaining({
            address: '42 Nile Street',
            city: 'Cairo',
            governorate: 'Cairo',
          }),
          subtotal: 1350,
          shippingCost: 85,
          total: 1435,
          items: expect.arrayContaining([
            expect.objectContaining({
              productId: 'tee-001',
              variantId: 'tee-blue-l',
              quantity: 1,
              attributes: {
                Color: 'Blue',
                Size: 'L',
              },
            }),
          ]),
        }),
      );
    },
    15000,
  );
});
