import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getStorefrontLocale,
  persistStorefrontLocale,
  getLocaleDirection,
  type StorefrontLocale,
} from "../i18n";

export interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = "",
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentLocale, setCurrentLocale] = useState<StorefrontLocale>(() =>
    getStorefrontLocale(location.search)
  );

  // Sync with URL or external changes
  useEffect(() => {
    const resolved = getStorefrontLocale(location.search);
    setCurrentLocale(resolved);
  }, [location.search]);

  // Sync document attributes
  useEffect(() => {
    const dir = getLocaleDirection(currentLocale);
    if (typeof document !== "undefined") {
      document.documentElement.dir = dir;
      document.documentElement.lang = currentLocale;
    }
  }, [currentLocale]);

  const handleSelectLocale = useCallback(
    (nextLocale: StorefrontLocale) => {
      persistStorefrontLocale(nextLocale);
      setCurrentLocale(nextLocale);

      const dir = getLocaleDirection(nextLocale);
      if (typeof document !== "undefined") {
        document.documentElement.dir = dir;
        document.documentElement.lang = nextLocale;
      }

      // Update URL query while preserving all other params
      const searchParams = new URLSearchParams(location.search);
      if (nextLocale === "ar") {
        searchParams.set("lang", "ar");
      } else {
        searchParams.set("lang", "en");
      }

      navigate(
        {
          pathname: location.pathname,
          search: searchParams.toString() ? `?${searchParams.toString()}` : "",
        },
        { replace: true }
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("storefront:locale-change", {
            detail: { locale: nextLocale, direction: dir },
          })
        );
      }
    },
    [location.pathname, location.search, navigate]
  );

  const handleToggle = useCallback(() => {
    const nextLocale: StorefrontLocale = currentLocale === "ar" ? "en" : "ar";
    handleSelectLocale(nextLocale);
  }, [currentLocale, handleSelectLocale]);

  const isEn = currentLocale === "en";

  return (
    <div
      data-testid="language-switcher"
      data-storefront-locale={currentLocale}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide select-none ${className}`}
      dir="ltr"
    >
      {/* Quick toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        data-testid="language-toggle-btn"
        className="flex items-center gap-1 px-2 py-1 rounded-full border border-border/70 bg-background/80 hover:bg-muted/80 text-foreground transition-all duration-150 active:scale-[0.97]"
        title={isEn ? "التبديل إلى العربية" : "Switch to English"}
        aria-label={isEn ? "التبديل إلى العربية" : "Switch to English"}
      >
        <span
          data-testid="language-switch-ar"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectLocale("ar");
          }}
          className={`cursor-pointer px-1 py-0.5 rounded transition-colors ${
            !isEn
              ? "font-bold text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ع
        </span>
        <span className="text-muted-foreground/50 text-[10px]">/</span>
        <span
          data-testid="language-switch-en"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectLocale("en");
          }}
          className={`cursor-pointer px-1 py-0.5 rounded font-sans transition-colors ${
            isEn
              ? "font-bold text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          EN
        </span>
      </button>
    </div>
  );
};

export default LanguageSwitcher;
