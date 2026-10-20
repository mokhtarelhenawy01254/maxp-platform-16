import React from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StorefrontThemeCatalogItem } from "../../../services/storefrontThemeCatalogService";
import { StorefrontThemeCard } from "./StorefrontThemeCard";

interface StorefrontThemesGridProps {
  filteredThemes: StorefrontThemeCatalogItem[];
  highlightedThemeId: string;
  highlightedTheme: StorefrontThemeCatalogItem | null;
  processingThemeId: string;
  onPurchase: (theme: StorefrontThemeCatalogItem) => void;
  onApply: (theme: StorefrontThemeCatalogItem) => void;
  onPreview: (themeId: string) => void;
  onCopyLink: (themeId: string) => void;
  onCustomize: (themeId: string) => void;
  onClearFocus: () => void;
  onResetFilters: () => void;
  t: (key: string) => string;
}

export const StorefrontThemesGrid: React.FC<StorefrontThemesGridProps> = ({
  filteredThemes,
  highlightedThemeId,
  highlightedTheme,
  processingThemeId,
  onPurchase,
  onApply,
  onPreview,
  onCopyLink,
  onCustomize,
  onClearFocus,
  onResetFilters,
  t,
}) => {
  return (
    <main className="flex-1 p-4 sm:p-6">
      {highlightedThemeId && highlightedTheme && (
        <div className="mb-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                {t("storefrontThemes.directNodeAccess")}
              </span>
            </div>
            <button
              onClick={onClearFocus}
              className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
            >
              {t("storefrontThemes.clearFocus")}
            </button>
          </div>
          <div className="max-w-sm">
            <StorefrontThemeCard
              t={t}
              themeItem={highlightedTheme}
              highlighted={true}
              isBusy={processingThemeId === highlightedTheme.themeId}
              onPurchase={onPurchase}
              onApply={onApply}
              onPreview={onPreview}
              onCopyLink={onCopyLink}
              onCustomize={onCustomize}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
        {filteredThemes.map((theme) => (
          <StorefrontThemeCard
            key={theme.themeId}
            t={t}
            themeItem={theme}
            highlighted={theme.themeId === highlightedThemeId}
            isBusy={processingThemeId === theme.themeId}
            onPurchase={onPurchase}
            onApply={onApply}
            onPreview={onPreview}
            onCopyLink={onCopyLink}
            onCustomize={onCustomize}
          />
        ))}
      </div>

      {filteredThemes.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center gap-4">
          <div className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300">
            <Search className="size-8" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {t("storefrontThemes.noNodesFound")}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {t("storefrontThemes.noNodesHint")}
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-4 rounded-xl px-8 h-10 font-black text-[10px] uppercase tracking-widest"
            onClick={onResetFilters}
          >
            {t("storefrontThemes.resetFilters")}
          </Button>
        </div>
      )}
    </main>
  );
};
