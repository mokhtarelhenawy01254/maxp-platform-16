import React, { useState } from "react";
import { Search, Loader2, X, Filter, Sparkles, HelpCircle } from "lucide-react";
import type { TargetingOption } from "../types";
import { facebookAdsService } from "../../../../services/facebookAdsService";

interface NarrowAudienceSelectorProps {
  narrowInterests: TargetingOption[];
  onAddNarrowInterest: (interest: TargetingOption) => void;
  onRemoveNarrowInterest: (id: string) => void;
}

const COMMON_NARROW_SUGGESTIONS: TargetingOption[] = [
  { id: "6003107870611", name: "Engaged Shoppers (متسوقون متفاعلون)" },
  { id: "6003294871231", name: "Online shopping (التسوق عبر الإنترنت)" },
  { id: "6003419082341", name: "Luxury lifestyle (أسلوب حياة راقٍ)" },
  { id: "6003502918231", name: "Discount and coupons (خصومات وعروض)" },
];

export const NarrowAudienceSelector: React.FC<NarrowAudienceSelectorProps> = ({
  narrowInterests,
  onAddNarrowInterest,
  onRemoveNarrowInterest,
}) => {
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
            تضييق نطاق الجمهور (Narrow Audience - منطق AND)
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          {isOpen ? "إخفاء التضييق" : "+ تضييق الجمهور بشرط إضافي"}
        </button>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        <strong>شرط &quot;يجب أن يتطابق أيضاً مع...&quot;:</strong> يضمن ظهور الإعلان فقط للأشخاص الذين ينطبق عليهم اهتمام من اهتماماتك السابقة <strong>بالإضافة إلى</strong> أحد هذه الاهتمامات المشروطة، مما يرفع دقة الاستهداف ومعدل التحويل.
      </p>

      {isOpen && (
        <div className="space-y-3 pt-1">
          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
              فلاتر تضييق شائعة:
            </span>
            {COMMON_NARROW_SUGGESTIONS.map((preset) => {
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
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="ابحث عن اهتمام للتضييق (مثال: متسوقون متفاعلون، عطور، أسلوب حياة...)"
              className="w-full pr-9 pl-4 py-2 border border-indigo-200 dark:border-indigo-900/50 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-400"
            />
            {loading && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
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
                  className="w-full px-3 py-2 text-right hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center justify-between text-xs"
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
                    title="حذف هذا الشرط"
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
