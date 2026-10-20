import React, { useState } from "react";
import {
  CheckCircle2,
  Check,
  Copy,
  Eye,
  Loader2,
  Palette,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StorefrontThemeCatalogItem } from "../../../services/storefrontThemeCatalogService";
import {
  getThemeCategory,
  formatThemePrice,
} from "../../types/storefrontThemesTypes";

interface StorefrontThemeCardProps {
  themeItem: StorefrontThemeCatalogItem;
  highlighted: boolean;
  isBusy: boolean;
  onPurchase: (theme: StorefrontThemeCatalogItem) => void;
  onApply: (theme: StorefrontThemeCatalogItem) => void;
  onPreview: (themeId: string) => void;
  onCopyLink: (themeId: string) => void;
  onCustomize: (themeId: string) => void;
  t: (key: string) => string;
}

export const StorefrontThemeCard: React.FC<StorefrontThemeCardProps> = ({
  themeItem,
  highlighted,
  isBusy,
  onPurchase,
  onApply,
  onPreview,
  onCopyLink,
  onCustomize,
  t,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const handleCopyClick = () => {
    onCopyLink(themeItem.themeId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeCategory = getThemeCategory(themeItem);
  const canApplyNow = themeItem.canActivate;
  const isFreeActivation =
    themeItem.pricingModel === "FREE" && !themeItem.isOwned;

  const primaryAction = themeItem.isCurrentTheme
    ? {
        label: t("storefrontThemes.customize"),
        icon: Palette,
        onClick: () => onCustomize(themeItem.themeId),
        className:
          "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
      }
    : themeItem.canPurchase
    ? {
        label: t("storefrontThemes.purchase"),
        icon: ShoppingCart,
        onClick: () => onPurchase(themeItem),
        className: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
      }
    : canApplyNow
    ? {
        label: isFreeActivation
          ? t("storefrontThemes.activateFree")
          : t("storefrontThemes.apply"),
        icon: CheckCircle2,
        onClick: () => onApply(themeItem),
        className: isFreeActivation
          ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
          : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 shadow-sm",
      }
    : {
        label: t("storefrontThemes.customize"),
        icon: Palette,
        onClick: () => onCustomize(themeItem.themeId),
        className:
          "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
      };

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10",
        themeItem.isCurrentTheme && "ring-1 ring-indigo-500 border-indigo-500/30",
        highlighted && "ring-1 ring-amber-500 border-amber-500/30"
      )}
    >
      {/* PREVIEW IMAGE AREA */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-900">
        {themeItem.preview.imageUrl && !imgFailed ? (
          <img
            src={themeItem.preview.imageUrl}
            alt={themeItem.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
            <Sparkles className="size-8 text-indigo-500/40" />
          </div>
        )}

        {/* STATUS BADGES OVERLAY */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {themeItem.isCurrentTheme && (
            <span className="bg-indigo-700 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 uppercase tracking-tighter">
              <CheckCircle2 className="size-2" />{" "}
              {t("storefrontThemes.activeBadge")}
            </span>
          )}
          {themeItem.isFeatured && (
            <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 uppercase tracking-tighter">
              <Sparkles className="size-2" />{" "}
              {t("storefrontThemes.featuredBadge")}
            </span>
          )}
        </div>

        {/* PRICE OVERLAY */}
        <div className="absolute bottom-2 left-2">
          <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-md border border-white/10 tabular-nums font-mono">
            {formatThemePrice(themeItem, t)}
          </span>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex flex-col p-3 flex-1">
        <div className="flex items-start justify-between mb-1">
          <div className="text-left">
            <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight truncate max-w-[140px] uppercase tracking-tight">
              {themeItem.name}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {themeCategory.secondary.label}
            </p>
          </div>
          <div className="flex gap-0.5">
            {themeItem.preview.colors.slice(0, 3).map((c, i) => (
              <div
                key={i}
                className="size-2 rounded-full border border-white/10 shadow-sm"
                style={{ backgroundColor: `hsl(${c})` }}
              />
            ))}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium line-clamp-2 mt-1 min-h-[2.4rem]">
          {themeItem.description}
        </p>

        {/* MINI STATS GRID */}
        <div className="grid grid-cols-2 gap-2 mt-3 py-2 border-y border-slate-100 dark:border-slate-800/50">
          <div className="text-right">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
              {t("storefrontThemes.homeSections")}
            </span>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums font-mono">
              {themeItem.pageStats.homeSections}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">
              {t("storefrontThemes.shopLayers")}
            </span>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums font-mono">
              {themeItem.pageStats.shopSections}
            </span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mt-3">
          <button
            onClick={() => onPreview(themeItem.themeId)}
            className="flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            <Eye className="size-3" /> {t("storefrontThemes.preview")}
          </button>
          <button
            onClick={handleCopyClick}
            title={t("storefrontThemes.copyLink")}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg border transition-all",
              copied
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                : "border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-500 hover:border-indigo-400"
            )}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </button>
          <button
            onClick={primaryAction.onClick}
            disabled={isBusy}
            className={cn(
              "flex items-center justify-center gap-1.5 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              primaryAction.className,
              isBusy && "opacity-50 cursor-not-allowed"
            )}
          >
            {isBusy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <primaryAction.icon className="size-3" />
            )}
            {isBusy ? t("storefrontThemes.wait") : primaryAction.label}
          </button>
        </div>
      </div>
    </article>
  );
};
