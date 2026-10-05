// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';

import StorefrontHeader from '../components/header/StorefrontHeader';
import { StorefrontThemeProvider } from '../engine/ThemeProvider';
import redlineThemeData from '../themes/redline-auto.json';

vi.mock('../services/storefrontAnalytics', () => ({
  default: {
    trackStoreVisit: vi.fn(),
    trackProductView: vi.fn(),
    trackAddToCart: vi.fn(),
    trackCheckout: vi.fn(),
    trackPurchase: vi.fn(),
  },
}));

const companyId = 'company-redline';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

describe('Red Line Auto Header Interactions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', `/?previewTheme=redline-auto&companyId=${companyId}`);
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

      if (url.pathname.includes('redline-auto')) {
        return jsonResponse(redlineThemeData);
      }

      if (url.pathname.endsWith('/public/storefront/settings')) {
        return jsonResponse({
          success: true,
          data: {
            company: {
              id: companyId,
              name: 'Red Line Auto',
              slug: 'redline',
              logo: null,
            },
            storefront: {
              themeId: 'redline-auto',
              settings: {
                themeId: 'redline-auto',
                storeName: 'RED LINE',
              },
            },
            storefrontSettings: {
              themeId: 'redline-auto',
              storeName: 'RED LINE',
            },
          },
        });
      }

      return jsonResponse({ success: true, data: {} });
    }) as any;
  });

  it('renders dedicated automotive chassis header with brand emblem, top rail, and CTA', async () => {
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
          <StorefrontThemeProvider initialTheme={redlineThemeData as any}>
            <StorefrontHeader isMinimal={false} search={mockSearch as any} />
          </StorefrontThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // Verify Brand Name and Automotive Badge
    expect(await screen.findByText('RED LINE')).toBeInTheDocument();
    expect(screen.getByText('AUTO')).toBeInTheDocument();
    expect(screen.getByText('ستائر سيارات فابريقة')).toBeInTheDocument();

    // Verify Top Announcement Bar
    expect(screen.getByText('عزل حراري 98%')).toBeInTheDocument();
    expect(screen.getByText(/015 0007 3277/)).toBeInTheDocument();

    // Verify CTA button
    expect(screen.getByRole('link', { name: 'اطلب ستارتك' })).toBeInTheDocument();

    // Verify Navigation Links
    expect(screen.getByRole('link', { name: 'ستائر شبابيك السيارات' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الأطقم والباقات' })).toBeInTheDocument();
  });
});
