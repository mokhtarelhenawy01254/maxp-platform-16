// @vitest-environment jsdom

import { vi } from 'vitest';

vi.hoisted(() => {
  const createMockStorage = () => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
  };

  const mockLocalStorage = createMockStorage();
  const mockSessionStorage = createMockStorage();

  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });
    }
  } catch {}
  try {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
        configurable: true,
      });
    }
  } catch {}
});

import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react';

import { useStorefrontHeaderController } from '../components/header/useStorefrontHeaderController';
import khemetLuxeThemeData from '../themes/khemet-luxe-eg.json';
import { APP_REGISTRY } from '../../config/appRegistry';
import { getSidebarConfig } from '../../config/sidebar';

let currentTheme: any = khemetLuxeThemeData;
let currentSettings: any = null;

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: currentTheme,
    setTheme: vi.fn(),
  }),
}));

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: currentSettings,
    isLoading: false,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
);

describe('KHEMET LUXE storefront header menu override (KHEMET-NAV-1)', () => {
  beforeEach(() => {
    currentTheme = JSON.parse(JSON.stringify(khemetLuxeThemeData));
    currentSettings = null;
  });

  it('(Case A) non-empty custom menu overrides theme demo links and displays custom items only', () => {
    const customMenu = [
      { id: 'item-1', label: 'فساتين سهرة', href: '/evening-dresses' },
      { id: 'item-2', label: 'عبايات خليجي', href: '/abayas' },
    ];

    const { result } = renderHook(
      () =>
        useStorefrontHeaderController({
          theme: currentTheme,
          globalHeader: { menu: customMenu },
        }),
      { wrapper },
    );

    const labels = result.current.navLinks.map((item) => item.label);
    const urls = result.current.navLinks.map((item) => item.to);

    expect(result.current.navLinks).toHaveLength(2);
    expect(labels).toEqual(['فساتين سهرة', 'عبايات خليجي']);
    expect(urls).toEqual(['/evening-dresses', '/abayas']);

    // Ensure NONE of the khemet theme demo labels appear
    expect(labels).not.toContain('كل الأحذية');
    expect(labels).not.toContain('الكوتشيات');
    expect(labels).not.toContain('الفلات');
    expect(labels).not.toContain('العروض');
  });

  it('(Case B) empty custom menu [] renders 0 links without falling back to theme demo links', () => {
    const { result } = renderHook(
      () =>
        useStorefrontHeaderController({
          theme: currentTheme,
          globalHeader: { menu: [] },
        }),
      { wrapper },
    );

    expect(result.current.navLinks).toEqual([]);
    expect(result.current.navLinks.length).toBe(0);

    const labels = result.current.navLinks.map((item) => item.label);
    expect(labels).not.toContain('كل الأحذية');
    expect(labels).not.toContain('الكوتشيات');
    expect(labels).not.toContain('الفلات');
    expect(labels).not.toContain('العروض');
  });

  it('(Case C) without custom menu, falls back cleanly to theme navigation links', () => {
    const { result } = renderHook(
      () =>
        useStorefrontHeaderController({
          theme: currentTheme,
        }),
      { wrapper },
    );

    const labels = result.current.navLinks.map((item) => item.label);
    expect(result.current.navLinks).toHaveLength(4);
    expect(labels).toEqual(['كل الأحذية', 'الكوتشيات', 'الفلات', 'العروض']);
  });

  it('verifies custom menu works seamlessly when provided via settings.designTokens payload', () => {
    currentSettings = {
      storefront: {
        designTokens: {
          global: {
            header: {
              menu: [
                { id: 'c1', label: 'شنط جلد طبيعي', href: '/bags' },
              ],
            },
          },
        },
      },
    };

    const { result } = renderHook(
      () =>
        useStorefrontHeaderController({
          theme: currentTheme,
        }),
      { wrapper },
    );

    expect(result.current.navLinks).toHaveLength(1);
    expect(result.current.navLinks[0].label).toBe('شنط جلد طبيعي');
    expect(result.current.navLinks[0].to).toBe('/bags');
  });

  it('verifies APP_REGISTRY storefront-design route points directly to editor', () => {
    const app = APP_REGISTRY.find((entry) => entry.id === 'storefront-design');
    expect(app).toBeDefined();
    expect(app?.route).toBe('/settings/storefront/editor');
  });

  it('verifies sidebar storefrontStudio link directs to /settings/storefront/editor', () => {
    const config = getSidebarConfig((k) => k, {
      role: 'OWNER',
      company: {
        isCurrent: true,
        sidebarLayout: 'affiliate-demo',
      },
    });

    const storefrontSection = config.find(
      (section) => section.id === 'storefront-design',
    );
    expect(storefrontSection).toBeDefined();

    const studioItem = storefrontSection?.items?.find(
      (item) => item.label === 'sidebar.storefrontStudio',
    );
    expect(studioItem).toBeDefined();
    expect(studioItem?.to).toBe('/settings/storefront/editor');
  });
});
