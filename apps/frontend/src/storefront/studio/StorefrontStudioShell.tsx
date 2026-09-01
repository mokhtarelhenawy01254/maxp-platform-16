import React, { useState, useMemo, useEffect } from "react";
import {
  AdjustmentsHorizontalIcon,
  EyeIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { StudioTopBar } from "./StudioTopBar";
import { StudioLayersDrawer } from "./StudioLayersDrawer";
import { StudioPropertyInspector } from "./StudioPropertyInspector";
import { StudioCanvasStage } from "./StudioCanvasStage";
import { StudioSectionCatalogModal } from "./StudioSectionCatalogModal";
import type { StudioDeviceMode, StudioLeftPanelTab } from "./StudioTypes";
import { PageComposer } from "../engine/PageComposer";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";
import { resolveStorefrontTheme, type StorefrontThemeInput } from "../engine/themeResolver";
import { STOREFRONT_THEME_PRESETS } from "../themes";
import { getStorefrontSectionLabel, getStorefrontSectionManifest } from "../sections/manifest";
import StorefrontImagePickerModal from "../../components/store/StorefrontImagePickerModal";

interface StorefrontStudioShellProps {
  themeId: string;
  designTokens: Record<string, unknown>;
  storeName?: string;
  hasPendingChanges: boolean;
  saving: boolean;
  previewUrl?: string;
  onSave: () => void;
  onBack: () => void;
  onOpenPreview: () => void;
  onChange: (nextTokens: Record<string, unknown>) => void;
}

const getSectionKey = (section: any, index: number): string => {
  if (typeof section === "string") return `${section}-${index}`;
  return section?.key || `${section?.type || "section"}-${index}`;
};

export const StorefrontStudioShell: React.FC<StorefrontStudioShellProps> = ({
  themeId,
  designTokens,
  storeName = "متجري",
  hasPendingChanges,
  saving,
  previewUrl,
  onSave,
  onBack,
  onOpenPreview,
  onChange,
}) => {
  const [activePageKey, setActivePageKey] = useState<string>("home");
  const [deviceMode, setDeviceMode] = useState<StudioDeviceMode>("desktop");
  const [leftPanelTab, setLeftPanelTab] = useState<StudioLeftPanelTab>("layers");
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>("");
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState<boolean>(false);
  const [mobileStudioTab, setMobileStudioTab] = useState<"canvas" | "layers" | "inspector">("canvas");

  // Keyboard Shortcuts (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  const previewTheme = useMemo(() => {
    const baseTheme = STOREFRONT_THEME_PRESETS[themeId] || STOREFRONT_THEME_PRESETS["modern-minimal"];
    return resolveStorefrontTheme({
      themeId,
      theme: baseTheme,
      designTokens,
    });
  }, [themeId, designTokens]);

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

  const selectedSectionConfig = useMemo(() => {
    if (!selectedSectionKey) return null;
    return activeSections.find((s: any, idx: number) => {
      const key = getSectionKey(s, idx);
      return key === selectedSectionKey;
    }) || null;
  }, [activeSections, selectedSectionKey]);

  // Section Manipulation Handlers
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const nextSections = [...activeSections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nextSections.length) return;

    const [moved] = nextSections.splice(index, 1);
    nextSections.splice(targetIndex, 0, moved);

    const nextPages = {
      ...(designTokens?.pages as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    onChange({
      ...designTokens,
      pages: nextPages,
    });
  };

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
      ...(designTokens?.pages as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    onChange({
      ...designTokens,
      pages: nextPages,
    });
  };

  const handleDeleteSection = (keyToDelete: string) => {
    const nextSections = activeSections.filter((s: any, idx: number) => {
      const key = getSectionKey(s, idx);
      return key !== keyToDelete;
    });

    if (selectedSectionKey === keyToDelete) {
      setSelectedSectionKey("");
    }

    const nextPages = {
      ...(designTokens?.pages as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    onChange({
      ...designTokens,
      pages: nextPages,
    });
  };

  const handleAddSection = (sectionType: string) => {
    const nextSections = [
      ...activeSections,
      {
        type: sectionType,
        key: `${sectionType}-${Date.now()}`,
      },
    ];

    const nextPages = {
      ...(designTokens?.pages as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    onChange({
      ...designTokens,
      pages: nextPages,
    });
  };

  const handleUpdateSectionField = (field: string, value: any) => {
    if (!selectedSectionKey) return;

    const nextSections = activeSections.map((s: any, idx: number) => {
      const key = getSectionKey(s, idx);
      if (key !== selectedSectionKey) return s;

      const base = typeof s === "string" ? { type: s } : { ...s };
      return {
        ...base,
        [field]: value,
      };
    });

    const nextPages = {
      ...(designTokens?.pages as Record<string, unknown> || {}),
      [activePageKey]: {
        ...activePageConfig,
        sections: nextSections,
      },
    };

    onChange({
      ...designTokens,
      pages: nextPages,
    });
  };

  const themeName = STOREFRONT_THEME_PRESETS[themeId]?.name || themeId;

  return (
    <div className="fixed inset-0 z-[100] flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground" dir="rtl">
      {/* 1. Studio Top Bar */}
      <StudioTopBar
        storeName={storeName}
        themeName={themeName}
        activePageKey={activePageKey}
        deviceMode={deviceMode}
        hasPendingChanges={hasPendingChanges}
        canUndo={false}
        canRedo={false}
        saving={saving}
        previewUrl={previewUrl}
        onBack={onBack}
        onPageChange={setActivePageKey}
        onDeviceChange={setDeviceMode}
        onUndo={() => {}}
        onRedo={() => {}}
        onSave={onSave}
        onOpenPreview={onOpenPreview}
      />

      {/* 2. Studio 3-Dock Workspace */}
      <div className="relative flex flex-1 h-[calc(100vh-4rem)] w-full overflow-hidden">
        {/* Left Studio Dock (Layers / Catalog) */}
        <div
          className={`h-full shrink-0 border-e border-border/80 bg-card flex flex-col ${
            mobileStudioTab === "layers" ? "w-full" : "hidden"
          } lg:flex lg:w-80`}
        >
          <StudioLayersDrawer
            sections={activeSections}
            selectedSectionKey={selectedSectionKey}
            leftPanelTab={leftPanelTab}
            onSelectSection={(key) => {
              setSelectedSectionKey(key);
              setMobileStudioTab("inspector");
            }}
            onMoveSection={handleMoveSection}
            onDuplicateSection={handleDuplicateSection}
            onDeleteSection={handleDeleteSection}
            onOpenSectionCatalog={() => setShowCatalogModal(true)}
            onTabChange={setLeftPanelTab}
          />
        </div>

        {/* Center Studio Stage (Interactive Live Canvas) */}
        <div
          className={`h-full flex-1 overflow-hidden bg-muted/20 flex flex-col ${
            mobileStudioTab === "canvas" ? "w-full" : "hidden"
          } lg:flex`}
        >
          <StudioCanvasStage deviceMode={deviceMode}>
            <StorefrontThemeProvider initialTheme={previewTheme as unknown as StorefrontThemeInput}>
              <div className="min-h-screen bg-background">
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

                    return (
                      <div
                        key={`${stableSectionKey}-${index}`}
                        className="group relative cursor-pointer"
                        onClick={() => {
                          setSelectedSectionKey(stableSectionKey);
                          setMobileStudioTab("inspector");
                        }}
                      >
                        <div
                          className={`pointer-events-none absolute inset-0 z-30 rounded-2xl border-2 transition-all ${
                            selected
                              ? "border-primary bg-primary/[0.04] shadow-[0_0_0_3px_rgba(59,130,246,0.25)]"
                              : "border-transparent group-hover:border-primary/40 group-hover:bg-primary/[0.015]"
                          }`}
                        >
                          {selected ? (
                            <span className="absolute top-2 start-2 rounded-md bg-primary px-2.5 py-1 text-[10px] font-black text-primary-foreground shadow">
                              {sectionLabel} (محدد للتعديل)
                            </span>
                          ) : null}
                        </div>

                        <div className="relative z-10 select-none [&_a]:pointer-events-none [&_button]:pointer-events-none [&_input]:pointer-events-none [&_select]:pointer-events-none">
                          {element}
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </StorefrontThemeProvider>
          </StudioCanvasStage>
        </div>

        {/* Right Studio Dock (Property Inspector) */}
        <div
          className={`h-full shrink-0 border-s border-border/80 bg-card flex flex-col ${
            mobileStudioTab === "inspector" ? "w-full" : "hidden"
          } lg:flex lg:w-96`}
        >
          <StudioPropertyInspector
            selectedSectionKey={selectedSectionKey}
            sectionConfig={selectedSectionConfig}
            onClose={() => setSelectedSectionKey("")}
            onUpdateField={handleUpdateSectionField}
            onOpenImagePicker={() => setShowImagePickerModal(true)}
          />
        </div>
      </div>

      {/* 3. Mobile Bottom Studio Dock (Hidden on Desktops / Large Tablets) */}
      <div className="sticky bottom-0 z-40 flex h-14 w-full items-center justify-around border-t border-border/80 bg-background/95 p-1 backdrop-blur-md lg:hidden">
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
          onClick={() => setMobileStudioTab("inspector")}
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
    </div>
  );
};
