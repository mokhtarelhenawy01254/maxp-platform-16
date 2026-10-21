import React, { createContext, useContext, useEffect, useState } from 'react';
import type { StorefrontTheme } from '../types/theme.types';
import StorefrontSkeleton from '../components/StorefrontSkeleton';
import {
  extractStorefrontThemePresetId,
  resolveRuntimeStorefrontTheme,
  type StorefrontThemeInput,
} from './runtimeThemeResolver';
import { resolvePageStyleVars } from './themeResolverCore';

interface ThemeContextType {
  theme: StorefrontTheme;
  setTheme: (theme: StorefrontTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STOREFRONT_THEME_FONT_WEIGHTS = '400;600;700;900';
const STOREFRONT_THEME_FONT_DISPLAY = 'swap';
const GENERIC_OR_LOCAL_FONTS = new Set([
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'blinkmacsystemfont',
  'sans-serif',
  'serif',
  'monospace',
  'geist variable',
  'dejavu sans',
  'raleway',
  'dejavu sans bold',
  'tahoma',
  'arial',
]);

const createEmptyPage = () => ({ sections: [] });

const createStorefrontThemeFallback = (
  initialTheme?: StorefrontThemeInput,
): StorefrontTheme => {
  const themeId = extractStorefrontThemePresetId(initialTheme);
  const fallbackDirection =
    initialTheme?.direction ||
    initialTheme?.tokens?.typography?.direction ||
    (themeId === 'khemet-luxe-eg' || themeId.endsWith('-eg') ? 'rtl' : 'ltr');
  const fallbackName =
    typeof initialTheme?.name === 'string' && initialTheme.name.trim()
      ? initialTheme.name
      : 'Storefront';

  return {
    id: themeId,
    name: fallbackName,
    direction: fallbackDirection,
    tokens: {
      colors: {
        primary: '24 76% 54%',
        primaryForeground: '36 100% 98%',
        secondary: '34 56% 94%',
        secondaryForeground: '24 36% 20%',
        accent: '18 76% 54%',
        accentForeground: '36 100% 98%',
        background: '36 100% 98%',
        foreground: '25 30% 15%',
        muted: '32 36% 92%',
        mutedForeground: '24 16% 38%',
        border: '30 32% 84%',
        card: '0 0% 100%',
        cardForeground: '25 30% 15%',
        ring: '24 76% 54%',
      },
      typography: {
        headingFont: '"IBM Plex Sans Arabic", sans-serif',
        bodyFont: '"IBM Plex Sans Arabic", sans-serif',
        baseSize: '16px',
        direction: fallbackDirection,
      },
      shape: {
        borderRadius: '1rem',
        buttonRadius: '999px',
      },
      productCard: {
        borderRadius: '1rem',
        buttonRadius: '999px',
        surfaceOpacity: '1',
      },
    },
    header: {
      navigation: [],
      showSearch: true,
      showCart: true,
    },
    footer: {
      socialLinks: {},
      navigation: [],
    },
    pages: {
      home: createEmptyPage(),
      shop: createEmptyPage(),
      pdp: createEmptyPage(),
      cart: createEmptyPage(),
      checkout: createEmptyPage(),
      'thank-you': createEmptyPage(),
    },
  };
};

export const StorefrontThemeProvider: React.FC<{ 
  children: React.ReactNode, 
  initialTheme?: StorefrontThemeInput,
  scoped?: boolean,
  blockUntilResolved?: boolean,
  activePageKey?: string,
}> = ({ children, initialTheme, scoped = true, blockUntilResolved = false, activePageKey }) => {
  const [theme, setTheme] = useState<StorefrontTheme | null>(() =>
    blockUntilResolved ? null : createStorefrontThemeFallback(initialTheme),
  );

  useEffect(() => {
    let isActive = true;

    if (blockUntilResolved) {
      setTheme(null);
    } else {
      setTheme(createStorefrontThemeFallback(initialTheme));
    }

    resolveRuntimeStorefrontTheme(initialTheme)
      .then((resolvedTheme) => {
        if (isActive) {
          setTheme(resolvedTheme);
        }
      })
      .catch(() => {
        if (isActive) {
          setTheme(createStorefrontThemeFallback(initialTheme));
        }
      });

    return () => {
      isActive = false;
    };
  }, [initialTheme, blockUntilResolved]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In a real production app we'd verify origin, but for this preview modal we allow it
      if (event.data?.type === 'UPDATE_PREVIEW_TOKENS' && event.data?.payload) {
        setTheme((currentTheme) => currentTheme ? ({
          ...currentTheme,
          tokens: {
            ...currentTheme.tokens,
            ...event.data.payload,
          },
          pages: {
            ...currentTheme.pages,
            home: event.data.payload.home || currentTheme.pages.home,
          }
        }) : currentTheme);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!theme) return;

    const targetElement = scoped ? document.getElementById('storefront-engine-root') : document.documentElement;
    
    if (!targetElement) return;

    if (!scoped) {
      const resolvedDirection = theme.direction || theme.tokens?.typography?.direction || 'rtl';
      document.documentElement.dir = resolvedDirection;
      document.documentElement.lang = resolvedDirection === 'ltr' ? 'en' : 'ar';
    }

    const setVar = (key: string, value: string) => {
      targetElement.style.setProperty(key, value);
    };

    // 1. Apply Colors
    if (theme.tokens?.colors) {
      Object.entries(theme.tokens.colors).forEach(([key, value]) => {
        // Handle kebab-case conversion (e.g. primaryForeground -> --primary-foreground)
        const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
        setVar(`--${kebabKey}`, value as string);
        
        // Ensure standard tailwind-style names are also available
        if (key === 'primary') setVar('--primary', value as string);
        if (key === 'foreground') setVar('--foreground', value as string);
        if (key === 'background') setVar('--background', value as string);
      });
    }

    // 2. Apply Typography
    if (theme.tokens?.typography) {
      if (theme.tokens.typography.bodyFont) setVar('--font-sans', theme.tokens.typography.bodyFont);
      if (theme.tokens.typography.headingFont) setVar('--font-heading', theme.tokens.typography.headingFont);
      if (theme.tokens.typography.baseSize) setVar('--base-font-size', theme.tokens.typography.baseSize);
    }

    // 3. Apply Shape
    if (theme.tokens?.shape) {
      if (theme.tokens.shape.borderRadius) setVar('--radius', theme.tokens.shape.borderRadius);
      if (theme.tokens.shape.buttonRadius) setVar('--button-radius', theme.tokens.shape.buttonRadius);
    }

    // 4. Apply Product Card tokens
    if (theme.tokens?.productCard) {
      if (theme.tokens.productCard.borderRadius) setVar('--product-card-radius', theme.tokens.productCard.borderRadius);
      if (theme.tokens.productCard.boxShadow) setVar('--product-card-shadow', theme.tokens.productCard.boxShadow);
      if (theme.tokens.productCard.hoverShadow) setVar('--product-card-hover-shadow', theme.tokens.productCard.hoverShadow);
      if (theme.tokens.productCard.badgeRadius) setVar('--product-card-badge-radius', theme.tokens.productCard.badgeRadius);
      if (theme.tokens.productCard.buttonRadius) setVar('--product-card-button-radius', theme.tokens.productCard.buttonRadius);
      if (theme.tokens.productCard.surfaceOpacity) setVar('--product-card-surface-opacity', theme.tokens.productCard.surfaceOpacity);
    }

    // 5. Apply Page Style Scope tokens (--store-accent, --store-font-family, --store-density-gap, --store-radius)
    const pageVars = resolvePageStyleVars(theme, activePageKey || (theme as any)?.activePageKey);
    Object.entries(pageVars).forEach(([key, value]) => {
      setVar(key, value);
    });

  }, [theme, scoped, activePageKey]);

  // Dynamically load only the Google Fonts required by the active theme
  useEffect(() => {
    if (!theme?.tokens?.typography) return;

    const { headingFont, bodyFont } = theme.tokens.typography;
    const fontsToLoad = new Set<string>();

    const extractFontFamily = (fontStack: string): string | null => {
      // Get the first font from a CSS font stack like "'Outfit', sans-serif"
      const first = fontStack.split(',')[0]?.trim().replace(/['"]/g, '');
      if (!first || GENERIC_OR_LOCAL_FONTS.has(first.toLowerCase())) return null;
      return first;
    };

    if (headingFont) {
      const font = extractFontFamily(headingFont);
      if (font) fontsToLoad.add(font);
    }
    if (bodyFont) {
      const font = extractFontFamily(bodyFont);
      if (font) fontsToLoad.add(font);
    }

    if (fontsToLoad.size === 0) return;

    // Build Google Fonts URL for only the needed fonts
    const families = Array.from(fontsToLoad)
      .map(
        (f) =>
          `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${STOREFRONT_THEME_FONT_WEIGHTS}`,
      )
      .join('&');
    const href = `https://fonts.googleapis.com/css2?${families}&display=${STOREFRONT_THEME_FONT_DISPLAY}`;

    const LINK_ID = 'storefront-theme-fonts';
    let linkEl = document.getElementById(LINK_ID) as HTMLLinkElement | null;

    if (linkEl) {
      if (linkEl.href === href) return; // same fonts, skip
      linkEl.href = href;
    } else {
      linkEl = document.createElement('link');
      linkEl.id = LINK_ID;
      linkEl.rel = 'stylesheet';
      linkEl.href = href;
      document.head.appendChild(linkEl);
    }
  }, [theme?.tokens?.typography?.headingFont, theme?.tokens?.typography?.bodyFont]);

  if (!theme) {
    return <StorefrontSkeleton />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: (nextTheme) => setTheme(nextTheme) }}>
      <div 
        id="storefront-engine-root" 
        className="storefront-container isolation-auto min-h-screen bg-background text-foreground"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useStorefrontTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useStorefrontTheme must be used within a StorefrontThemeProvider');
  }
  return context;
};
