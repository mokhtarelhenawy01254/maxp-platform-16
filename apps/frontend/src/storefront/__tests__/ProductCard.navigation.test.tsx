// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import ProductCard from '../components/ProductCard';
import { StorefrontThemeProvider } from '../engine/ThemeProvider';

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const React = await import('react');
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    Link: ({ to, reloadDocument, children, ...props }: any) =>
      React.createElement(
        'a',
        {
          ...props,
          href: typeof to === 'string' ? to : String(to),
          'data-reload-document': reloadDocument ? 'true' : 'false',
        },
        children,
      ),
    useLocation: () => ({
      pathname: '/shop',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    }),
    useNavigate: () => routerMocks.navigate,
  };
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const product = {
  id: 'swan-shoe-001',
  name: 'Swan Shoe',
  description: 'Comfortable daily shoe.',
  price: 330,
  images: ['https://example.com/swan.jpg'],
  slug: 'swan-shoe',
  category: { id: 'shoes', name: "Women's Shoes" },
  productVariants: [
    {
      id: 'swan-navy-41',
      name: 'Navy / 41',
      price: 330,
      attributes: { Color: 'Navy', Size: '41' },
    },
  ],
};

describe('ProductCard storefront navigation', () => {
  afterEach(() => {
    cleanup();
    routerMocks.navigate.mockReset();
    vi.restoreAllMocks();
  });

  it('uses SPA navigation for KHEMET product cards without full document reload', () => {
    const queryClient = createQueryClient();

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <StorefrontThemeProvider initialTheme={{ themeId: 'khemet-luxe-eg' }}>
          <ProductCard product={product} variant="boutique-air" />
        </StorefrontThemeProvider>
      </QueryClientProvider>,
    );

    const productLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/product/swan-shoe"]',
    );
    expect(productLink).toBeInTheDocument();
    expect(productLink).toHaveAttribute('data-reload-document', 'false');
  });

  it('renders modern automotive card for redline-auto theme without emoji slop', () => {
    const queryClient = createQueryClient();

    const { getByText, queryByText } = render(
      <QueryClientProvider client={queryClient}>
        <StorefrontThemeProvider initialTheme={{ themeId: 'redline-auto' }}>
          <ProductCard product={product} variant="boutique-air" />
        </StorefrontThemeProvider>
      </QueryClientProvider>,
    );

    expect(getByText('تفصيل فابريقة بالمللي')).toBeInTheDocument();
    expect(getByText('معاينة قبل الدفع')).toBeInTheDocument();
    expect(getByText('تحديد السيارة والطلب')).toBeInTheDocument();
    expect(queryByText(/⚡/)).toBeNull();
  });
});

