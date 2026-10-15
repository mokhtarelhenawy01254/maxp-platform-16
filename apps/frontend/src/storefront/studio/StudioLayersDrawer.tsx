import React, { useState } from "react";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  PaintBrushIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StudioThemeSettingsPanel } from "./StudioThemeSettingsPanel";
import { CSS } from "@dnd-kit/utilities";
import { getStorefrontSectionLabel } from "../sections/manifest";
import type { StudioLeftPanelTab } from "./StudioTypes";

export const GripDotsIcon: React.FC<{ className?: string }> = ({ className = "h-3.5 w-3.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <circle cx="9" cy="6" r="1.55" />
    <circle cx="15" cy="6" r="1.55" />
    <circle cx="9" cy="12" r="1.55" />
    <circle cx="15" cy="12" r="1.55" />
    <circle cx="9" cy="18" r="1.55" />
    <circle cx="15" cy="18" r="1.55" />
  </svg>
);

interface StudioLayersDrawerProps {
  sections: any[];
  sectionKeys?: string[];
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
  onCollapse?: () => void;
}

const StudioSortableLayerRow: React.FC<{
  index: number;
  sectionKey: string;
  sectionType: string;
  label: string;
  isSelected: boolean;
  totalSections: number;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({
  index,
  sectionKey,
  sectionType,
  label,
  isSelected,
  totalSections,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionKey });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative flex items-center justify-between rounded-xl border p-2 transition-all cursor-pointer ${
        isSelected
          ? "border-[#2b6cf6] bg-[#2b6cf6]/15 text-white shadow-xs ring-1 ring-[#2b6cf6]/40"
          : "border-[#33363c] bg-[#26292f] hover:border-[#424752] hover:bg-[#2c313a] text-[#c3c7cd]"
      } ${isDragging ? "border-dashed border-[#2b6cf6]" : ""}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-[#8b9199] hover:text-[#2b6cf6] hover:bg-[#2b6cf6]/10 active:cursor-grabbing cursor-grab touch-none transition-colors"
          title="اسحب لإعادة الترتيب"
          aria-label="اسحب لإعادة الترتيب"
        >
          <GripDotsIcon className="h-3.5 w-3.5" />
        </button>

        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1a1b20] text-[#8fa4c8] group-hover:text-[#2b6cf6] transition-colors">
          <Bars3Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className={`truncate text-xs font-black ${isSelected ? "text-white" : "text-[#e8eaee]"}`}>
            {label}
          </p>
          <p className="truncate text-[10px] text-[#8a8f96] font-mono">
            {sectionType}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (index > 0) onMoveUp();
          }}
          disabled={index === 0}
          className="rounded-md p-1 text-[#8a8f96] hover:bg-[#34383f] hover:text-white disabled:opacity-20"
          title="تحريك لأعلى"
        >
          <ChevronUpIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (index < totalSections - 1) onMoveDown();
          }}
          disabled={index === totalSections - 1}
          className="rounded-md p-1 text-[#8a8f96] hover:bg-[#34383f] hover:text-white disabled:opacity-20"
          title="تحريك لأسفل"
        >
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="rounded-md p-1 text-[#8a8f96] hover:bg-[#34383f] hover:text-white"
          title="تكرار القسم"
        >
          <DocumentDuplicateIcon className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-md p-1 text-red-400 hover:bg-red-950/40 hover:text-red-300"
          title="حذف القسم"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export const StudioLayersDrawer: React.FC<StudioLayersDrawerProps> = ({
  sections,
  sectionKeys,
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
  onCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  return (
    <aside className="flex h-full w-full flex-col border-e border-border/80 bg-card/95 backdrop-blur-md">
      {/* Tab Switcher (Layers vs Theme) */}
      <div className="flex items-center border-b border-border/80 p-2 gap-1">
        <button
          type="button"
          onClick={() => onTabChange("layers")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
            leftPanelTab === "layers"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Squares2X2Icon className="h-4 w-4" />
          <span>الهيكل ({sections.length})</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("theme")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
            leftPanelTab === "theme"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PaintBrushIcon className="h-4 w-4" />
          <span>الأنماط</span>
        </button>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="إخفاء لوحة الهيكل"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content Area */}
      {leftPanelTab === "layers" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Section Search */}
          <div className="px-3 pt-3">
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="absolute start-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأقسام…"
                className="w-full rounded-xl border border-border/80 bg-background/60 py-1.5 ps-8 pe-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  title="مسح البحث"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Add Section Action Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={onOpenSectionCatalog}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-2.5 text-xs font-black text-primary transition-all hover:bg-primary/10 hover:border-primary active:scale-98"
            >
              <PlusIcon className="h-4 w-4" />
              <span>إضافة قسم جديد</span>
            </button>
          </div>

          {/* Section Layers List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 [scrollbar-width:thin]">
            <SortableContext
              items={
                sectionKeys ||
                sections.map((s, idx) =>
                  typeof s === "string" ? `${s}-${idx}` : s.key || `${s?.type || "section"}-${idx}`
                )
              }
              strategy={verticalListSortingStrategy}
            >
              {sections.map((section, index) => {
                const sectionType = typeof section === "string" ? section : section.type;
                const sectionKey =
                  (sectionKeys && sectionKeys[index]) ||
                  (typeof section === "string"
                    ? `${section}-${index}`
                    : section.key || `${sectionType}-${index}`);
                const isSelected = selectedSectionKey === sectionKey;
                const label = getStorefrontSectionLabel(sectionType);

                const normalizedQuery = searchQuery.trim().toLowerCase();
                if (
                  normalizedQuery &&
                  !label.toLowerCase().includes(normalizedQuery) &&
                  !sectionType.toLowerCase().includes(normalizedQuery)
                ) {
                  return null;
                }

                return (
                  <StudioSortableLayerRow
                    key={sectionKey}
                    index={index}
                    sectionKey={sectionKey}
                    sectionType={sectionType}
                    label={label}
                    isSelected={isSelected}
                    totalSections={sections.length}
                    onSelect={() => onSelectSection(sectionKey)}
                    onMoveUp={() => onMoveSection(index, "up")}
                    onMoveDown={() => onMoveSection(index, "down")}
                    onDuplicate={() => onDuplicateSection(index)}
                    onDelete={() => onDeleteSection(sectionKey)}
                  />
                );
              })}
            </SortableContext>
          </div>

          {/* Footer Drag Hint */}
          <div className="border-t border-border/60 py-2.5 px-3 text-center text-[10px] text-muted-foreground">
            <span>اسحب المقبض <b>⠿</b> لإعادة ترتيب الأقسام</span>
          </div>
        </div>
      ) : (
        <StudioThemeSettingsPanel
          designTokens={designTokens || {}}
          onUpdateThemeTokens={onUpdateThemeTokens}
        />
      )}
    </aside>
  );
};
