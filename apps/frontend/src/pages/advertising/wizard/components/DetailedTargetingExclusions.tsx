import React, { useState } from "react";
import { Search, Loader2, X, ShieldAlert, Sparkles } from "lucide-react";
import type { TargetingOption } from "../types";
import { facebookAdsService } from "../../../../services/facebookAdsService";

interface DetailedTargetingExclusionsProps {
  excludedInterests: TargetingOption[];
  onAddExcludedInterest: (interest: TargetingOption) => void;
  onRemoveExcludedInterest: (id: string) => void;
}

const COMMON_EXCLUSION_PRESETS: TargetingOption[] = [
  { id: "6003139266461", name: "Facebook Page Admins (مسؤولو الصفحات)" },
  { id: "6003012947811", name: "Dropshipping (دروب شيبينج)" },
  { id: "6003180486011", name: "AliExpress (علي إكسبريس)" },
  { id: "6003264412211", name: "Shopify (متاجر شوبيفاي)" },
];

export const DetailedTargetingExclusions: React.FC<
  DetailedTargetingExclusionsProps
> = ({
  excludedInterests,
  onAddExcludedInterest,
  onRemoveExcludedInterest,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TargetingOption[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim() || val.length < 2) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = (await facebookAdsService.searchTargetingOptions(
        val,
        "adinterest",
      )) as TargetingOption[];
      setResults(res || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option: TargetingOption) => {
    if (!excludedInterests.some((e) => e.id === option.id)) {
      onAddExcludedInterest(option);
    }
    setQuery("");
    setResults([]);
  };

  return (
    <div className="p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            استبعاد اهتمامات محددة (Detailed Targeting Exclusions)
          </h4>
        </div>
        <span className="text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-full">
          {excludedInterests.length} مستبعد
        </span>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400">
        استبعد فئات واهتمامات معينة لمنع ظهور الإعلان للمنافسين أو البائعين الآخرين وتوفير الميزانية للمشترين الحقيقيين فقط.
      </p>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-red-500 dark:text-red-400" />
          استبعادات شائعة للتجارة:
        </span>
        {COMMON_EXCLUSION_PRESETS.map((preset) => {
          const isSelected = excludedInterests.some((e) => e.id === preset.id);
          return (
            <button
              key={preset.id}
              type="button"
              disabled={isSelected}
              onClick={() => handleSelect(preset)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                isSelected
                  ? "bg-red-100/50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-red-400 dark:text-red-600 cursor-not-allowed"
                  : "bg-white dark:bg-gray-800 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
              }`}
            >
              {isSelected ? "✓" : "+"} {preset.name}
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="ابحث عن اهتمام لاستبعاده (مثال: دروبشيبينج، تجارة إلكترونية...)"
          className="w-full pr-9 pl-4 py-2 border border-red-200 dark:border-red-900/50 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-red-400"
        />
        {loading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Search Dropdown */}
      {results.length > 0 && (
        <div className="border border-red-200 dark:border-red-900/50 rounded-lg max-h-44 overflow-y-auto bg-white dark:bg-gray-800 shadow-sm">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full px-3 py-2 text-right hover:bg-red-50/50 dark:hover:bg-red-950/30 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center justify-between text-xs"
            >
              <span className="font-medium text-gray-800 dark:text-gray-200">{result.name}</span>
              {result.audience_size && (
                <span className="text-gray-400 dark:text-gray-500">
                  {(result.audience_size / 1000000).toFixed(1)}M
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected Excluded Chips */}
      {excludedInterests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {excludedInterests.map((interest) => (
            <span
              key={interest.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 rounded-full text-xs font-medium"
            >
              <span>{interest.name}</span>
              <button
                type="button"
                onClick={() => onRemoveExcludedInterest(interest.id)}
                className="p-0.5 hover:bg-red-200 dark:hover:bg-red-900/60 rounded-full transition-colors"
                title="إلغاء الاستبعاد"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
