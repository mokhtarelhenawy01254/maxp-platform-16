import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { StudioTopBar } from "./StudioTopBar";
import { StudioLeftRail } from "./StudioLeftRail";
import { StudioElementsPanel } from "./StudioElementsPanel";
import { StudioLayersDrawer } from "./StudioLayersDrawer";
import { StudioPropertyInspector } from "./StudioPropertyInspector";
import { StudioCanvasStage } from "./StudioCanvasStage";
import { StudioSortableSection } from "./StudioSortableSection";
import { StudioStatusBar } from "./StudioStatusBar";
import { StudioSectionCatalogModal } from "./StudioSectionCatalogModal";
import { StudioPagesPanel } from "./StudioPagesPanel";
import StorefrontImagePickerModal from "../../components/store/StorefrontImagePickerModal";

import type {
  StudioDeviceMode,
  StudioLeftRailTab,
  StudioLeftPanelTab,
  StudioZoomLevel,
  StudioInspectorTab,
} from "./StudioTypes";
import { PageComposer } from "../engine/PageComposer";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";
import type { StorefrontThemeInput } from "../engine/themeResolver";
import { STOREFRONT_THEME_PRESETS } from "../themes";
import { getStorefrontSectionLabel, getStorefrontSectionManifest } from "../sections/manifest";
import { useStorefrontStudioState, getSectionKey } from "./hooks/useStorefrontStudioState";

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
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState<boolean>(false);

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
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showImagePickerModal, showCatalogModal]);

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
    const counts: Record<string, number> = {
      home: 0,
      shop: 0,
      pdp: 0,
      cart: 0,
      checkout: 0,
    };
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                setInspectorTab("interactions");
                setIsInspectorOpen(true);
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
                    onAddSection={(type) => {
                      handleAddSection(type);
                      if (typeof window !== "undefined" && window.innerWidth < 1024) {
                        setIsLeftDrawerOpen(false);
                      }
                      setIsInspectorOpen(true);
                    }}
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
              <div className="relative min-h-[800px] bg-background">
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
                          onSelect={() => {
                            setSelectedSectionKey(stableKey);
                            setIsInspectorOpen(true);
                          }}
                          onMoveUp={() => handleMoveSection(index, "up")}
                          onMoveDown={() => handleMoveSection(index, "down")}
                          onDuplicate={() => handleDuplicateSection(index)}
                          onDelete={() => handleDeleteSection(stableKey)}
                        >
                          {element}
                        </StudioSortableSection>
                      );
                    }}
                  />
                </SortableContext>
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
