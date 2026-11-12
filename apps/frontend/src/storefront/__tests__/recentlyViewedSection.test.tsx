import React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecentlyViewed } from '../sections/RecentlyViewed';
import { ThemeProvider } from '../engine/ThemeProvider';
import { resolveStorefrontThemeFromPreset } from '../engine/themeResolverCore';
import marketplaceAvenueAr from '../themes/marketplace-avenue-ar.json';
import { renderWithStorefrontProviders } from './setup/storefrontTestSetup';
import type { StorefrontTheme } from '../types/theme.types';

const STORAGE_KEY = 'maxp_recently_viewed_products';

describe('RecentlyViewed Section', () => {
  const theme = resolveStorefrontThemeFromPreset(
    marketplaceAvenueAr as unknown as StorefrontTheme,
  );

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders null when there are no recently viewed items in localStorage', () => {
    const { container } = renderWithStorefrontProviders(
      <MemoryRouter>
        <ThemeProvider initialTheme={theme}>
          <RecentlyViewed settings={{ title: 'شوهدت مؤخرًا' }} />
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders recently viewed products in a compact horizontal grid with clean 2-line clamping', () => {
    const mockItems = [
      {
        id: 'prod-1',
        name: 'مجفف طعام كهربائي احترافي',
        slug: 'food-dryer-8-tier',
        price: 4176,
        comparePrice: 4800,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a',
        category: 'أجهزة منزلية',
        rating: 4.8,
      },
      {
        id: 'prod-2',
        name: 'حلة ضغط 7 لتر سيتي',
        slug: 'pressure-cooker-7l',
        price: 3500,
        comparePrice: 4000,
        image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba',
        category: 'أجهزة المطبخ',
        rating: 4.5,
      },
    ];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockItems));

    renderWithStorefrontProviders(
      <MemoryRouter>
        <ThemeProvider initialTheme={theme}>
          <RecentlyViewed settings={{ title: 'شوهدت مؤخرًا', limit: 6 }} />
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Title should be visible
    expect(screen.getByText('شوهدت مؤخرًا')).toBeDefined();

    // Products should be rendered with working line-clamp-2 (no conflicting `block`)
    const firstTitle = screen.getByText('مجفف طعام كهربائي احترافي');
    expect(firstTitle.className).toContain('line-clamp-2');
    expect(firstTitle.className.split(/\s+/)).not.toContain('block');
    expect(screen.getByText('حلة ضغط 7 لتر سيتي')).toBeDefined();

    // Formatted prices should be visible
    expect(screen.getByText('4,176 ج.م')).toBeDefined();
    expect(screen.getByText('3,500 ج.م')).toBeDefined();
  });
});
