/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StorefrontNotFound } from '../components/StorefrontNotFound';

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: 'swan-boutique',
      name: 'Swan Store',
      direction: 'rtl',
    },
  }),
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: [
      { id: '1', name: 'أحذية رياضية', slug: 'sports-shoes' },
      { id: '2', name: 'أحذية كلاسيك', slug: 'classic-shoes' },
    ],
    isLoading: false,
  }),
}));

describe('StorefrontNotFound', () => {
  beforeEach(() => {
    document.title = '';
    document.head.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    cleanup();
  });

  it('sets 404 title and noindex robots tag on mount', () => {
    render(
      <MemoryRouter>
        <StorefrontNotFound />
      </MemoryRouter>,
    );

    expect(document.title).toBe('404 - الصفحة غير موجودة');

    const robotsMeta = document.querySelector('meta[name="robots"]');
    expect(robotsMeta?.getAttribute('content')).toBe('noindex, follow');
  });

  it('renders search bar and category recovery pills', () => {
    render(
      <MemoryRouter>
        <StorefrontNotFound />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText('ابحث عن منتج أو تصنيف...')).toBeDefined();
    expect(screen.getByText('أحذية رياضية')).toBeDefined();
    expect(screen.getByText('أحذية كلاسيك')).toBeDefined();
    expect(screen.getByText('العودة للرئيسية')).toBeDefined();
    expect(screen.getByText('تصفح المتجر')).toBeDefined();
  });
});
