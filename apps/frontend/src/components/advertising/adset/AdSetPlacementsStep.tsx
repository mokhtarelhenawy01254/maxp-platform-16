import React from "react";
import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface AdSetPlacementsStepProps {
  placementType: "AUTOMATIC" | "MANUAL";
  onPlacementTypeChange: (type: "AUTOMATIC" | "MANUAL") => void;
  selectedPlacements: string[];
  onPlacementsChange: (placements: string[]) => void;
}

const PLACEMENT_OPTIONS = [
  {
    category: "الخلاصات الرئيسية (Feeds)",
    items: [
      { id: "FACEBOOK_FEED", label: "خلاصة فيسبوك (Facebook Feed)" },
      { id: "INSTAGRAM_FEED", label: "خلاصة إنستجرام (Instagram Feed)" },
      { id: "FACEBOOK_MARKETPLACE", label: "سوق فيسبوك (Marketplace)" },
      { id: "INSTAGRAM_EXPLORE", label: "استكشاف إنستجرام (Explore)" },
    ],
  },
  {
    category: "الريلز والقصص (Stories & Reels - الأعلى تفاعلاً)",
    items: [
      { id: "INSTAGRAM_REELS", label: "ريلز إنستجرام (Instagram Reels)" },
      { id: "FACEBOOK_REELS", label: "ريلز فيسبوك (Facebook Reels)" },
      { id: "INSTAGRAM_STORIES", label: "قصص إنستجرام (Instagram Stories)" },
      { id: "FACEBOOK_STORIES", label: "قصص فيسبوك (Facebook Stories)" },
    ],
  },
  {
    category: "منصات أخرى وشبكات الشركاء",
    items: [
      { id: "MESSENGER_INBOX", label: "بريد ماسنجر (Messenger Inbox)" },
      { id: "AUDIENCE_NETWORK", label: "شبكة جمهور ميتا (Audience Network)" },
    ],
  },
];

export const AdSetPlacementsStep: React.FC<AdSetPlacementsStepProps> = ({
  placementType,
  onPlacementTypeChange,
  selectedPlacements,
  onPlacementsChange,
}) => {
  const togglePlacement = (id: string) => {
    if (selectedPlacements.includes(id)) {
      onPlacementsChange(selectedPlacements.filter((p) => p !== id));
    } else {
      onPlacementsChange([...selectedPlacements, id]);
    }
  };

  const selectAllPlacements = () => {
    const all = PLACEMENT_OPTIONS.flatMap((c) => c.items.map((i) => i.id));
    onPlacementsChange(all);
  };

  const selectReelsAndStoriesOnly = () => {
    onPlacementsChange([
      "INSTAGRAM_REELS",
      "FACEBOOK_REELS",
      "INSTAGRAM_STORIES",
      "FACEBOOK_STORIES",
    ]);
  };

  const selectFeedsOnly = () => {
    onPlacementsChange([
      "FACEBOOK_FEED",
      "INSTAGRAM_FEED",
      "INSTAGRAM_EXPLORE",
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Advantage+ vs Manual Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Advantage+ Placements */}
        <button
          type="button"
          onClick={() => onPlacementTypeChange("AUTOMATIC")}
          className={`text-right p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
            placementType === "AUTOMATIC"
              ? "border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/20 dark:border-cyan-400 shadow-xs"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  مواضع Advantage+ (موصى بها)
                </span>
              </div>
              {placementType === "AUTOMATIC" && (
                <CheckCircleIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              تتيح لخوارزمية ميتا توزيع الإعلان تلقائياً على فيسبوك، إنستجرام، ريلز، وستوري بأقل تكلفة ممكنة للمزاد.
            </p>
          </div>
          <span className="mt-3 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 block">
            ★ الأفضل للمبيعات والوصول الأوسع
          </span>
        </button>

        {/* Manual Placements */}
        <button
          type="button"
          onClick={() => {
            onPlacementTypeChange("MANUAL");
            if (selectedPlacements.length === 0) selectAllPlacements();
          }}
          className={`text-right p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
            placementType === "MANUAL"
              ? "border-cyan-600 bg-cyan-50/50 dark:bg-cyan-950/20 dark:border-cyan-400 shadow-xs"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  مواضع يدوية مخصصة (Manual)
                </span>
              </div>
              {placementType === "MANUAL" && (
                <CheckCircleIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              تحكم كامل في المنصات (إنستجرام فقط، ريلز وستوري فقط، أو استبعاد شبكات الشركاء).
            </p>
          </div>
          <span className="mt-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 block">
            للحملات المخصصة ذات المحتوى الرأسي (9:16)
          </span>
        </button>
      </div>

      {/* Manual Placements Selector */}
      {placementType === "MANUAL" && (
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              اختصارات المواضع السريعة:
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={selectAllPlacements}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-[11px] font-semibold cursor-pointer"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={selectReelsAndStoriesOnly}
                className="px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800/40 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 text-[11px] font-semibold cursor-pointer"
              >
                ريلز وستوري فقط (9:16)
              </button>
              <button
                type="button"
                onClick={selectFeedsOnly}
                className="px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-[11px] font-semibold cursor-pointer"
              >
                الخلاصات (Feeds) فقط
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {PLACEMENT_OPTIONS.map((cat) => (
              <div
                key={cat.category}
                className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/40 dark:bg-gray-800/40 space-y-2.5"
              >
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  {cat.category}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.items.map((item) => {
                    const isChecked = selectedPlacements.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-cyan-50/60 dark:bg-cyan-950/30 border-cyan-300 dark:border-cyan-700"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePlacement(item.id)}
                          className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
