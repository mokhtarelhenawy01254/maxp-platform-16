import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowLeft } from "lucide-react";
import { CommandPalette } from "../../../../components/common/CommandPalette";

export interface OrdersSearchBarProps {
  search: string;
  fieldClassName: string;
  onSearchChange: (val: string) => void;
}

export const OrdersSearchBar: React.FC<OrdersSearchBarProps> = ({
  search,
  fieldClassName,
  onSearchChange,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    if (localSearch === search) return;
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  const trimmedSearch = localSearch.trim();
  const looksLikeOrderCode =
    /^ORD-/i.test(trimmedSearch) || /^\d{6,}$/.test(trimmedSearch);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && looksLikeOrderCode) {
      e.preventDefault();
      navigate(`/orders/${trimmedSearch}`);
    }
  };

  return (
    <>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 sm:h-4.5 sm:w-4.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          aria-label={String(t("orders.searchPlaceholderUnified"))}
          placeholder={t("orders.searchPlaceholderUnified")}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className={`${fieldClassName} h-9 sm:h-10 w-full rounded-xl border border-border/70 bg-background/80 pr-9 pl-8 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/5 transition-all`}
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => {
              setLocalSearch("");
              onSearchChange("");
            }}
            aria-label={String(t("common.clear", { defaultValue: "مسح" }))}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {looksLikeOrderCode && (
          <button
            type="button"
            onClick={() => navigate(`/orders/${trimmedSearch}`)}
            className="absolute right-0 top-full z-20 mt-1.5 flex w-full min-w-[240px] items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-lg shadow-black/5 transition hover:bg-muted/80 text-foreground cursor-pointer"
          >
            <span className="flex items-center gap-2 font-semibold text-primary">
              <ArrowLeft className="h-4 w-4" />
              {t("orders.openOrderHint")}: {trimmedSearch}
            </span>
            <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              ↵
            </kbd>
          </button>
        )}
      </div>

      <div className="hidden sm:block">
        <CommandPalette />
      </div>
    </>
  );
};

export default OrdersSearchBar;
