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
import { type ThemeMode, getPreset, getTokensFor } from './tokens';

export type FontSizeSetting = 'compact' | 'normal' | 'large';

interface ThemeContextValue {
  mode: ThemeMode;
  fontSize: FontSizeSetting;
  presetId: string;
  toggleTheme: () => void;
  setTheme: (m: ThemeMode) => void;
  setPreset: (id: string) => void;
  setFontSize: (size: FontSizeSetting) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  fontSize: 'normal',
  presetId: 'carbon',
  toggleTheme: () => {},
  setTheme: () => {},
  setPreset: () => {},
  setFontSize: () => {},
});

const STORAGE_KEY = 'maxp_theme';
const FONT_STORAGE_KEY = 'maxp_font_size';
const PRESET_STORAGE_KEY = 'maxp_theme_preset';

/** Read the saved preference, default to 'dark'. */
function readSaved(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {}
  return 'dark';
}

function readSavedFontSize(): FontSizeSetting {
  try {
    const v = localStorage.getItem(FONT_STORAGE_KEY);
    if (v === 'compact' || v === 'normal' || v === 'large') return v as FontSizeSetting;
  } catch {}
  return 'normal';
}

function readSavedPreset(): string {
  try {
    const v = localStorage.getItem(PRESET_STORAGE_KEY);
    if (v && getPreset(v)) return v;
  } catch {}
  return 'carbon';
}

/** Apply CSS custom-properties to document root. */
function applyTokens(mode: ThemeMode, fontSize: FontSizeSetting, presetId: string) {
  const tokens = getTokensFor(mode, presetId);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
  // also set a data attribute for potential CSS selectors
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-font-size', fontSize);
  root.setAttribute('data-preset', presetId);

  const fontSizeMap: Record<FontSizeSetting, string> = {
    compact: '12.5px',
    normal: '14px',
    large: '15.5px',
  };
  const sizeVal = fontSizeMap[fontSize] || '14px';
  root.style.setProperty('--base-font-size', sizeVal);
  root.style.fontSize = sizeVal;

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
  const [fontSize, setFontSizeState] = useState<FontSizeSetting>(readSavedFontSize);
  const [presetId, setPresetIdState] = useState<string>(readSavedPreset);

  // Apply tokens whenever mode, fontSize or preset changes
  useEffect(() => {
    applyTokens(mode, fontSize, presetId);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
      localStorage.setItem(FONT_STORAGE_KEY, fontSize);
      localStorage.setItem(PRESET_STORAGE_KEY, presetId);
    } catch {}
  }, [mode, fontSize, presetId]);

  // Switching family: keep a preset that belongs to the new family,
  // otherwise fall back to that family's default identity.
  const adoptMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setPresetIdState((prev) =>
      getPreset(prev)?.base === m ? prev : m === 'dark' ? 'carbon' : 'latte'
    );
  }, []);

  const toggleTheme = useCallback(() => {
    adoptMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, adoptMode]);

  const setTheme = useCallback((m: ThemeMode) => {
    adoptMode(m);
  }, [adoptMode]);

  const setPreset = useCallback((id: string) => {
    const p = getPreset(id);
    if (!p) return;
    setPresetIdState(id);
    setModeState(p.base);
  }, []);

  const setFontSize = useCallback((s: FontSizeSetting) => {
    setFontSizeState(s);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, fontSize, presetId, toggleTheme, setTheme, setPreset, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

/** Hook — use inside any component to access theme mode & toggle. */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

export default ThemeProvider;
