import React from "react";
import { ArrowUp, ChevronUp, MoreHorizontal, PlayCircle } from "lucide-react";
import { GROUP_ICONS, type RouteGroup } from "./groups";
import type { RailGroup } from "./SectionRail";

interface MobileBottomBarProps {
  groups: RailGroup[];
  activeGroup: string;
  labelFor: (group: RouteGroup) => string;
  onOpenSheet: () => void;
  showScrollTop: boolean;
  onScrollToTop: () => void;
  videoOnly: boolean;
  onToggleVideoOnly: () => void;
  hasVideosAvailable: boolean;
}

/**
 * شريط تحكم عائم سفلي (Floating App Dock) مصمم خصيصاً للموبايل
 * يقع تماماً في منطقة الإبهام (Thumb-Zone) ليوفر تجربة تطبيق أصلية
 */
export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  groups,
  activeGroup,
  labelFor,
  onOpenSheet,
  showScrollTop,
  onScrollToTop,
  videoOnly,
  onToggleVideoOnly,
  hasVideosAvailable,
}) => {
  const currentGroup = groups.find((g) => g.key === activeGroup) || groups[0];
  const CurrentIcon = currentGroup ? GROUP_ICONS[currentGroup.key] || MoreHorizontal : MoreHorizontal;
  const currentLabel = currentGroup ? labelFor(currentGroup) : "الأقسام";

  return (
    <aside
      aria-label="قائمة التحكم السفلية"
      className="fixed inset-x-0 z-30 flex justify-center px-4 pointer-events-none md:hidden"
      style={{
        bottom: "max(env(safe-area-inset-bottom, 0px), 0.85rem)",
      }}
    >
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-md transition-all">
        {/* زر فتح قائمة الأقسام مع أيقونة واسم القسم الحالي */}
        <button
          type="button"
          onClick={onOpenSheet}
          className="flex items-center gap-2 rounded-full bg-muted/70 py-1.5 pe-3 ps-2.5 text-[12.5px] font-bold text-foreground transition-transform hover:bg-muted active:scale-95"
          aria-label="عرض أقسام الشروحات"
        >
          <div className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CurrentIcon className="size-3.5" />
          </div>
          <span className="max-w-[120px] truncate">{currentLabel}</span>
          <ChevronUp className="size-3.5 text-muted-foreground" />
        </button>

        {/* فاصل دقيق */}
        <div className="h-4 w-px bg-border/60" aria-hidden="true" />

        {/* فلتر الفيديو السريع للموبايل */}
        {hasVideosAvailable && (
          <button
            type="button"
            onClick={onToggleVideoOnly}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-bold transition-all active:scale-95 ${
              videoOnly
                ? "bg-primary text-primary-foreground shadow-xs font-extrabold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
            aria-pressed={videoOnly}
            title={videoOnly ? "عرض كل الشروحات" : "شروحات بالفيديو فقط"}
          >
            <PlayCircle className="size-3.5" />
            <span>فيديو</span>
          </button>
        )}

        {/* زر التمرير للأعلى */}
        {showScrollTop && (
          <>
            <div className="h-4 w-px bg-border/60" aria-hidden="true" />
            <button
              type="button"
              onClick={onScrollToTop}
              className="flex size-7 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-transform hover:bg-muted hover:text-foreground active:scale-95"
              aria-label="التمرير لأعلى الصفحة"
              title="للأعلى"
            >
              <ArrowUp className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
};
