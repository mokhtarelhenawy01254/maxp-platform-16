import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2, X, Filter, Sparkles } from "lucide-react";
import type { TargetingOption } from "../types";
import { facebookAdsService } from "../../../../services/facebookAdsService";

interface NarrowAudienceSelectorProps {
  narrowInterests: TargetingOption[];
  onAddNarrowInterest: (interest: TargetingOption) => void;
  onRemoveNarrowInterest: (id: string) => void;
}

const getCommonNarrowSuggestions = (isEn: boolean): TargetingOption[] => [
  {
    id: "6003107870611",
    name: isEn ? "Engaged Shoppers" : "Engaged Shoppers (متسوقون متفاعلون)",
  },
  {
    id: "6003294871231",
    name: isEn ? "Online shopping" : "Online shopping (التسوق عبر الإنترنت)",
  },
  {
    id: "6003419082341",
    name: isEn ? "Luxury lifestyle" : "Luxury lifestyle (أسلوب حياة راقٍ)",
  },
  {
    id: "6003502918231",
    name: isEn ? "Discount and coupons" : "Discount and coupons (خصومات وعروض)",
  },
];

export const NarrowAudienceSelector: React.FC<NarrowAudienceSelectorProps> = ({
  narrowInterests,
  onAddNarrowInterest,
  onRemoveNarrowInterest,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const commonNarrowSuggestions = React.useMemo(
    () => getCommonNarrowSuggestions(isEn),
    [isEn],
  );

  const [isOpen, setIsOpen] = useState(narrowInterests.length > 0);
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
    if (!narrowInterests.some((e) => e.id === option.id)) {
      onAddNarrowInterest(option);
    }
    setQuery("");
    setResults([]);
  };

  return (
    <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            {isEn
              ? "Narrow Audience (AND Logic)"
              : "تضييق نطاق الجمهور (Narrow Audience - منطق AND)"}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          {isOpen
            ? isEn
              ? "Hide narrowing"
              : "إخفاء التضييق"
            : isEn
              ? "+ Narrow audience with additional criteria"
              : "+ تضييق الجمهور بشرط إضافي"}
        </button>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {isEn ? (
          <span>
            <strong>&quot;Must also match...&quot; condition:</strong> Ensures
            your ad is shown only to people matching your initial interests{" "}
            <strong>AND</strong> at least one of these narrowed interests,
            substantially increasing targeting accuracy and ROAS.
          </span>
        ) : (
          <span>
            <strong>شرط &quot;يجب أن يتطابق أيضاً مع...&quot;:</strong> يضمن
            ظهور الإعلان فقط للأشخاص الذين ينطبق عليهم اهتمام من اهتماماتك
            السابقة <strong>بالإضافة إلى</strong> أحد هذه الاهتمامات المشروطة،
            مما يرفع دقة الاستهداف ومعدل التحويل.
          </span>
        )}
      </p>

      {isOpen && (
        <div className="space-y-3 pt-1">
          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              {isEn ? "Common narrowing filters:" : "فلاتر تضييق شائعة:"}
            </span>
            {commonNarrowSuggestions.map((preset) => {
              const isSelected = narrowInterests.some((e) => e.id === preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isSelected}
                  onClick={() => handleSelect(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                    isSelected
                      ? "bg-indigo-100/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/40 text-indigo-400 dark:text-indigo-600 cursor-not-allowed"
                      : "bg-white dark:bg-gray-800 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                  }`}
                >
                  {isSelected ? "✓" : "+"} {preset.name}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search
              className={`absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={
                isEn
                  ? "Search interest to narrow (e.g. Engaged shoppers, luxury lifestyle...)"
                  : "ابحث عن اهتمام للتضييق (مثال: متسوقون متفاعلون، عطور، أسلوب حياة...)"
              }
              className={`w-full ${isEn ? "pl-9 pr-4 text-left" : "pr-9 pl-4 text-right"} py-2 border border-indigo-200 dark:border-indigo-900/50 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-400`}
            />
            {loading && (
              <Loader2
                className={`absolute ${isEn ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin`}
              />
            )}
          </div>

          {/* Search Dropdown */}
          {results.length > 0 && (
            <div className="border border-indigo-200 dark:border-indigo-900/50 rounded-lg max-h-44 overflow-y-auto bg-white dark:bg-gray-800 shadow-sm">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className={`w-full px-3 py-2 ${isEn ? "text-left" : "text-right"} hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center justify-between text-xs`}
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

          {/* Selected Narrow Interests */}
          {narrowInterests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {narrowInterests.map((interest) => (
                <span
                  key={interest.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 rounded-full text-xs font-semibold"
                >
                  <span>{interest.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveNarrowInterest(interest.id)}
                    className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 rounded-full transition-colors"
                    title={isEn ? "Remove this condition" : "حذف هذا الشرط"}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
