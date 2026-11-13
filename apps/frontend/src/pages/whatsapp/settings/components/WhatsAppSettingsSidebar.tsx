import React from "react";
import { cn } from "@/lib/utils";
import type { TabDefinition, TabId } from "../types/whatsAppSettingsTypes";

interface WhatsAppSettingsNavProps {
  tabs: TabDefinition[];
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export const WhatsAppSettingsNav: React.FC<WhatsAppSettingsNavProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = React.useState({ start: false, end: false });
  const [direction, setDirection] = React.useState<"rtl" | "ltr">("rtl");

  // Overflow affordance: fade only the edge that still hides tabs (the strip
  // used to hide 4 of 7 tabs on a phone with no hint that it scrolls).
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const position = Math.abs(el.scrollLeft);
      setEdges({ start: position > 2, end: max - position > 2 });
      setDirection(
        window.getComputedStyle(el).direction === "ltr" ? "ltr" : "rtl",
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [tabs.length]);

  const fadeStart = edges.start ? "transparent 0px, black 28px" : "black 0px";
  const fadeEnd = edges.end
    ? "black calc(100% - 28px), transparent 100%"
    : "black 100%";
  const maskImage = `linear-gradient(to ${
    direction === "rtl" ? "left" : "right"
  }, ${fadeStart}, ${fadeEnd})`;

  // Roving focus: ArrowLeft/ArrowRight walk the tabs (direction aware),
  // Home/End jump to the ends — the behaviour a tablist is expected to have.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < 0) return;

    const forwardKey = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backwardKey = direction === "rtl" ? "ArrowRight" : "ArrowLeft";

    let nextIndex: number | null = null;
    if (event.key === forwardKey) nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === backwardKey)
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTabId = tabs[nextIndex].id;
    onTabChange(nextTabId);
    event.currentTarget
      .querySelector<HTMLButtonElement>(`[data-tab-id="${nextTabId}"]`)
      ?.focus();
  };

  return (
    <nav
      aria-label="تبويبات إعدادات واتساب"
      className="w-full min-w-0"
    >
      <div
        ref={scrollerRef}
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x px-0.5"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`wa-settings-tab-${tab.id}`}
              data-tab-id={tab.id}
              aria-selected={selected}
              aria-controls={
                selected ? `wa-settings-panel-${tab.id}` : undefined
              }
              tabIndex={selected ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap active:scale-95 min-h-[40px] cursor-pointer",
                selected
                  ? "bg-[color:var(--business-success)] text-white shadow-sm ring-2 ring-[color:var(--business-success)]/20"
                  : "border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Aliases for backward compatibility
export const WhatsAppMobileNav = WhatsAppSettingsNav;
export const WhatsAppDesktopSidebar = WhatsAppSettingsNav;
