import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemHub } from "@/utils/marketplaceSystems";

interface MyAppsSpecialtyBannerProps {
  recommendedHub: SystemHub;
  specialtyNameAr?: string;
  selectedHub: string;
  onToggleHub: (hubId: string) => void;
}

export const MyAppsSpecialtyBanner: React.FC<MyAppsSpecialtyBannerProps> = ({
  recommendedHub,
  specialtyNameAr,
  selectedHub,
  onToggleHub,
}) => {
  const isSelected = selectedHub === recommendedHub.id;

  return (
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-primary/20 bg-primary/[0.03] text-xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles size={16} />
        </div>
        <div>
          <p className="font-bold text-foreground">
            منظومة مخصصة لنشاط حسابك:{" "}
            <span className="text-primary">
              {specialtyNameAr || recommendedHub.nameAr}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {recommendedHub.descriptionAr}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggleHub(recommendedHub.id)}
        className={cn(
          "px-3.5 py-1.5 rounded-xl font-bold shrink-0 transition-colors text-xs",
          isSelected
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-background border border-border/40 hover:border-primary/40 text-foreground"
        )}
      >
        {isSelected ? "معروضة حالياً ✓" : `عرض أدوات ${recommendedHub.nameAr}`}
      </button>
    </div>
  );
};
