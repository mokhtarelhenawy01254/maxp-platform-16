import React, { useEffect, useRef } from "react";
import { Check, MoreHorizontal, X } from "lucide-react";
import { GROUP_ICONS, type RouteGroup } from "./groups";
import type { RailGroup } from "./SectionRail";

interface MobileCategorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  groups: RailGroup[];
  activeGroup: string;
  labelFor: (group: RouteGroup) => string;
  onSelect: (key: string) => void;
  totalExplanations: number;
}

/**
 * نافذة سفلية منبثقة (Bottom Sheet) تحاكي شاشات التطبيقات الأصلية على iOS و Android
 * تتيح للمستخدم استعراض جميع الأقسام والتنقل الفوري بينها بلمسة واحدة بالإبهام
 */
export const MobileCategorySheet: React.FC<MobileCategorySheetProps> = ({
  isOpen,
  onClose,
  groups,
  activeGroup,
  labelFor,
  onSelect,
  totalExplanations,
}) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // منع التمرير في الخلفية أثناء فتح الـ Sheet
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="أقسام الشروحات"
      className="fixed inset-0 z-50 flex flex-col justify-end md:hidden"
    >
      {/* خلفية ضبابية معتدلة تماثل iOS */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* لوحة الشيت السفلية */}
      <div
        ref={sheetRef}
        className="exp-sheet-panel relative z-10 flex max-h-[85vh] w-full flex-col rounded-t-[28px] border-t border-border/80 bg-card shadow-2xl transition-transform duration-250 ease-out"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1.25rem)",
        }}
      >
        {/* مقبض السحب العلوي (Drag Handle) لمحاكاة التطبيقات */}
        <div className="flex w-full items-center justify-center pt-3 pb-1" onClick={onClose}>
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30 active:bg-muted-foreground/50 transition-colors" />
        </div>

        {/* ترويسة الشيت */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div>
            <h2 className="font-heading text-[16px] font-extrabold text-foreground">
              أقسام الشروحات
            </h2>
            <p className="text-[12px] font-semibold text-muted-foreground">
              {totalExplanations} شرح في {Math.max(groups.length - 1, 0)} أقسام
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-transform hover:bg-muted hover:text-foreground active:scale-95"
            aria-label="إغلاق القائمة"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* قائمة الأقسام القابلة للتمرير */}
        <div className="exp-rail flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-1 gap-2">
            {groups.map((group) => {
              const isActive = activeGroup === group.key;
              const Icon = GROUP_ICONS[group.key] || MoreHorizontal;

              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => {
                    onSelect(group.key);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 text-start transition-all active:scale-[0.98] ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30 shadow-xs font-bold"
                      : "bg-muted/30 text-foreground hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">
                      {labelFor(group)}
                    </span>
                    <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">
                      {group.items.length} شرح
                    </span>
                  </div>

                  {isActive && (
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
