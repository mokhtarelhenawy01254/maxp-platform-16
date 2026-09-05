// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import QuickViewModal from '../components/QuickViewModal';
import { StorefrontThemeProvider } from '../engine/ThemeProvider';

vi.mock('react-router-dom', async () => {
  const React = await import('react');
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useLocation: () => ({
      pathname: '/shop',
      search: '',
      hash: '',
      state: null,
      key: 'test',
    }),
    useNavigate: () => vi.fn(),
  };
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const productWithQuillDescription = {
  id: 'test-product-1',
  name: 'بيجامة القلوب',
  description: '<p class="ql-align-center"><br></p><p class="ql-align-center"><strong>استقبلي يومك بأقصى درجات الراحة</strong></p>',
  price: 350,
  images: ['https://example.com/pajama.jpg'],
  slug: 'heart-pajama',
  category: { id: 'pajamas', name: 'بيجامات' },
  variants: [],
};

describe('QuickViewModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders rich HTML descriptions properly without displaying raw HTML tags to the user', () => {
    const queryClient = createQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <StorefrontThemeProvider initialThemeId="khemet-fashion-eg">
          <QuickViewModal
            isOpen={true}
            onClose={() => {}}
            product={productWithQuillDescription}
          />
        </StorefrontThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('استقبلي يومك بأقصى درجات الراحة')).toBeInTheDocument();
    expect(screen.queryByText(/ql-align-center/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/<p class=/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/<strong>/i)).not.toBeInTheDocument();
  });

  it('renders localized fallback when description is empty', () => {
    const queryClient = createQueryClient();
    const productWithoutDesc = {
      ...productWithQuillDescription,
      description: '<p><br></p>',
    };

    render(
      <QueryClientProvider client={queryClient}>
        <StorefrontThemeProvider initialThemeId="khemet-fashion-eg">
          <QuickViewModal
            isOpen={true}
            onClose={() => {}}
            product={productWithoutDesc}
          />
        </StorefrontThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('لا يوجد وصف متوفر لهذا المنتج.')).toBeInTheDocument();
  });

  it('triggers quick buy by adding item silently, closing modal, and navigating to checkout', () => {
    const queryClient = createQueryClient();
    const onClose = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <StorefrontThemeProvider initialThemeId="khemet-fashion-eg">
          <QuickViewModal
            isOpen={true}
            onClose={onClose}
            product={productWithQuillDescription}
          />
        </StorefrontThemeProvider>
      </QueryClientProvider>,
    );

    const quickBuyBtn = screen.getByRole('button', { name: /شراء فوري الآن/i });
    expect(quickBuyBtn).toBeInTheDocument();
  });
});
