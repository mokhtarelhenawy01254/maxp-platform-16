import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

/**
 * Theme Hook and Context
 *
 * Provides theme management (light/dark mode) throughout the application
 */

type Theme = "light" | "dark" | "system";
type DarkStyle = "classic" | "midnight" | "oled" | "aurora" | "amethyst" | "royal";

interface ThemeContextType {
  theme: Theme;
  actualTheme: "light" | "dark";
  derivedTheme: "light" | "dark";
  darkStyle: DarkStyle;
  setTheme: (theme: Theme) => void;
  setDarkStyle: (style: DarkStyle) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = "light",
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or use default
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme;
      return stored || defaultTheme;
    }
    return defaultTheme;
  });

  const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");
  const [darkStyle, setDarkStyleState] = useState<DarkStyle>(() => {
    if (typeof window === "undefined") return "classic";
    const stored = localStorage.getItem("dark-style");
    if (
      stored === "classic" ||
      stored === "midnight" ||
      stored === "oled" ||
      stored === "aurora" ||
      stored === "amethyst" ||
      stored === "royal"
    ) {
      return stored;
    }
    return "classic";
  });
  const location = useLocation();

  // If user has no saved theme yet, default analytics to dark on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("theme");
    if (!stored && location.pathname.startsWith("/analytics")) {
      setThemeState("dark");
      localStorage.setItem("theme", "dark");
    }
  }, [location.pathname]);

  // Get system theme preference
  const getSystemTheme = (): "light" | "dark" => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  };

  // Update actual theme based on theme setting
  useEffect(() => {
    const updateActualTheme = () => {
      if (theme === "system") {
        setActualTheme(getSystemTheme());
      } else {
        setActualTheme(theme);
      }
    };

    updateActualTheme();

    // Listen for system theme changes
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => updateActualTheme();

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    return undefined;
  }, [theme]);

  // Calculate derived theme (effective theme) based on route
  const currentPath = location.pathname;
  // Check if we are in a storefront route including public pages
  const isStorefront =
    currentPath.startsWith("/shop") ||
    currentPath.startsWith("/home") ||
    currentPath.startsWith("/woodmart-replica") ||
    (currentPath.startsWith("/auth") &&
      !currentPath.startsWith("/auth/admin")) || // Assume auth pages are public/light? No, let's stick to known storefront
    currentPath === "/test-minimal" ||
    currentPath === "/test-public";

  // Routes that should be forced to dark mode
  const isDarkForced =
    currentPath.startsWith("/monitor-reports") ||
    currentPath.startsWith("/alert-settings") ||
    currentPath.startsWith("/support"); // Force dark mode for all support pages including FAQ

  // Analytics routes should NEVER be forced to dark mode - they respect user's theme choice
  const isAnalytics = currentPath.startsWith("/analytics");

  let derivedTheme = isStorefront ? "light" : actualTheme;

  // Only force dark mode if not in analytics section
  if (isDarkForced && !isAnalytics) {
    derivedTheme = "dark";
  }

  // Apply theme to document
  useLayoutEffect(() => {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove("light", "dark");

    // Tailwind darkMode is class-based and expects only the 'dark' class
    if (derivedTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-dark-style", darkStyle);
    } else {
      root.removeAttribute("data-dark-style");
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const darkThemeColor =
        darkStyle === "midnight"
          ? "#081223"
          : darkStyle === "oled"
            ? "#000000"
            : darkStyle === "aurora"
              ? "#061018"
              : darkStyle === "amethyst"
                ? "#120b1f"
                : darkStyle === "royal"
                  ? "#140b33"
                  : "#030712";
      metaThemeColor.setAttribute(
        "content",
        derivedTheme === "dark" ? darkThemeColor : "#ffffff",
      );
    }
  }, [derivedTheme, darkStyle]); // Depend on derivedTheme

  // Set theme and persist to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme);
    }
  };

  const setDarkStyle = (style: DarkStyle) => {
    setDarkStyleState(style);
    if (typeof window !== "undefined") {
      localStorage.setItem("dark-style", style);
    }
  };

  // Toggle between light and dark (ignoring system)
  const toggleTheme = () => {
    if (theme === "system") {
      // If currently system, switch to opposite of current system theme
      const systemTheme = getSystemTheme();
      setTheme(systemTheme === "dark" ? "light" : "dark");
    } else {
      // Toggle between light and dark
      setTheme(theme === "light" ? "dark" : "light");
    }
  };

  const contextValue: ThemeContextType = {
    theme,
    actualTheme,
    derivedTheme, // Expose the effective theme
    darkStyle,
    setTheme,
    setDarkStyle,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
