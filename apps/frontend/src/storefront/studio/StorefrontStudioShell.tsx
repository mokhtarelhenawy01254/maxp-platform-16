import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { StudioTopBar } from "./StudioTopBar";
import { StudioLeftRail } from "./StudioLeftRail";
import { StudioElementsPanel } from "./StudioElementsPanel";
import { StudioLayersDrawer, GripDotsIcon } from "./StudioLayersDrawer";
import { StudioPropertyInspector } from "./StudioPropertyInspector";
import { StudioCanvasStage } from "./StudioCanvasStage";
import { StudioSortableSection } from "./StudioSortableSection";
import { StudioStatusBar } from "./StudioStatusBar";
import { StudioSectionCatalogModal } from "./StudioSectionCatalogModal";
import { StudioPagesPanel } from "./StudioPagesPanel";
import StorefrontImagePickerModal from "../../components/store/StorefrontImagePickerModal";
import "./storefront-studio.css";

import {
  STUDIO_PAGES,
  type StudioDeviceMode,
  type StudioLeftRailTab,
  type StudioLeftPanelTab,
  type StudioZoomLevel,
  type StudioInspectorTab,
} from "./StudioTypes";
import { PageComposer } from "../engine/PageComposer";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";
import type { StorefrontThemeInput } from "../engine/themeResolver";
import { STOREFRONT_THEME_PRESETS } from "../themes";
import { getStorefrontSectionLabel, getStorefrontSectionManifest } from "../sections/manifest";
import { useStorefrontStudioState, getSectionKey } from "./hooks/useStorefrontStudioState";
import { getStudioSectionThumbnail } from "./StudioSectionThumbnails";

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

export const StorefrontStudioShell: React.FC<StorefrontStudioShellProps> = ({
  themeId, designTokens: externalDesignTokens, storeName = "متجري",
  hasPendingChanges, saving, previewUrl, onSave, onDiscard, onBack, onOpenPreview, onChange,
}) => {
  const [deviceMode, setDeviceMode] = useState<StudioDeviceMode>("desktop");
  const [zoomLevel, setZoomLevel] = useState<StudioZoomLevel>(1);
  const [showSpacingOverlay, setShowSpacingOverlay] = useState<boolean>(true);
  const [leftRailTab, setLeftRailTab] = useState<StudioLeftRailTab>("elements");
  const [layersPanelTab, setLayersPanelTab] = useState<StudioLeftPanelTab>("layers");
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState<boolean>(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Library Drag-and-Drop state
  const [draggingLibraryItem, setDraggingLibraryItem] = useState<{ type: string; label: string } | null>(null);
  const [libraryDropSlot, setLibraryDropSlot] = useState<number | null>(null);
  const [isPointerDraggingLibrary, setIsPointerDraggingLibrary] = useState<boolean>(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.0, Math.round((prev + 0.1) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.25, Math.round((prev - 0.1) * 10) / 10));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  const handleZoomFit = () => {
    if (typeof window === "undefined") return;
    const leftPanelWidth = isLeftDrawerOpen ? (leftRailTab === "elements" ? 280 : 288) : 0;
    const inspectorWidth = isInspectorOpen ? 320 : 0;
    const railWidth = 54;
    const availableWidth = window.innerWidth - railWidth - leftPanelWidth - inspectorWidth - 64;
    const targetWidth = deviceMode === "mobile" ? 375 : deviceMode === "tablet" ? 768 : 1200;
    if (availableWidth > 0 && targetWidth > 0) {
      const fitRatio = Math.round((availableWidth / targetWidth) * 100) / 100;
      const clampedFit = Math.max(0.25, Math.min(2.0, fitRatio));
      setZoomLevel(clampedFit);
    }
  };

  const handleOpenCatalogModal = () => {
    setShowImagePickerModal(false);
    setShowCatalogModal(true);
  };

  const handleOpenImagePickerModal = () => {
    setShowCatalogModal(false);
    setShowImagePickerModal(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showImagePickerModal) {
          setShowImagePickerModal(false);
        } else if (showCatalogModal) {
          setShowCatalogModal(false);
        }
      }

      // Studio Zoom keyboard shortcuts: Ctrl+= / Ctrl+- / Ctrl+0 (Cmd on Mac)
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && !isInput) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === "0" || e.code === "Digit0" || e.code === "Numpad0") {
          e.preventDefault();
          handleZoomReset();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showImagePickerModal, showCatalogModal, isLeftDrawerOpen, isInspectorOpen, leftRailTab, deviceMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Studio Business State Hook
  const {
    activePageKey,
    setActivePageKey,
    selectedSectionKey,
    setSelectedSectionKey,
    currentDesignTokens,
    previewTheme,
    activePageConfig,
    activeSections,
    sectionKeys,
    selectedSectionConfig,
    canUndo,
    canRedo,
    undo,
    redo,
    handleDesignTokensChange,
    handleDragEnd,
    handleMoveSection,
    handleDuplicateSection,
    handleDeleteSection,
    handleAddSection,
    handleUpdateSectionField,
    handleBatchUpdateSectionFields,
  } = useStorefrontStudioState({
    themeId,
    externalDesignTokens,
    onChange,
    onSave,
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [inspectorTab, setInspectorTab] = useState<StudioInspectorTab>("design");

  const pageSectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STUDIO_PAGES.forEach((p) => {
      counts[p.id] = 0;
    });
    if (previewTheme && previewTheme.pages) {
      Object.entries(previewTheme.pages).forEach(([key, page]: [string, any]) => {
        counts[key] = Array.isArray(page?.sections) ? page.sections.length : 0;
      });
    }
    counts[activePageKey] = activeSections.length;
    return counts;
  }, [previewTheme, activePageKey, activeSections]);

  const themeName = STOREFRONT_THEME_PRESETS[themeId]?.name || themeId;
  const selectedLabel = selectedSectionConfig
    ? getStorefrontSectionLabel(
        typeof selectedSectionConfig === "string"
          ? selectedSectionConfig
          : selectedSectionConfig.type
      )
    : "";

  const draggedSectionEntry = useMemo(() => {
    if (!activeDragId) return null;
    const foundIndex = activeSections.findIndex(
      (s: any, idx: number) => getSectionKey(s, idx) === activeDragId
    );
    if (foundIndex === -1) return null;
    const entry = activeSections[foundIndex];
    const label =
      getStorefrontSectionManifest(typeof entry === "string" ? entry : entry?.type)?.label ||
      getStorefrontSectionLabel(typeof entry === "string" ? entry : entry?.type || "section");
    const type = typeof entry === "string" ? entry : entry?.type || "section";
    return { entry, label, type, index: foundIndex };
  }, [activeDragId, activeSections]);

  const handleLibraryDragStart = useCallback((type: string, label: string) => {
    setDraggingLibraryItem({ type, label });
  }, []);

  const handleLibraryDragEnd = useCallback(() => {
    setDraggingLibraryItem(null);
    setLibraryDropSlot(null);
  }, []);

  const handleLibraryPointerDown = useCallback(
    (e: React.PointerEvent, type: string, label: string) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const x0 = e.clientX;
      const y0 = e.clientY;
      let active = false;

      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - x0;
        const dy = moveEvent.clientY - y0;
        if (!active) {
          if (Math.hypot(dx, dy) < 6) return;
          active = true;
          setIsPointerDraggingLibrary(true);
          setDraggingLibraryItem({ type, label });
        }
        setPointerPos({ x: moveEvent.clientX, y: moveEvent.clientY });

        const elements = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
        let foundSlot: number | null = null;
        for (const el of elements) {
          const sectionEl = el.closest<HTMLElement>("[data-studio-sortable-section]");
          if (sectionEl) {
            const idxStr = sectionEl.getAttribute("data-studio-section-index");
            if (idxStr !== null) {
              const idx = parseInt(idxStr, 10);
              const rect = sectionEl.getBoundingClientRect();
              const isTopHalf = moveEvent.clientY < rect.top + rect.height / 2;
              foundSlot = isTopHalf ? idx : idx + 1;
              break;
            }
          }
          if (el.closest("[data-studio-empty-dropzone]")) {
            foundSlot = 0;
            break;
          }
        }
        setLibraryDropSlot(foundSlot);
      };

      const onUp = (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);

        if (active) {
          const elements = document.elementsFromPoint(upEvent.clientX, upEvent.clientY);
          let finalSlot: number | null = null;
          for (const el of elements) {
            const sectionEl = el.closest<HTMLElement>("[data-studio-sortable-section]");
            if (sectionEl) {
              const idxStr = sectionEl.getAttribute("data-studio-section-index");
              if (idxStr !== null) {
                const idx = parseInt(idxStr, 10);
                const rect = sectionEl.getBoundingClientRect();
                const isTopHalf = upEvent.clientY < rect.top + rect.height / 2;
                finalSlot = isTopHalf ? idx : idx + 1;
                break;
              }
            }
            if (el.closest("[data-studio-empty-dropzone]")) {
              finalSlot = 0;
              break;
            }
          }
          if (typeof finalSlot === "number") {
            handleAddSection(type, finalSlot);
          }
        }
        setIsPointerDraggingLibrary(false);
        setDraggingLibraryItem(null);
        setLibraryDropSlot(null);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [handleAddSection]
  );

  const studioContent = (
    <div
      className="fixed inset-0 z-[100] flex h-screen w-full flex-col overflow-hidden bg-[#17181c] text-[#e8eaee]"
      dir="rtl"
    >
      {/* 1. Pro Studio Top Bar */}
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
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        onFitWidth={handleZoomFit}
        showSpacingOverlay={showSpacingOverlay}
        onToggleSpacingOverlay={() => setShowSpacingOverlay((prev) => !prev)}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        isLeftDrawerOpen={isLeftDrawerOpen}
        onToggleLeftDrawer={() => setIsLeftDrawerOpen((prev) => !prev)}
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

      {/* 2. Main Studio Workspace Chassis with unified DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          setActiveDragId(String(event.active.id));
        }}
        onDragEnd={(event) => {
          setActiveDragId(null);
          handleDragEnd(event);
        }}
        onDragCancel={() => {
          setActiveDragId(null);
        }}
      >
        <div className="relative flex flex-1 h-[calc(100vh-52px-30px)] w-full overflow-hidden">
          {/* Leftmost Iconic Rail */}
          <StudioLeftRail
            activeTab={leftRailTab}
            isPanelOpen={isLeftDrawerOpen}
            isAiActive={isInspectorOpen && inspectorTab === "interactions"}
            onSelectTab={(tab) => {
              if (tab === "media") {
                handleOpenImagePickerModal();
                return;
              }
              if (tab === "ai") {
                if (isInspectorOpen && inspectorTab === "interactions") {
                  setIsInspectorOpen(false);
                } else {
                  setInspectorTab("interactions");
                  setIsInspectorOpen(true);
                }
                return;
              }
              if (tab === "settings") {
                setLeftRailTab("styles");
                setLayersPanelTab("theme");
                setIsLeftDrawerOpen(true);
                return;
              }
              setLeftRailTab(tab);
              setIsLeftDrawerOpen(true);
              if (tab === "styles") setLayersPanelTab("theme");
              if (tab === "layers") setLayersPanelTab("layers");
            }}
            onToggleTab={() => setIsLeftDrawerOpen((prev) => !prev)}
          />

          {/* Left Expandable Panel (Elements / Layers / Theme / Pages) */}
          {isLeftDrawerOpen && (
            <>
              {/* Mobile Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
                onClick={() => setIsLeftDrawerOpen(false)}
              />
              <div className="fixed inset-y-0 start-0 z-50 flex shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:shadow-none h-full shrink-0">
                {leftRailTab === "elements" && (
                  <StudioElementsPanel
                    onAddSection={(type, insertAtIndex) => {
                      handleAddSection(type, insertAtIndex);
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        setIsLeftDrawerOpen(false);
                      }
                      setIsInspectorOpen(true);
                    }}
                    onLibraryDragStart={handleLibraryDragStart}
                    onLibraryDragEnd={handleLibraryDragEnd}
                    onLibraryPointerDown={handleLibraryPointerDown}
                    onOpenFullCatalog={handleOpenCatalogModal}
                    onClose={() => setIsLeftDrawerOpen(false)}
                  />
                )}

                {(leftRailTab === "layers" || leftRailTab === "styles" || leftRailTab === "code" || leftRailTab === "settings") && (
                  <div className="w-72 max-w-[85vw] h-full flex flex-col bg-[#202226] border-e border-[#0c0d0f]">
                    <StudioLayersDrawer
                      sections={activeSections}
                      sectionKeys={sectionKeys}
                      selectedSectionKey={selectedSectionKey}
                      leftPanelTab={layersPanelTab}
                      designTokens={currentDesignTokens}
                      onSelectSection={(key) => {
                        setSelectedSectionKey(key);
                        if (typeof window !== "undefined" && window.innerWidth < 1024) {
                          setIsLeftDrawerOpen(false);
                        }
                        setIsInspectorOpen(true);
                      }}
                      onMoveSection={handleMoveSection}
                      onDuplicateSection={handleDuplicateSection}
                      onDeleteSection={handleDeleteSection}
                      onOpenSectionCatalog={handleOpenCatalogModal}
                      onTabChange={(nextTab) => setLayersPanelTab(nextTab)}
                      onUpdateThemeTokens={handleDesignTokensChange}
                      onCollapse={() => setIsLeftDrawerOpen(false)}
                    />
                  </div>
                )}

                {leftRailTab === "pages" && (
                  <StudioPagesPanel
                    activePageKey={activePageKey}
                    onSelectPage={(pageKey) => {
                      setActivePageKey(pageKey);
                      setSelectedSectionKey("");
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        setIsLeftDrawerOpen(false);
                      }
                    }}
                    onClose={() => setIsLeftDrawerOpen(false)}
                    pageSectionCounts={pageSectionCounts}
                  />
                )}
              </div>
            </>
          )}

          {/* Center Live Stage */}
          <StudioCanvasStage deviceMode={deviceMode} zoomLevel={zoomLevel}>
            <StorefrontThemeProvider initialTheme={previewTheme as unknown as StorefrontThemeInput}>
              <div
                className="relative min-h-[800px] bg-background"
                onDragOver={(e) => {
                  const types = Array.from(e.dataTransfer.types || []);
                  if (
                    types.includes("application/x-storefront-section") ||
                    types.includes("text/plain")
                  ) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                    if (activeSections.length === 0) {
                      setLibraryDropSlot(0);
                    }
                  }
                }}
                onDrop={(e) => {
                  const types = Array.from(e.dataTransfer.types || []);
                  if (
                    types.includes("application/x-storefront-section") ||
                    types.includes("text/plain")
                  ) {
                    e.preventDefault();
                    const secType =
                      e.dataTransfer.getData("application/x-storefront-section") ||
                      e.dataTransfer.getData("text/plain") ||
                      draggingLibraryItem?.type;
                    if (secType) {
                      handleAddSection(
                        secType,
                        typeof libraryDropSlot === "number" ? libraryDropSlot : activeSections.length
                      );
                    }
                    setLibraryDropSlot(null);
                    setDraggingLibraryItem(null);
                  }
                }}
              >
                <SortableContext items={sectionKeys} strategy={verticalListSortingStrategy}>
                  <PageComposer
                    pageConfig={activePageConfig}
                    layout={activePageConfig.layoutHint || "stack"}
                    renderSectionFrame={({ element, index, sectionEntry, sectionId, componentKey }) => {
                      const stableKey = getSectionKey(sectionEntry, index);
                      const isSelected = stableKey === selectedSectionKey;
                      const sectionLabel =
                        getStorefrontSectionManifest(
                          typeof sectionEntry === "string" ? sectionEntry : sectionEntry?.type
                        )?.label ||
                        getStorefrontSectionManifest(componentKey)?.label ||
                        getStorefrontSectionLabel(sectionId);
                      const sectionType =
                        typeof sectionEntry === "string"
                          ? sectionEntry
                          : sectionEntry?.type || "section";

                      const sectionSettings =
                        typeof sectionEntry === "object" && sectionEntry !== null
                          ? (sectionEntry.settings || sectionEntry)
                          : undefined;

                      return (
                        <StudioSortableSection
                          key={stableKey}
                          id={stableKey}
                          index={index}
                          sectionKey={stableKey}
                          sectionLabel={sectionLabel}
                          sectionType={sectionType}
                          selected={isSelected}
                          totalSections={activeSections.length}
                          deviceMode={deviceMode}
                          showSpacingOverlay={showSpacingOverlay}
                          settings={sectionSettings}
                          libraryDropSlot={libraryDropSlot}
                          onSelect={() => {
                            setSelectedSectionKey(stableKey);
                            setIsInspectorOpen(true);
                          }}
                          onMoveUp={() => handleMoveSection(index, "up")}
                          onMoveDown={() => handleMoveSection(index, "down")}
                          onDuplicate={() => handleDuplicateSection(index)}
                          onDelete={() => handleDeleteSection(stableKey)}
                          onLibraryDragOver={(slot) => setLibraryDropSlot(slot)}
                          onLibraryDrop={(secType, slot) => {
                            handleAddSection(secType, slot);
                            setLibraryDropSlot(null);
                            setDraggingLibraryItem(null);
                          }}
                        >
                          {element}
                        </StudioSortableSection>
                      );
                    }}
                  />
                </SortableContext>

                {/* Empty page drop target zone */}
                {activeSections.length === 0 && (
                  <div
                    data-studio-empty-dropzone="true"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setLibraryDropSlot(0);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const secType =
                        e.dataTransfer.getData("application/x-storefront-section") ||
                        e.dataTransfer.getData("text/plain") ||
                        draggingLibraryItem?.type;
                      if (secType) {
                        handleAddSection(secType, 0);
                      }
                      setLibraryDropSlot(null);
                      setDraggingLibraryItem(null);
                    }}
                    className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#2b6cf6]/50 bg-[#2b6cf6]/5 p-8 text-center m-6 select-none"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2b6cf6]/20 text-[#2b6cf6] mb-3">
                      <span className="text-xl">✦</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">
                      صفحة فارغة
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 max-w-xs leading-relaxed">
                      اسحب أي عنصر أو قسم من القائمة الجانبية وأفلته هنا للبدء
                    </p>
                    <div className="flex items-center gap-2 rounded-full bg-[#2b6cf6] px-4 py-1.5 text-xs font-bold text-white shadow-md">
                      أفلت هنا لإضافة أول قسم
                    </div>
                  </div>
                )}
              </div>
            </StorefrontThemeProvider>
          </StudioCanvasStage>

          {/* Right Inspector Panel - Slide-over on mobile, inline on desktop */}
          {isInspectorOpen && (
            <>
              {/* Mobile Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
                onClick={() => setIsInspectorOpen(false)}
              />
              <div className="fixed inset-y-0 end-0 z-50 flex shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:shadow-none h-full w-80 max-w-[85vw] lg:w-[320px] shrink-0 border-s border-[#0c0d0f] transition-all bg-white">
                <StudioPropertyInspector
                  selectedSectionKey={selectedSectionKey}
                  sectionConfig={selectedSectionConfig}
                  deviceMode={deviceMode}
                  initialTab={inspectorTab}
                  onClose={() => setIsInspectorOpen(false)}
                  onUpdateField={handleUpdateSectionField}
                  onBatchUpdateFields={handleBatchUpdateSectionFields}
                  onOpenImagePicker={handleOpenImagePickerModal}
                  onSwitchDevice={setDeviceMode}
                />
              </div>
            </>
          )}
        </div>

        {/* DragOverlay ghost preview for fluid WYSIWYG reordering feedback */}
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeDragId && draggedSectionEntry ? (
            <div
              className="studio-drag-ghost pointer-events-none select-none rounded-xl border-2 border-[#2b6cf6] bg-white p-4 shadow-[0_25px_50px_rgba(0,0,0,0.3)] ring-1 ring-black/5 opacity-95 transition-shadow"
              style={{
                width: deviceMode === "mobile" ? "375px" : deviceMode === "tablet" ? "768px" : "1100px",
                maxWidth: "92vw",
                borderColor: "#2b6cf6",
                boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
              }}
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2b6cf6]/10 text-[#2b6cf6]">
                    <GripDotsIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {draggedSectionEntry.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({draggedSectionEntry.type})
                  </span>
                </div>
                <span className="rounded-full bg-[#2b6cf6] px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                  جاري النقل...
                </span>
              </div>
              <div className="mt-2.5 flex h-12 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 text-xs text-slate-400">
                اسحب إلى الموضع المطلوب ثم أفلت للتثبيت
              </div>
            </div>
          ) : null}
        </DragOverlay>

        {/* Floating preview during pointer drag from library */}
        {draggingLibraryItem && isPointerDraggingLibrary && (
          <div
            style={{
              position: "fixed",
              left: pointerPos.x + 16,
              top: pointerPos.y + 16,
              zIndex: 99999,
              pointerEvents: "none",
            }}
            className="flex items-center gap-2.5 rounded-xl border-2 border-[#2b6cf6] bg-[#1a1c22]/95 p-2 shadow-2xl backdrop-blur-md text-white select-none ring-1 ring-black/30"
            dir="rtl"
          >
            <div className="w-12 h-8 rounded-md overflow-hidden border border-slate-700 bg-black shrink-0">
              <img
                src={getStudioSectionThumbnail(draggingLibraryItem.type)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col pe-2">
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {draggingLibraryItem.label}
              </span>
              <span className="text-[9.5px] text-[#60a5fa] font-medium">
                {typeof libraryDropSlot === "number"
                  ? `الموضع ${libraryDropSlot + 1}`
                  : "اسحب للكانفس"}
              </span>
            </div>
          </div>
        )}
      </DndContext>

      {/* 3. Pro Studio Status Bar */}
      <StudioStatusBar
        pageLabel={activePageKey === "home" ? "الرئيسية" : activePageKey}
        selectedSectionLabel={selectedLabel}
        selectedSectionType={
          selectedSectionConfig
            ? typeof selectedSectionConfig === "string"
              ? selectedSectionConfig
              : selectedSectionConfig.type
            : undefined
        }
        deviceMode={deviceMode}
      />

      {/* Modals */}
      <StudioSectionCatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        onAddSection={handleAddSection}
      />

      <StorefrontImagePickerModal
        isOpen={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onSelectImage={(url) => {
          handleUpdateSectionField("image", url);
          handleUpdateSectionField("backgroundImage", url);
          setShowImagePickerModal(false);
        }}
        selectedUrl={
          selectedSectionConfig?.image || selectedSectionConfig?.backgroundImage || ""
        }
      />
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(studioContent, document.body)
    : studioContent;
};
