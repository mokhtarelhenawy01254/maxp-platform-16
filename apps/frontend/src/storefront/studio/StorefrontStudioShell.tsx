import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  Squares2X2Icon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { StudioTopBar } from "./StudioTopBar";
import { StudioLayersDrawer, GripDotsIcon } from "./StudioLayersDrawer";
import { StudioPropertyInspector } from "./StudioPropertyInspector";
import { StudioCanvasStage } from "./StudioCanvasStage";
import { StudioSectionCatalogModal } from "./StudioSectionCatalogModal";
import type { StudioDeviceMode, StudioLeftPanelTab } from "./StudioTypes";
import { useStudioSectionDnD, reorderSections } from "./hooks/useStudioSectionDnD";
import { PageComposer } from "../engine/PageComposer";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";
import { resolveStorefrontTheme, type StorefrontThemeInput } from "../engine/themeResolver";
import { STOREFRONT_THEME_PRESETS } from "../themes";
import { getStorefrontSectionLabel, getStorefrontSectionManifest } from "../sections/manifest";
import StorefrontImagePickerModal from "../../components/store/StorefrontImagePickerModal";
import { useStudioHistory } from "./hooks/useStudioHistory";
import { useCartStore } from "../store/useCartStore";
import { getMarketplacePreviewCartItems } from "../preview/marketplacePreviewCart";

interface StorefrontStudioShellProps {
  themeId: string;
  designTokens: Record<string, unknown>;
  storeName?: string;
  hasPendingChanges: boolean;
  saving: boolean;
  previewUrl?: string;
  onSave: () => void;
  onDiscard?: () => void;
  onBack: () => void;
  onOpenPreview: () => void;
  onChange: (nextTokens: Record<string, unknown>) => void;
  companyId?: string;
}

const getSectionKey = (section: any, index: number): string => {
  if (typeof section === "string") return `${section}-${index}`;
  return section?.key || `${section?.type || "section"}-${index}`;
};

export const StorefrontStudioShell: React.FC<StorefrontStudioShellProps> = ({
  themeId,
  designTokens: externalDesignTokens,
  storeName = "متجري",
  hasPendingChanges,
  saving,
  previewUrl,
  onSave,
  onDiscard,
  onBack,
  onOpenPreview,
  onChange,
  companyId,
}) => {
  const [activePageKey, setActivePageKey] = useState<string>("home");
  const [deviceMode, setDeviceMode] = useState<StudioDeviceMode>("desktop");
  const [leftPanelTab, setLeftPanelTab] = useState<StudioLeftPanelTab>("layers");

  // Seed sample cart items in visual editor mode so Cart and Checkout pages render preview data
  useEffect(() => {
    const currentItems = useCartStore.getState().items;
    if (currentItems.length > 0) return;

    const previewItems = getMarketplacePreviewCartItems(themeId);
    if (previewItems && previewItems.length > 0) {
      useCartStore.setState({ items: previewItems, isOpen: false });
    }
  }, [themeId]);
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>("");
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState<boolean>(false);
  const [mobileStudioTab, setMobileStudioTab] = useState<"canvas" | "layers" | "inspector">("canvas");
  const [isLayersOpen, setIsLayersOpen] = useState<boolean>(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1280;
    }
    return false;
  });

  // History State for Undo / Redo
  const {
    state: currentDesignTokens,
    set: setDesignTokensWithHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useStudioHistory<Record<string, unknown>>(externalDesignTokens, { maxHistory: 30 });

  const handleDesignTokensChange = useCallback(
    (next: Record<string, unknown>) => {
      setDesignTokensWithHistory(next);
      onChange(next);
    },
    [setDesignTokensWithHistory, onChange]
  );

  // Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          onSave();
        } else if (e.key === "z" || e.key === "Z") {
          if (e.shiftKey) {
            e.preventDefault();
            if (canRedo) redo();
          } else {
            e.preventDefault();
            if (canUndo) undo();
          }
        } else if (e.key === "y" || e.key === "Y") {
          e.preventDefault();
          if (canRedo) redo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, undo, redo, canUndo, canRedo]);

  const previewTheme = useMemo(() => {
    const baseTheme = STOREFRONT_THEME_PRESETS[themeId] || STOREFRONT_THEME_PRESETS["modern-minimal"];
    return resolveStorefrontTheme({
      themeId,
      theme: baseTheme,
      designTokens: currentDesignTokens,
    });
  }, [themeId, currentDesignTokens]);

  const activePageConfig = useMemo(() => {
    const page = previewTheme.pages[activePageKey] || previewTheme.pages["home"] || { sections: [] };
    return {
      ...page,
      sections: page.sections || [],
    };
  }, [previewTheme, activePageKey]);

  const activeSections = useMemo(() => {
    return activePageConfig.sections || [];
  }, [activePageConfig]);

  // Auto-select the first section if none is selected
  useEffect(() => {
    if (activeSections.length > 0 && !selectedSectionKey) {
      setSelectedSectionKey(getSectionKey(activeSections[0], 0));
    }
  }, [activeSections, selectedSectionKey]);

  const selectedSectionConfig = useMemo(() => {
    if (!selectedSectionKey) return null;
    return activeSections.find((s: any, idx: number) => {
      const key = getSectionKey(s, idx);
      return key === selectedSectionKey;
    }) || null;
  }, [activeSections, selectedSectionKey]);

  // Section Manipulation Handlers
  const handleReorderSection = useCallback(
    (fromIndex: number, targetSlot: number) => {
      const nextSections = reorderSections(activeSections, fromIndex, targetSlot);
      if (nextSections === activeSections) return;

      const nextPages = {
        ...(currentDesignTokens?.pages as Record<string, unknown> || {}),
        ...(currentDesignTokens?.pageOverrides as Record<string, unknown> || {}),
        [activePageKey]: {
          ...activePageConfig,
          sections: nextSections,
        },
      };

      handleDesignTokensChange({
        ...currentDesignTokens,
        pages: nextPages,
        pageOverrides: nextPages,
      });
    },
    [activeSections, currentDesignTokens, activePageKey, activePageConfig, handleDesignTokensChange]
  );

  const handleMoveSection = useCallback(
    (index: number, direction: "up" | "down") => {
      const targetSlot = direction === "up" ? index - 1 : index + 2;
      handleReorderSection(index, targetSlot);
    },
    [handleReorderSection]
  );

  const {
    isDragging,
    activePayload,
    dropTarget,
    pointerPos,
    startDrag,
  } = useStudioSectionDnD({
    sections: activeSections,
    onReorder: handleReorderSection,
  });

  const handleDuplicateSection = (index: number) => {
    const sectionToDup = activeSections[index];
    if (!sectionToDup) return;

    const nextSections = [...activeSections];
    const cloned = JSON.parse(JSON.stringify(sectionToDup));
    if (typeof cloned === "object" && cloned !== null) {
      cloned.key = `${cloned.type || "section"}-${Date.now()}`;
    }
    nextSections.splice(index + 1, 0, cloned);

    const nextPages = {
      ...(currentDesignTokens?.pages as Record<string, unknown> || {}),
      ...(currentDesignTokens?.pageOverrides as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    handleDesignTokensChange({
      ...currentDesignTokens,
      pages: nextPages,
      pageOverrides: nextPages,
    });
  };

  const handleDeleteSection = (keyToDelete: string) => {
    const nextSections = activeSections.filter((s: any, idx: number) => {
      const key = getSectionKey(s, idx);
      return key !== keyToDelete;
    });

    if (selectedSectionKey === keyToDelete) {
      setSelectedSectionKey(nextSections[0] ? getSectionKey(nextSections[0], 0) : "");
    }

    const nextPages = {
      ...(currentDesignTokens?.pages as Record<string, unknown> || {}),
      ...(currentDesignTokens?.pageOverrides as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    handleDesignTokensChange({
      ...currentDesignTokens,
      pages: nextPages,
      pageOverrides: nextPages,
    });
  };

  const handleAddSection = (sectionType: string) => {
    const newKey = `${sectionType}-${Date.now()}`;
    const nextSections = [
      ...activeSections,
      {
        type: sectionType,
        key: newKey,
        settings: {},
      },
    ];

    const nextPages = {
      ...(currentDesignTokens?.pages as Record<string, unknown> || {}),
      ...(currentDesignTokens?.pageOverrides as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    setSelectedSectionKey(newKey);

    handleDesignTokensChange({
      ...currentDesignTokens,
      pages: nextPages,
      pageOverrides: nextPages,
    });
  };

  const handleUpdateSectionField = (field: string, value: any) => {
    if (!selectedSectionKey) return;

    const nextSections = activeSections.map((s: any, idx: number) => {
      const key = getSectionKey(s, idx);
      if (key !== selectedSectionKey) return s;

      const base = typeof s === "string" ? { type: s } : { ...s };
      const baseSettings = typeof base.settings === "object" && base.settings !== null ? { ...base.settings } : {};

      baseSettings[field] = value;

      return {
        ...base,
        [field]: value,
        settings: baseSettings,
      };
    });

    const nextPages = {
      ...(currentDesignTokens?.pages as Record<string, unknown> || {}),
      ...(currentDesignTokens?.pageOverrides as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    handleDesignTokensChange({
      ...currentDesignTokens,
      pages: nextPages,
      pageOverrides: nextPages,
    });
  };

  const themeName = STOREFRONT_THEME_PRESETS[themeId]?.name || themeId;

  // Announcement Bar & WhatsApp data
  const announcement = (currentDesignTokens?.announcement as any) || {
    enabled: true,
    text: "🔥 شحن مجاني للطلبات فوق 500 جنيه • دفع عند الاستلام",
  };
  const whatsapp = (currentDesignTokens?.whatsapp as any) || {
    enabled: true,
    phone: "01000000000",
  };

  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-full flex-col overflow-hidden bg-background text-foreground" dir="rtl">
      {/* 1. Studio Top Bar */}
      <StudioTopBar
        storeName={storeName}
        themeName={themeName}
        activePageKey={activePageKey}
        deviceMode={deviceMode}
        hasPendingChanges={hasPendingChanges}
        canUndo={canUndo}
        canRedo={canRedo}
        saving={saving}
        previewUrl={previewUrl}
        isLayersOpen={isLayersOpen}
        isInspectorOpen={isInspectorOpen}
        onToggleLayers={() => setIsLayersOpen((prev) => !prev)}
        onToggleInspector={() => {
          if (!isInspectorOpen && !selectedSectionKey && activeSections.length > 0) {
            setSelectedSectionKey(getSectionKey(activeSections[0], 0));
          }
          setIsInspectorOpen((prev) => !prev);
        }}
        onBack={onBack}
        onPageChange={(page) => {
          setActivePageKey(page);
          setSelectedSectionKey("");
        }}
        onDeviceChange={setDeviceMode}
        onUndo={undo}
        onRedo={redo}
        onDiscard={onDiscard}
        onSave={onSave}
        onOpenPreview={onOpenPreview}
      />

      {/* 2. Studio 3-Dock Workspace */}
      <div className="relative flex flex-1 h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Right Studio Dock (Layers / Catalog) */}
        <div
          className={`h-full shrink-0 border-e border-border/80 bg-card ${
            mobileStudioTab === "layers" ? "flex w-full" : "hidden"
          } ${isLayersOpen ? "md:flex md:w-80" : "md:hidden"} flex-col transition-all duration-200`}
        >
          <StudioLayersDrawer
            sections={activeSections}
            selectedSectionKey={selectedSectionKey}
            leftPanelTab={leftPanelTab}
            designTokens={currentDesignTokens}
            isDragging={isDragging}
            activeDragKey={activePayload?.sectionKey}
            dropTarget={dropTarget}
            onStartDrag={startDrag}
            onSelectSection={(key) => {
              setSelectedSectionKey(key);
              setIsInspectorOpen(true);
              setMobileStudioTab("inspector");
            }}
            onMoveSection={handleMoveSection}
            onDuplicateSection={handleDuplicateSection}
            onDeleteSection={handleDeleteSection}
            onOpenSectionCatalog={() => setShowCatalogModal(true)}
            onTabChange={setLeftPanelTab}
            onUpdateThemeTokens={handleDesignTokensChange}
            onCollapse={() => setIsLayersOpen(false)}
          />
        </div>

        {/* Center Studio Stage (Interactive Live Canvas) */}
        <div
          className={`h-full flex-1 overflow-hidden bg-muted/20 ${
            mobileStudioTab === "canvas" ? "flex w-full" : "hidden"
          } md:flex flex-col min-w-0`}
        >
          <StudioCanvasStage deviceMode={deviceMode}>
            <StorefrontThemeProvider initialTheme={previewTheme as unknown as StorefrontThemeInput}>
              <div data-studio-dropzone="canvas" className="relative min-h-screen bg-background">
                {/* Announcement Bar Overlay */}
                {announcement.enabled && announcement.text && (
                  <div className="bg-slate-900 px-3 py-1.5 text-center text-[11px] font-bold text-white shadow-sm flex items-center justify-center gap-2">
                    <span>{announcement.text}</span>
                  </div>
                )}

                <PageComposer
                  pageConfig={activePageConfig}
                  layout={activePageConfig.layoutHint || "stack"}
                  renderSectionFrame={({ element, index, sectionEntry, sectionId, componentKey }) => {
                    const stableSectionKey = getSectionKey(sectionEntry, index);
                    const selected = stableSectionKey === selectedSectionKey;
                    const sectionLabel =
                      getStorefrontSectionManifest(typeof sectionEntry === "string" ? sectionEntry : sectionEntry?.type)?.label ||
                      getStorefrontSectionManifest(componentKey)?.label ||
                      getStorefrontSectionLabel(sectionId);
                    const sectionType = typeof sectionEntry === "string" ? sectionEntry : sectionEntry?.type || "section";

                    const isDropTargetBefore = dropTarget?.zone === "canvas" && dropTarget.slot === index;
                    const isDropTargetAfter =
                      dropTarget?.zone === "canvas" &&
                      dropTarget.slot === activeSections.length &&
                      index === activeSections.length - 1;
                    const isBeingDragged = isDragging && activePayload?.sectionKey === stableSectionKey;

                    return (
                      <div
                        key={`${stableSectionKey}-${index}`}
                        data-studio-canvas-item="true"
                        data-index={index}
                        className={`group relative cursor-pointer ${isBeingDragged ? "opacity-40" : ""}`}
                        onClick={() => {
                          setSelectedSectionKey(stableSectionKey);
                          setIsInspectorOpen(true);
                          setMobileStudioTab("inspector");
                        }}
                      >
                        {/* Drop indicator before section */}
                        {isDropTargetBefore && (
                          <div className="absolute -top-1.5 inset-x-0 z-50 h-[3px] rounded-full bg-primary shadow-[0_0_0_3px_rgba(59,130,246,0.4)] pointer-events-none" />
                        )}
                        {/* Drop indicator after last section */}
                        {isDropTargetAfter && (
                          <div className="absolute -bottom-1.5 inset-x-0 z-50 h-[3px] rounded-full bg-primary shadow-[0_0_0_3px_rgba(59,130,246,0.4)] pointer-events-none" />
                        )}

                        {/* Interactive Highlight Border */}
                        <div
                          className={`pointer-events-none absolute inset-0 z-30 rounded-2xl border-2 transition-all ${
                            selected
                              ? "border-primary bg-primary/[0.04] shadow-[0_0_0_3px_rgba(59,130,246,0.25)]"
                              : "border-transparent group-hover:border-primary/40 group-hover:bg-primary/[0.015]"
                          }`}
                        />

                        {/* On-Canvas Floating Action Toolbar */}
                        <div
                          className={`absolute top-2 start-2 z-40 flex items-center gap-1 rounded-xl border border-border/80 bg-background/95 p-1 shadow-xl backdrop-blur-md transition-opacity duration-150 ${
                            selected
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
                            {sectionLabel}
                          </span>
                          <div className="h-3 w-[1px] bg-border mx-0.5" />
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              startDrag(e, {
                                source: "canvas",
                                index,
                                sectionKey: stableSectionKey,
                                label: sectionLabel,
                                type: sectionType,
                              });
                            }}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary active:cursor-grabbing cursor-grab touch-none transition-colors"
                            title="اسحب لإعادة الترتيب"
                            aria-label="اسحب لإعادة الترتيب"
                          >
                            <GripDotsIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => index > 0 && handleMoveSection(index, "up")}
                            disabled={index === 0}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            title="تحريك لأعلى"
                          >
                            <ChevronUpIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => index < activeSections.length - 1 && handleMoveSection(index, "down")}
                            disabled={index === activeSections.length - 1}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                            title="تحريك لأسفل"
                          >
                            <ChevronDownIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateSection(index)}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="تكرار القسم"
                          >
                            <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(stableSectionKey)}
                            className="rounded-lg p-1 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                            title="حذف القسم"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="relative z-10 select-none [&_a]:pointer-events-none [&_button]:pointer-events-none [&_input]:pointer-events-none [&_select]:pointer-events-none">
                          {element}
                        </div>
                      </div>
                    );
                  }}
                />

                {/* Floating WhatsApp Live Button */}
                {whatsapp.enabled && (
                  <div className="absolute bottom-6 end-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl hover:scale-105 transition-transform pointer-events-none">
                    <ChatBubbleLeftRightIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
            </StorefrontThemeProvider>
          </StudioCanvasStage>
        </div>

        {/* Left Studio Dock (Property Inspector) */}
        <div
          className={`h-full shrink-0 border-s border-border/80 bg-card ${
            mobileStudioTab === "inspector" ? "flex w-full" : "hidden"
          } ${isInspectorOpen ? "md:flex md:w-80 lg:w-96" : "md:hidden"} flex-col transition-all duration-200`}
        >
          <StudioPropertyInspector
            selectedSectionKey={selectedSectionKey}
            sectionConfig={selectedSectionConfig}
            onClose={() => setIsInspectorOpen(false)}
            onUpdateField={handleUpdateSectionField}
            onOpenImagePicker={() => setShowImagePickerModal(true)}
          />
        </div>
      </div>

      {/* 3. Mobile Bottom Studio Dock */}
      <div className="sticky bottom-0 z-40 flex h-14 w-full items-center justify-around border-t border-border/80 bg-background/95 p-1 backdrop-blur-md md:!hidden">
        <button
          type="button"
          onClick={() => setMobileStudioTab("layers")}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-bold ${
            mobileStudioTab === "layers" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Squares2X2Icon className="h-4 w-4" />
          <span>الهيكل ({activeSections.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileStudioTab("canvas")}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-bold ${
            mobileStudioTab === "canvas" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <EyeIcon className="h-4 w-4" />
          <span>المعاينة</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileStudioTab("inspector");
            setIsInspectorOpen(true);
          }}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-bold ${
            mobileStudioTab === "inspector" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          <span>الخصائص {selectedSectionKey ? "•" : ""}</span>
        </button>
      </div>

      {/* 4. Section Catalog Modal */}
      <StudioSectionCatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onAddSection={handleAddSection}
      />

      {/* 5. Image Picker Modal */}
      <StorefrontImagePickerModal
        isOpen={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onSelectImage={(url) => {
          handleUpdateSectionField("image", url);
          handleUpdateSectionField("backgroundImage", url);
          setShowImagePickerModal(false);
        }}
        selectedUrl={selectedSectionConfig?.image || selectedSectionConfig?.backgroundImage || ""}
      />

      {/* 6. Drag & Drop Floating Ghost Pill */}
      {isDragging && activePayload && (
        <div
          style={{
            position: "fixed",
            left: `${pointerPos.x}px`,
            top: `${pointerPos.y - 44}px`,
            transform: "translate(-50%, 0)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className="flex items-center gap-2 rounded-xl bg-slate-900/95 px-3.5 py-2 text-xs font-bold text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/15 text-[11px] text-white">
            <GripDotsIcon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate max-w-[160px]">{activePayload.label}</span>
          <span className="text-[10px] font-medium text-white/70">إعادة ترتيب</span>
        </div>
      )}
    </div>
  );
};

