import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BUSINESS_THEME_ID,
  themes,
  type VisualThemeOption,
} from "../config/themes";

type VisualThemeContextValue = {
  currentTheme: VisualThemeOption;
  setTheme: (theme: string) => void;
};

const STORAGE_KEY = "visual-theme";

const normalizeThemeId = (theme: string | null | undefined): string => {
  if (!theme) {
    return BUSINESS_THEME_ID;
  }

  return themes.some((option) => option.id === theme)
    ? theme
    : BUSINESS_THEME_ID;
};

const VisualThemeContext = createContext<VisualThemeContextValue>({
  currentTheme: themes[0],
  setTheme: () => {},
});

export const VisualThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof window === "undefined") return BUSINESS_THEME_ID;
    return normalizeThemeId(window.localStorage.getItem(STORAGE_KEY));
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const normalizedTheme = normalizeThemeId(currentTheme);
    document.documentElement.setAttribute("data-visual-theme", normalizedTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, normalizedTheme);
    }
  }, [currentTheme]);

  const value = useMemo(
    () => ({
      currentTheme:
        themes.find((theme) => theme.id === normalizeThemeId(currentTheme)) ||
        themes[0],
      setTheme: (theme: string) => setCurrentTheme(normalizeThemeId(theme)),
    }),
    [currentTheme],
  );

  return (
    <VisualThemeContext.Provider value={value}>
      {children}
    </VisualThemeContext.Provider>
  );
};

export const useVisualTheme = (): VisualThemeContextValue => {
  return useContext(VisualThemeContext);
};

export default VisualThemeContext;
