import React, { useState } from "react";
import {
  PaintBrushIcon,
  PlusIcon,
  Squares2X2Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StudioThemeSettingsPanel } from "./StudioThemeSettingsPanel";
import { StudioSortableLayerRow } from "./StudioSortableLayerRow";
import { getStorefrontSectionLabel } from "../sections/manifest";
import { getAllSectionKeys } from "../engine/tree/treeUtils";
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

export interface StudioLayersDrawerProps {
  sections: any[];
  sectionKeys?: string[];
  selectedSectionKey: string;
  leftPanelTab: StudioLeftPanelTab;
  designTokens?: Record<string, unknown>;
  onSelectSection: (key: string) => void;
  onRenameSection?: (key: string, newLabel: string) => void;
  onToggleSectionVisibility?: (key: string) => void;
  onToggleSectionLock?: (key: string) => void;
  onMoveSection: (index: number, direction: "up" | "down", parentKey?: string) => void;
  onDuplicateSection: (index: number, parentKey?: string) => void;
  onDeleteSection: (key: string) => void;
  onOpenSectionCatalog: () => void;
  onTabChange: (tab: StudioLeftPanelTab) => void;
  onUpdateThemeTokens?: (tokens: Record<string, unknown>) => void;
  onCollapse?: () => void;
  onSectionContextMenu?: (
    e: React.MouseEvent,
    info: {
      sectionKey: string;
      index: number;
      parentKey?: string;
      label: string;
      isHidden: boolean;
      isLocked: boolean;
      totalSections: number;
    }
  ) => void;
}

export const StudioLayersDrawer: React.FC<StudioLayersDrawerProps> = ({
  sections,
  sectionKeys,
  selectedSectionKey,
  leftPanelTab,
  designTokens,
  onSelectSection,
  onRenameSection,
  onToggleSectionVisibility,
  onToggleSectionLock,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
  onOpenSectionCatalog,
  onTabChange,
  onUpdateThemeTokens,
  onCollapse,
  onSectionContextMenu,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [collapsedContainers, setCollapsedContainers] = useState<Record<string, boolean>>({});

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
              items={sectionKeys || getAllSectionKeys(sections)}
              strategy={verticalListSortingStrategy}
            >
              {(() => {
                const renderLayerNodes = (items: any[], depth = 0, parentKey?: string): React.ReactNode => {
                  return items.map((section, index) => {
                    const sectionType = typeof section === "string" ? section : section.type;
                    const sectionKey =
                      typeof section === "string"
                        ? `${section}-${index}`
                        : section.key || `${sectionType}-${index}`;
                    const isSelected = selectedSectionKey === sectionKey;
                    const customLabel =
                      typeof section === "object" && section !== null
                        ? (section.label || section.settings?.label)
                        : undefined;
                    const label =
                      customLabel ||
                      (sectionType === "container"
                        ? "حاوية"
                        : getStorefrontSectionLabel(sectionType));
                    const isHidden = Boolean(
                      typeof section === "object" &&
                        section !== null &&
                        (section.hidden || section.settings?.hidden)
                    );
                    const isLocked = Boolean(
                      typeof section === "object" &&
                        section !== null &&
                        (section.locked || section.settings?.locked)
                    );
                    const isContainer = sectionType === "container";
                    const children = Array.isArray(section.children) ? section.children : [];
                    const isCollapsed = Boolean(collapsedContainers[sectionKey]);

                    const normalizedQuery = searchQuery.trim().toLowerCase();
                    if (
                      normalizedQuery &&
                      !label.toLowerCase().includes(normalizedQuery) &&
                      !sectionType.toLowerCase().includes(normalizedQuery)
                    ) {
                      return null;
                    }

                    return (
                      <React.Fragment key={sectionKey}>
                        <StudioSortableLayerRow
                          index={index}
                          sectionKey={sectionKey}
                          sectionType={sectionType}
                          label={label}
                          isHidden={isHidden}
                          isLocked={isLocked}
                          isSelected={isSelected}
                          totalSections={items.length}
                          depth={depth}
                          isContainer={isContainer}
                          isCollapsed={isCollapsed}
                          onToggleCollapse={() =>
                            setCollapsedContainers((prev) => ({
                              ...prev,
                              [sectionKey]: !prev[sectionKey],
                            }))
                          }
                          childrenCount={children.length}
                          parentKey={parentKey}
                          onSelect={() => onSelectSection(sectionKey)}
                          onRename={(newLabel) => onRenameSection?.(sectionKey, newLabel)}
                          onToggleVisibility={() => onToggleSectionVisibility?.(sectionKey)}
                          onToggleLock={() => onToggleSectionLock?.(sectionKey)}
                          onMoveUp={() => onMoveSection(index, "up", parentKey)}
                          onMoveDown={() => onMoveSection(index, "down", parentKey)}
                          onDuplicate={() => onDuplicateSection(index, parentKey)}
                          onDelete={() => onDeleteSection(sectionKey)}
                          onContextMenu={(e) => {
                            onSectionContextMenu?.(e, {
                              sectionKey,
                              index,
                              parentKey,
                              label,
                              isHidden,
                              isLocked,
                              totalSections: items.length,
                            });
                          }}
                        />
                        {isContainer && !isCollapsed && children.length > 0 && (
                          <div className="flex flex-col space-y-2">
                            {renderLayerNodes(children, depth + 1, sectionKey)}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  });
                };
                return renderLayerNodes(sections);
              })()}
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
