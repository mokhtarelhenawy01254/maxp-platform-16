import React from "react";
import {
  Sparkles,
  Sliders,
  CheckCircle2,
} from "lucide-react";

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
      { id: "FACEBOOK_RIGHT_COLUMN", label: "العمود الجانبي لفيسبوك (Right Column)" },
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
    category: "المراسلة وشبكات الشركاء",
    items: [
      { id: "WHATSAPP_STATUS", label: "حالات واتساب (WhatsApp Status)" },
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
      "FACEBOOK_MARKETPLACE",
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
          className={`text-right p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
            placementType === "AUTOMATIC"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
              : "border-border/70 hover:border-border bg-card hover:bg-muted/30"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm text-foreground">
                  مواضع Advantage+ (موصى بها)
                </span>
              </div>
              {placementType === "AUTOMATIC" && (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تتيح لخوارزمية ميتا توزيع الإعلان تلقائياً على فيسبوك، إنستجرام، ريلز، وستوري بأقل تكلفة ممكنة للمزاد.
            </p>
          </div>
          <span className="mt-3 text-[11px] font-semibold text-primary block">
            الأفضل للمبيعات والوصول الأوسع
          </span>
        </button>

        {/* Manual Placements */}
        <button
          type="button"
          onClick={() => {
            onPlacementTypeChange("MANUAL");
            if (selectedPlacements.length === 0) selectAllPlacements();
          }}
          className={`text-right p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
            placementType === "MANUAL"
              ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
              : "border-border/70 hover:border-border bg-card hover:bg-muted/30"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-muted-foreground" />
                <span className="font-bold text-sm text-foreground">
                  مواضع يدوية مخصصة (Manual)
                </span>
              </div>
              {placementType === "MANUAL" && (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تحكم كامل في المنصات (إنستجرام فقط، ريلز وستوري فقط، أو استبعاد شبكات الشركاء).
            </p>
          </div>
          <span className="mt-3 text-[11px] font-medium text-muted-foreground block">
            للحملات المخصصة ذات المحتوى الرأسي (9:16)
          </span>
        </button>
      </div>

      {/* Manual Placements Selector */}
      {placementType === "MANUAL" && (
        <div className="pt-4 border-t border-border/60 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-foreground">
              اختصارات المواضع السريعة:
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={selectAllPlacements}
                className="px-2.5 py-1 rounded-md border border-border/70 hover:bg-muted/50 text-[11px] font-medium text-foreground cursor-pointer transition"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={selectReelsAndStoriesOnly}
                className="px-2.5 py-1 rounded-md border border-border/70 bg-card hover:bg-muted/50 text-foreground text-[11px] font-medium cursor-pointer transition"
              >
                ريلز وستوري فقط (9:16)
              </button>
              <button
                type="button"
                onClick={selectFeedsOnly}
                className="px-2.5 py-1 rounded-md border border-border/70 bg-card hover:bg-muted/50 text-foreground text-[11px] font-medium cursor-pointer transition"
              >
                الخلاصات (Feeds) فقط
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {PLACEMENT_OPTIONS.map((cat) => (
              <div
                key={cat.category}
                className="p-3.5 border border-border/70 rounded-xl bg-muted/20 space-y-2.5"
              >
                <span className="text-xs font-bold text-foreground block">
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
                            ? "bg-primary/10 border-primary/30 text-foreground"
                            : "bg-card border-border/60 text-foreground hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePlacement(item.id)}
                          className="w-4 h-4 text-primary focus:ring-primary rounded cursor-pointer accent-primary"
                        />
                        <span className="text-xs font-medium">
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
