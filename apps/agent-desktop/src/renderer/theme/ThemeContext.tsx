/**
 * MaxP Workspace — Theme Context & Provider
 *
 * Provides `useTheme()` hook that returns:
 *   - mode: 'dark' | 'light'
 *   - toggleTheme(): void
 *   - setTheme(mode): void
 *
 * On mount, reads preference from localStorage (key: `maxp_theme`)
 * and injects the matching CSS custom-properties onto <html>.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { type ThemeMode, getTokens } from './tokens';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = 'maxp_theme';

/** Read the saved preference, default to 'dark'. */
function readSaved(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {}
  return 'dark';
}

/** Apply CSS custom-properties to document root. */
function applyTokens(mode: ThemeMode) {
  const tokens = getTokens(mode);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
  // also set a data attribute and class for CSS selectors & Tailwind
  root.setAttribute('data-theme', mode);
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Inject or update global custom scrollbar rules
  let scrollbarStyle = document.getElementById('maxp-theme-scrollbars') as HTMLStyleElement | null;
  if (!scrollbarStyle) {
    scrollbarStyle = document.createElement('style');
    scrollbarStyle.id = 'maxp-theme-scrollbars';
    document.head.appendChild(scrollbarStyle);
  }
  scrollbarStyle.textContent = `
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: var(--border-strong);
      border-radius: 999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-dim);
    }
    * {
      scrollbar-width: thin;
      scrollbar-color: var(--border-strong) transparent;
    }
  `;
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(readSaved);

  // Apply tokens whenever mode changes
  useEffect(() => {
    applyTokens(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((m: ThemeMode) => {
    setModeState(m);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/** Hook — use inside any component to access theme mode & toggle. */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

export default ThemeProvider;
