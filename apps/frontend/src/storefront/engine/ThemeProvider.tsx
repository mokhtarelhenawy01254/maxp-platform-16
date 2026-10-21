import React, { createContext, useContext, useEffect, useState } from 'react';
import type { StorefrontTheme } from '../types/theme.types';
import StorefrontSkeleton from '../components/StorefrontSkeleton';
import {
  extractStorefrontThemePresetId,
  resolveRuntimeStorefrontTheme,
  type StorefrontThemeInput,
} from './runtimeThemeResolver';
import { resolvePageStyleVars, resolveActivePageKeyFromPath, extractPageStyles, type ResolvedPageStyleVars } from './themeResolverCore';
import { getStorefrontLocale } from '../i18n';

interface ThemeContextType {
  theme: StorefrontTheme;
  setTheme: (theme: StorefrontTheme) => void;
  activePageKey?: string;
  pageStyleVars?: ResolvedPageStyleVars;
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

  const initialColors =
    initialTheme?.designTokens?.colors ||
    initialTheme?.tokens?.colors ||
    initialTheme?.colors;

  const fallback: StorefrontTheme = {
    id: themeId,
    name: fallbackName,
    direction: fallbackDirection,
    tokens: {
      colors: {
        primary: (initialColors?.primary as string) || '24 76% 54%',
        primaryForeground: (initialColors?.primaryForeground as string) || '36 100% 98%',
        secondary: (initialColors?.secondary as string) || '34 56% 94%',
        secondaryForeground: (initialColors?.secondaryForeground as string) || '24 36% 20%',
        accent: (initialColors?.accent as string) || '18 76% 54%',
        accentForeground: (initialColors?.accentForeground as string) || '36 100% 98%',
        background: (initialColors?.background as string) || '36 100% 98%',
        foreground: (initialColors?.foreground as string) || '25 30% 15%',
        muted: (initialColors?.muted as string) || '32 36% 92%',
        mutedForeground: (initialColors?.mutedForeground as string) || '24 16% 38%',
        border: (initialColors?.border as string) || '30 32% 84%',
        card: (initialColors?.card as string) || '0 0% 100%',
        cardForeground: (initialColors?.cardForeground as string) || '25 30% 15%',
        ring: (initialColors?.ring as string) || (initialColors?.primary as string) || '24 76% 54%',
      },
      typography: {
        headingFont:
          initialTheme?.designTokens?.typography?.headingFont ||
          initialTheme?.tokens?.typography?.headingFont ||
          '"IBM Plex Sans Arabic", sans-serif',
        bodyFont:
          initialTheme?.designTokens?.typography?.bodyFont ||
          initialTheme?.tokens?.typography?.bodyFont ||
          '"IBM Plex Sans Arabic", sans-serif',
        baseSize:
          initialTheme?.designTokens?.typography?.baseSize ||
          initialTheme?.tokens?.typography?.baseSize ||
          '16px',
        direction: fallbackDirection,
      },
      shape: {
        borderRadius:
          initialTheme?.designTokens?.shape?.borderRadius ||
          initialTheme?.tokens?.shape?.borderRadius ||
          '1rem',
        buttonRadius:
          initialTheme?.designTokens?.shape?.buttonRadius ||
          initialTheme?.tokens?.shape?.buttonRadius ||
          '999px',
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

  const pageStyles = extractPageStyles(initialTheme);
  if (pageStyles && Object.keys(pageStyles).length > 0) {
    (fallback as any).pageStyles = pageStyles;
    Object.entries(pageStyles).forEach(([pKey, pStyle]) => {
      if (fallback.pages && fallback.pages[pKey]) {
        (fallback.pages[pKey] as any).pageStyle = pStyle;
      }
    });
  }

  return fallback;
};

export const StorefrontThemeProvider: React.FC<{ 
  children: React.ReactNode, 
  initialTheme?: StorefrontThemeInput,
  scoped?: boolean,
  blockUntilResolved?: boolean,
  activePageKey?: string,
}> = ({ children, initialTheme, scoped = true, blockUntilResolved = false, activePageKey: propActivePageKey }) => {
  const resolveCurrentPageKey = React.useCallback(() => {
    if (propActivePageKey) return propActivePageKey;
    if (typeof window !== 'undefined' && window.location?.pathname) {
      return resolveActivePageKeyFromPath(window.location.pathname);
    }
    return (initialTheme as any)?.activePageKey || 'home';
  }, [propActivePageKey, initialTheme]);

  const [activePageKey, setActivePageKey] = useState<string>(resolveCurrentPageKey);

  useEffect(() => {
    setActivePageKey(resolveCurrentPageKey());
  }, [propActivePageKey, resolveCurrentPageKey]);

  useEffect(() => {
    if (propActivePageKey !== undefined) return;
    if (typeof window === 'undefined') return;

    const handleLocationChange = () => {
      setActivePageKey(resolveActivePageKeyFromPath(window.location.pathname));
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [propActivePageKey]);
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
    if (typeof window === 'undefined' || scoped) return;
    const handleLocaleChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ locale?: string; direction?: string }>;
      const nextDir = customEvent.detail?.direction || (customEvent.detail?.locale === 'en' ? 'ltr' : 'rtl');
      const nextLang = customEvent.detail?.locale || 'ar';
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.dir = nextDir;
        document.documentElement.lang = nextLang;
      }
    };
    window.addEventListener('storefront:locale-change', handleLocaleChange);
    return () => window.removeEventListener('storefront:locale-change', handleLocaleChange);
  }, [scoped]);

  useEffect(() => {
    if (!theme) return;

    const targetElement = scoped ? document.getElementById('storefront-engine-root') : document.documentElement;
    
    if (!targetElement) return;

    if (!scoped) {
      const activeLocale = typeof window !== 'undefined' ? getStorefrontLocale(window.location?.search) : 'ar';
      const resolvedDirection = activeLocale === 'en' ? 'ltr' : (theme.direction || theme.tokens?.typography?.direction || 'rtl');
      document.documentElement.dir = resolvedDirection;
      document.documentElement.lang = activeLocale === 'en' ? 'en' : (resolvedDirection === 'ltr' ? 'en' : 'ar');
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

    // 5. Apply Page Style Scope tokens (--store-accent, --store-bg, --store-font-family, --store-density-gap, --store-radius)
    const pageVars = resolvePageStyleVars(theme, activePageKey);
    Object.entries(pageVars).forEach(([key, value]) => {
      setVar(key, value);
    });

    if (pageVars['--store-accent']) {
      setVar('--accent', pageVars['--store-accent']);
    }
    if (pageVars['--store-radius']) {
      setVar('--radius', pageVars['--store-radius']);
    }
    if (pageVars['--store-bg']) {
      setVar('--store-bg', pageVars['--store-bg']);
    }

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

  const resolvedPageVars = React.useMemo(() => {
    return theme ? resolvePageStyleVars(theme, activePageKey) : ({} as ResolvedPageStyleVars);
  }, [theme, activePageKey]);

  if (!theme) {
    return <StorefrontSkeleton />;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: (nextTheme) => setTheme(nextTheme), activePageKey, pageStyleVars: resolvedPageVars }}>
      <div 
        id="storefront-engine-root" 
        className="storefront-container isolation-auto min-h-screen bg-background text-foreground"
        style={{
          fontFamily: 'var(--font-sans)',
          ...resolvedPageVars,
          '--accent': 'var(--store-accent)',
          '--radius': 'var(--store-radius)',
        } as React.CSSProperties}
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
