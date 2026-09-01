import React from "react";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  PaintBrushIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  SwatchIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { getStorefrontSectionLabel, getStorefrontSectionManifest } from "../sections/manifest";
import type { StudioLeftPanelTab } from "./StudioTypes";

interface StudioLayersDrawerProps {
  sections: any[];
  selectedSectionKey: string;
  leftPanelTab: StudioLeftPanelTab;
  designTokens?: Record<string, unknown>;
  onSelectSection: (key: string) => void;
  onMoveSection: (index: number, direction: "up" | "down") => void;
  onDuplicateSection: (index: number) => void;
  onDeleteSection: (key: string) => void;
  onOpenSectionCatalog: () => void;
  onTabChange: (tab: StudioLeftPanelTab) => void;
  onUpdateThemeTokens?: (tokens: Record<string, unknown>) => void;
}

export const StudioLayersDrawer: React.FC<StudioLayersDrawerProps> = ({
  sections,
  selectedSectionKey,
  leftPanelTab,
  designTokens,
  onSelectSection,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
  onOpenSectionCatalog,
  onTabChange,
  onUpdateThemeTokens,
}) => {
  const primaryColor = (designTokens?.colors as any)?.primary || "#0f172a";
  const fontFamily = (designTokens?.typography as any)?.fontFamily || "Cairo";
  const isLandingMode = Boolean(designTokens?.landingPageMode);

  return (
    <aside className="flex h-full w-full flex-col border-e border-border/80 bg-card/95 backdrop-blur-md">
      {/* Tab Switcher (Layers vs Theme) */}
      <div className="flex border-b border-border/80 p-2">
        <button
          type="button"
          onClick={() => onTabChange("layers")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
            leftPanelTab === "layers"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Squares2X2Icon className="h-4 w-4" />
          <span>هيكل الصفحة ({sections.length})</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("theme")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
            leftPanelTab === "theme"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PaintBrushIcon className="h-4 w-4" />
          <span>أنماط القالب</span>
        </button>
      </div>

      {/* Content Area */}
      {leftPanelTab === "layers" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Add Section Action Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={onOpenSectionCatalog}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-3 text-xs font-black text-primary transition-all hover:bg-primary/10 hover:border-primary active:scale-98"
            >
              <PlusIcon className="h-4 w-4" />
              <span>إضافة قسم جديد</span>
            </button>
          </div>

          {/* Section Layers List */}
          <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-2 [scrollbar-width:none]">
            {sections.map((section, index) => {
              const sectionType = typeof section === "string" ? section : section.type;
              const sectionKey = typeof section === "string" ? `${section}-${index}` : section.key || `${sectionType}-${index}`;
              const isSelected = selectedSectionKey === sectionKey;
              const label = getStorefrontSectionLabel(sectionType);

              return (
                <div
                  key={sectionKey}
                  onClick={() => onSelectSection(sectionKey)}
                  className={`group relative flex items-center justify-between rounded-2xl border p-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                      : "border-border/60 bg-background/50 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Bars3Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={`truncate text-xs font-black ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {label}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground font-mono">
                        {sectionType}
                      </p>
                    </div>
                  </div>

                  {/* Quick Layer Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index > 0) onMoveSection(index, "up");
                      }}
                      disabled={index === 0}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      title="تحريك لأعلى"
                    >
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index < sections.length - 1) onMoveSection(index, "down");
                      }}
                      disabled={index === sections.length - 1}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      title="تحريك لأسفل"
                    >
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSection(index);
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="تكرار القسم"
                    >
                      <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSection(sectionKey);
                      }}
                      className="rounded-md p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      title="حذف القسم"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Global Theme Tokens Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs [scrollbar-width:none]">
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
            <h3 className="font-black text-foreground flex items-center gap-1.5">
              <SwatchIcon className="h-4 w-4 text-primary" />
              <span>ألوان هوية المتجر (Global Colors)</span>
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                لون الهوية الرئيسي (Primary Brand)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => {
                    if (onUpdateThemeTokens) {
                      onUpdateThemeTokens({
                        ...designTokens,
                        colors: { ...(designTokens?.colors as any || {}), primary: e.target.value },
                      });
                    }
                  }}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => {
                    if (onUpdateThemeTokens) {
                      onUpdateThemeTokens({
                        ...designTokens,
                        colors: { ...(designTokens?.colors as any || {}), primary: e.target.value },
                      });
                    }
                  }}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
            <h3 className="font-black text-foreground">الخط العربي للمتجر</h3>
            <select
              value={fontFamily}
              onChange={(e) => {
                if (onUpdateThemeTokens) {
                  onUpdateThemeTokens({
                    ...designTokens,
                    typography: { ...(designTokens?.typography as any || {}), fontFamily: e.target.value },
                  });
                }
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
            >
              <option value="Cairo">خط كايرو (Cairo - افتراضي وعصري)</option>
              <option value="Readex Pro">خط ريدكس برو (Readex Pro - تقني وفاخر)</option>
              <option value="Tajawal">خط تجوال (Tajawal - ناعم للمنتجات)</option>
              <option value="IBM Plex Sans Arabic">خط آي بي إم (IBM Plex Sans Arabic)</option>
            </select>
          </div>

          {/* Landing Page Mode (Ad Campaigns) */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RocketLaunchIcon className="h-4 w-4 text-primary" />
                <span className="font-black text-foreground">وضع صفحة الهبوط الإعلانية</span>
              </div>
              <input
                type="checkbox"
                checked={isLandingMode}
                onChange={(e) => {
                  if (onUpdateThemeTokens) {
                    onUpdateThemeTokens({
                      ...designTokens,
                      landingPageMode: e.target.checked,
                    });
                  }
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              إخفاء القوائم العلوية والفوتر لتوجيه تركيز عميل الإعلانات الممولة نحو الشراء الفوري فقط.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
