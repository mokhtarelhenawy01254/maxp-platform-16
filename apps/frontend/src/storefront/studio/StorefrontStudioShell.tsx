import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
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
import StorefrontImagePickerModal from "../../components/store/StorefrontImagePickerModal";

import type { StudioDeviceMode, StudioLeftRailTab, StudioZoomLevel } from "./StudioTypes";
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
}) => {
  const [deviceMode, setDeviceMode] = useState<StudioDeviceMode>("desktop");
  const [zoomLevel, setZoomLevel] = useState<StudioZoomLevel>(1);
  const [showSpacingOverlay, setShowSpacingOverlay] = useState<boolean>(true);
  const [leftRailTab, setLeftRailTab] = useState<StudioLeftRailTab>("elements");
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState<boolean>(false);

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

  const themeName = STOREFRONT_THEME_PRESETS[themeId]?.name || themeId;
  const selectedLabel = selectedSectionConfig
    ? getStorefrontSectionLabel(
        typeof selectedSectionConfig === "string"
          ? selectedSectionConfig
          : selectedSectionConfig.type
      )
    : "";

  return (
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

      {/* 2. Main Studio Workspace Chassis */}
      <div className="relative flex flex-1 h-[calc(100vh-52px-30px)] w-full overflow-hidden">
        {/* Leftmost Iconic Rail */}
        <StudioLeftRail
          activeTab={leftRailTab}
          isPanelOpen={isLeftDrawerOpen}
          onSelectTab={(tab) => {
            setLeftRailTab(tab);
            setIsLeftDrawerOpen(true);
            if (tab === "media") setShowImagePickerModal(true);
            if (tab === "ai") setIsInspectorOpen(true);
          }}
          onToggleTab={() => setIsLeftDrawerOpen((prev) => !prev)}
        />

        {/* Left Expandable Panel (Elements / Layers) */}
        {isLeftDrawerOpen && (
          <div className="h-full shrink-0 flex">
            {leftRailTab === "elements" && (
              <StudioElementsPanel
                onAddSection={(type) => {
                  handleAddSection(type);
                  setIsInspectorOpen(true);
                }}
                onOpenFullCatalog={() => setShowCatalogModal(true)}
                onClose={() => setIsLeftDrawerOpen(false)}
              />
            )}

            {leftRailTab === "layers" && (
              <div className="w-72 h-full flex flex-col bg-[#202226] border-e border-[#0c0d0f]">
                <StudioLayersDrawer
                  sections={activeSections}
                  selectedSectionKey={selectedSectionKey}
                  leftPanelTab="layers"
                  designTokens={currentDesignTokens}
                  onSelectSection={(key) => {
                    setSelectedSectionKey(key);
                    setIsInspectorOpen(true);
                  }}
                  onMoveSection={handleMoveSection}
                  onDuplicateSection={handleDuplicateSection}
                  onDeleteSection={handleDeleteSection}
                  onOpenSectionCatalog={() => setShowCatalogModal(true)}
                  onTabChange={() => {}}
                  onUpdateThemeTokens={handleDesignTokensChange}
                  onCollapse={() => setIsLeftDrawerOpen(false)}
                />
              </div>
            )}
          </div>
        )}

        {/* Center Live Stage with @dnd-kit Context */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                          showSpacingOverlay={showSpacingOverlay}
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
        </DndContext>

        {/* Right Inspector Panel */}
        {isInspectorOpen && (
          <div className="h-full w-80 lg:w-[320px] shrink-0 border-s border-[#0c0d0f] transition-all">
            <StudioPropertyInspector
              selectedSectionKey={selectedSectionKey}
              sectionConfig={selectedSectionConfig}
              onClose={() => setIsInspectorOpen(false)}
              onUpdateField={handleUpdateSectionField}
              onOpenImagePicker={() => setShowImagePickerModal(true)}
              onSwitchDevice={setDeviceMode}
            />
          </div>
        )}
      </div>

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
};
