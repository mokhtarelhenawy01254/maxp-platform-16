import React, { useEffect, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { GROUP_ICONS, type RouteGroup } from "./groups";
import "./explanations.css";

export interface RailGroup extends RouteGroup {
  items: unknown[];
}

interface SectionRailProps {
  groups: RailGroup[];
  activeGroup: string;
  labelFor: (group: RouteGroup) => string;
  onSelect: (event: React.MouseEvent<HTMLAnchorElement>, key: string) => void;
}

/**
 * تنقّل الأقسام:
 * على الموبايل: شريط تبويبات أفقية ثابت (Sticky Bar) يلتصق أسفل شريط التطبيق العلوي،
 * مع تمرير أفقي سلس ومحاذاة تلقائية للشريحة النشطة في منتصف الشاشة (Auto-centering)،
 * واستجابة لمسية (Tactile Active Feedback) تحاكي تطبيقات الموبايل.
 * على الديسكتوب: قائمة عمودية ثابتة في الشريط الجانبي.
 */
export const SectionRail: React.FC<SectionRailProps> = ({
  groups,
  activeGroup,
  labelFor,
  onSelect,
}) => {
  const pillRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // تمرير تلقائي للشريحة النشطة لمنتصف شريط التمرير على الموبايل
  useEffect(() => {
    if (!activeGroup) return;
    const activeEl = pillRefs.current[activeGroup];
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeGroup]);

  return (
    <nav
      aria-label="أقسام الشروحات"
      className="exp-rail -mx-3 flex gap-2 overflow-x-auto px-3 py-2 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:py-0"
    >
      {groups.map((group) => {
        const isActive = activeGroup === group.key;
        const Icon = GROUP_ICONS[group.key] || MoreHorizontal;

        return (
          <a
            key={group.key}
            ref={(el) => {
              pillRefs.current[group.key] = el;
            }}
            href={`#${group.key}`}
            onClick={(event) => onSelect(event, group.key)}
            aria-current={isActive ? "true" : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-semibold no-underline transition-all duration-150 active:scale-95 ${
              /* تنسيق الموبايل: شريحة دائرية بارزة (Pill) */
              isActive
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-bold rounded-full px-3.5 py-1.5 md:rounded-xl md:bg-primary/10 md:text-primary md:shadow-none"
                : "bg-card border border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground rounded-full px-3 py-1.5 md:rounded-xl md:border-transparent md:bg-transparent"
            } md:w-full md:px-2.5 md:py-2`}
          >
            <Icon
              className={`size-4 shrink-0 transition-colors ${
                isActive
                  ? "text-primary-foreground md:text-primary"
                  : "text-muted-foreground"
              }`}
              aria-hidden="true"
            />
            <span className="truncate">{labelFor(group)}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10.5px] tabular-nums md:ms-auto ${
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground font-bold md:bg-primary/20 md:text-primary"
                  : "bg-muted font-semibold text-muted-foreground"
              }`}
            >
              {group.items.length}
            </span>
          </a>
        );
      })}
    </nav>
  );
};
