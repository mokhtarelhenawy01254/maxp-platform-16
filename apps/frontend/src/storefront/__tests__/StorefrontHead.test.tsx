/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { StorefrontHead } from '../engine/StorefrontHead';

// Mock ThemeProvider
vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: 'swan-boutique',
      name: 'Swan Store',
      seo: {
        titleTemplate: '%s | Swan Store',
        description: 'Default store description',
      },
      header: {
        brandName: 'Swan Store',
      },
    },
  }),
}));

// Mock useStorefrontSettings
vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: {
      storefront: {
        settings: {
          storeName: 'Swan Store',
          seo: {
            description: 'Swan Store Description',
          },
        },
      },
    },
  }),
}));

describe('StorefrontHead', () => {
  beforeEach(() => {
    document.title = '';
    document.head.querySelectorAll('meta, link[rel="canonical"]').forEach((el) => el.remove());
  });

  it('sets standard canonical and robots on clean URLs', () => {
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <StorefrontHead />
      </MemoryRouter>,
    );

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toBe('index, follow, max-image-preview:large');

    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe(window.location.origin + window.location.pathname);
  });

  it('sets noindex, follow on search or filter query URLs', () => {
    render(
      <MemoryRouter initialEntries={['/shop?search=dress&minPrice=100']}>
        <StorefrontHead />
      </MemoryRouter>,
    );

    const robots = document.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toBe('noindex, follow');
  });

  it('sets title for known page routes using template', () => {
    render(
      <MemoryRouter initialEntries={['/shop']}>
        <StorefrontHead />
      </MemoryRouter>,
    );

    expect(document.title).toBe('المتجر | Swan Store');
  });
});
