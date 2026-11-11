// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import StorefrontHeader from '../components/header/StorefrontHeader';
import { StorefrontThemeProvider } from '../engine/ThemeProvider';
import marketplaceThemeData from '../themes/marketplace-avenue-ar.json';

vi.mock('../services/storefrontAnalytics', () => ({
  default: {
    trackStoreVisit: vi.fn(),
    trackProductView: vi.fn(),
    trackAddToCart: vi.fn(),
    trackCheckout: vi.fn(),
    trackPurchase: vi.fn(),
  },
}));

const companyId = 'company-marketplace';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

describe('Marketplace Header Mobile Menu Interactions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', `/?previewTheme=marketplace-avenue-ar&companyId=${companyId}`);
    queryClient = createQueryClient();

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
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

      if (url.pathname.includes('marketplace-avenue')) {
        return jsonResponse(marketplaceThemeData);
      }

      if (url.pathname.endsWith('/public/storefront/settings')) {
        return jsonResponse({
          success: true,
          data: {
            company: {
              id: companyId,
              name: 'Marketplace Store',
              slug: 'bto3-e3lanat',
              logo: null,
            },
            storefront: {
              themeId: 'marketplace-avenue-ar',
              settings: {
                themeId: 'marketplace-avenue-ar',
                storeName: 'Bto3 e3lanat',
              },
            },
            storefrontSettings: {
              themeId: 'marketplace-avenue-ar',
              storeName: 'Bto3 e3lanat',
            },
          },
        });
      }

      return jsonResponse({ success: true, data: {} });
    }) as any;
  });

  it('toggles mobile navigation drawer with categories and menu tabs on hamburger click', async () => {
    const mockSearch = {
      query: '',
      setQuery: vi.fn(),
      results: [],
      isLoading: false,
      isOpen: false,
      setIsOpen: vi.fn(),
      clear: vi.fn(),
    };

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <StorefrontThemeProvider initialTheme={marketplaceThemeData as any}>
            <StorefrontHeader isMinimal={false} search={mockSearch as any} />
          </StorefrontThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // Initial state: menu button is present
    const menuButton = await screen.findByRole('button', { name: /القائمة|Menu/i });
    expect(menuButton).toBeInTheDocument();

    // Drawer should not be open initially
    expect(screen.queryByRole('dialog', { name: /قائمة التصفح|Navigation menu/i })).not.toBeInTheDocument();

    // Click hamburger button to open drawer
    fireEvent.click(menuButton);

    // Drawer dialog should now be visible
    const drawer = screen.getByRole('dialog', { name: /قائمة التصفح|Navigation menu/i });
    expect(drawer).toBeInTheDocument();

    // Verify categories tab and menu tab exist
    const categoriesTab = screen.getByRole('button', { name: /الأقسام|Categories/i });
    const menuTab = screen.getByRole('button', { name: /القائمة|Menu/i });
    expect(categoriesTab).toBeInTheDocument();
    expect(menuTab).toBeInTheDocument();

    // Switch to menu tab
    fireEvent.click(menuTab);

    // Verify Wishlist and Login links exist in menu tab
    expect(screen.getByText(/قائمة الرغبات|Wishlist/i)).toBeInTheDocument();
    expect(screen.getByText(/تسجيل الدخول|Login/i)).toBeInTheDocument();

    // Click backdrop or close button to close drawer
    const closeBtn = screen.getByRole('button', { name: /إغلاق/i });
    fireEvent.click(closeBtn);

    // Drawer should be closed
    expect(screen.queryByRole('dialog', { name: /قائمة التصفح|Navigation menu/i })).not.toBeInTheDocument();
  });
});
