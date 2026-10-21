import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { StudioCreatePageModal } from "./StudioCreatePageModal";
import { createTemplateSections } from "./utils/studioPageTemplates";
import { STUDIO_PAGE_PRESETS } from "./StudioPagePresets";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { useAuth } from "../../hooks/useAuthSimple";
import type { StudioPageDefinition } from "./StudioTypes";
import StorefrontImagePickerModal from "../../components/store/StorefrontImagePickerModal";
import { toast } from "sonner";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import "./storefront-studio.css";

import {
  STUDIO_PAGES,
  type StudioDeviceMode,
  type StudioLeftRailTab,
  type StudioLeftPanelTab,
  type StudioZoomLevel,
  type StudioInspectorTab,
  type StudioSelectedElement,
} from "./StudioTypes";
import { PageComposer } from "../engine/PageComposer";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";
import { resolvePageStyleVars } from "../engine/themeResolverCore";
import type { StorefrontThemeInput } from "../engine/themeResolver";
import { STOREFRONT_THEME_PRESETS } from "../themes";
import { getStorefrontSectionLabel, getStorefrontSectionManifest } from "../sections/manifest";
import { useStorefrontStudioState, getSectionKey } from "./hooks/useStorefrontStudioState";
import { getStudioSectionThumbnail } from "./StudioSectionThumbnails";

export interface StudioContextMenuState {
  x: number;
  y: number;
  sectionKey: string;
  index: number;
  parentKey?: string;
  totalSections: number;
  isHidden: boolean;
  isLocked: boolean;
  label: string;
}

export interface StudioContextMenuProps {
  state: StudioContextMenuState;
  hasClipboard: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPasteAfter: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

export const StudioContextMenu: React.FC<StudioContextMenuProps> = ({
  state,
  hasClipboard,
  onClose,
  onDuplicate,
  onCopy,
  onPasteAfter,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onToggleLock,
  onDelete,
}) => {
  const { x, y, index, totalSections, isHidden, isLocked, label } = state;

  const menuWidth = 210;
  const menuHeight = 310;
  const clampedX =
    typeof window !== "undefined"
      ? Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8))
      : x;
  const clampedY =
    typeof window !== "undefined"
      ? Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8))
      : y;

  return (
    <>
      {/* Invisible backdrop to dismiss on outside click */}
      <div
        data-studio-context-backdrop="true"
        className="fixed inset-0 z-[999] bg-transparent"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Context Menu Popup */}
      <div
        data-testid="studio-context-menu"
        data-studio-context-menu="true"
        dir="rtl"
        style={{ top: clampedY, left: clampedX }}
        className="fixed z-[1000] w-[210px] rounded-xl border border-[#33363c] bg-[#1a1c22]/98 p-1.5 text-[#e8eaee] shadow-2xl backdrop-blur-md select-none ring-1 ring-black/40 text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with section name */}
        <div className="px-2.5 py-1.5 mb-1 border-b border-[#2d3139] flex items-center justify-between text-[11px] font-bold text-[#9ba0a8]">
          <span className="truncate max-w-[140px] text-white">{label}</span>
          <span className="text-[10px] font-mono text-[#60a5fa]">#{index + 1}</span>
        </div>

        {/* 1. تكرار */}
        <button
          type="button"
          data-studio-context-menu-item="duplicate"
          onClick={() => {
            onDuplicate();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-right hover:bg-[#2b303a] hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <DocumentDuplicateIcon className="h-4 w-4 text-[#8fa4c8]" />
            <span>تكرار</span>
          </div>
        </button>

        {/* 2. نسخ */}
        <button
          type="button"
          data-studio-context-menu-item="copy"
          onClick={() => {
            onCopy();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-right hover:bg-[#2b303a] hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ClipboardDocumentIcon className="h-4 w-4 text-[#8fa4c8]" />
            <span>نسخ</span>
          </div>
          <kbd className="rounded bg-[#282b33] px-1.5 py-0.5 text-[9px] font-mono text-[#8a8f96]">Ctrl+C</kbd>
        </button>

        {/* 3. لصق بعد */}
        <button
          type="button"
          data-studio-context-menu-item="paste"
          disabled={!hasClipboard}
          onClick={() => {
            if (!hasClipboard) return;
            onPasteAfter();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-right hover:bg-[#2b303a] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-4 w-4 text-[#8fa4c8]" />
            <span>لصق بعد</span>
          </div>
          <kbd className="rounded bg-[#282b33] px-1.5 py-0.5 text-[9px] font-mono text-[#8a8f96]">Ctrl+V</kbd>
        </button>

        <div className="my-1 border-t border-[#2d3139]" />

        {/* 4. تحريك لأعلى */}
        <button
          type="button"
          data-studio-context-menu-item="move-up"
          disabled={index === 0 || isLocked}
          onClick={() => {
            onMoveUp();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-right hover:bg-[#2b303a] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <ChevronUpIcon className="h-4 w-4 text-[#8fa4c8]" />
            <span>تحريك لأعلى</span>
          </div>
        </button>

        {/* 5. تحريك لأسفل */}
        <button
          type="button"
          data-studio-context-menu-item="move-down"
          disabled={index === totalSections - 1 || isLocked}
          onClick={() => {
            onMoveDown();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-right hover:bg-[#2b303a] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <ChevronDownIcon className="h-4 w-4 text-[#8fa4c8]" />
            <span>تحريك لأسفل</span>
          </div>
        </button>

        <div className="my-1 border-t border-[#2d3139]" />

        {/* 6. إخفاء / إظهار */}
        <button
          type="button"
          data-studio-context-menu-item="toggle-visibility"
          onClick={() => {
            onToggleVisibility();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-right hover:bg-[#2b303a] hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {isHidden ? (
              <EyeIcon className="h-4 w-4 text-emerald-400" />
            ) : (
              <EyeSlashIcon className="h-4 w-4 text-amber-400" />
            )}
            <span>{isHidden ? "إظهار في المتجر" : "إخفاء من المتجر"}</span>
          </div>
        </button>

        {/* 7. قفل / فك قفل */}
        <button
          type="button"
          data-studio-context-menu-item="toggle-lock"
          onClick={() => {
            onToggleLock();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-right hover:bg-[#2b303a] hover:text-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {isLocked ? (
              <LockOpenIcon className="h-4 w-4 text-emerald-400" />
            ) : (
              <LockClosedIcon className="h-4 w-4 text-amber-400" />
            )}
            <span>{isLocked ? "فك قفل القسم" : "قفل القسم"}</span>
          </div>
        </button>

        <div className="my-1 border-t border-[#2d3139]" />

        {/* 8. حذف */}
        <button
          type="button"
          data-studio-context-menu-item="delete"
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-right text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <TrashIcon className="h-4 w-4 text-red-400" />
            <span>حذف القسم</span>
          </div>
        </button>
      </div>
    </>
  );
};

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
  companyId: propCompanyId,
}) => {
  const { user } = useAuth();
  const companyId = propCompanyId || user?.companyId || "";
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
  const [selectedElement, setSelectedElement] = useState<StudioSelectedElement | null>(null);
  const [showCreatePageModal, setShowCreatePageModal] = useState<boolean>(false);
  const [dbCustomPages, setDbCustomPages] = useState<
    Array<{ id: string; slug: string; title: string; pageType: string }>
  >([]);
  const [contextMenu, setContextMenu] = useState<StudioContextMenuState | null>(null);
  const [clipboardSection, setClipboardSection] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCustomPages = async () => {
      try {
        const res = await fetch(`${getApiUrl()}/store-pages/list?includeInactive=true`, {
          method: "POST",
          headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ companyId }),
        });
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.data)) {
          setDbCustomPages(data.data);
        }
      } catch {
        // Silently handle
      }
    };
    if (companyId) {
      fetchCustomPages();
    }
    return () => {
      isMounted = false;
    };
  }, [companyId]);

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
    handleRenameSection,
    handleToggleSectionVisibility,
    handleToggleSectionLock,
    handleUpdateSectionField,
    handleBatchUpdateSectionFields,
    handleResetDeviceOverrides,
    activePageStyle,
    handleApplyPageStylePreset,
    handleUpdatePageStyle,
    handleResetPageStyle,
  } = useStorefrontStudioState({
    themeId,
    externalDesignTokens,
    onChange,
    onSave,
  });

  // Section Copy Handler (In-memory deep clone)
  const handleCopySection = useCallback(
    (targetKey?: string) => {
      const keyToCopy = targetKey || selectedSectionKey;
      if (!keyToCopy) return;

      const findRecursive = (items: any[]): any | null => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const k = getSectionKey(item, i);
          if (k === keyToCopy) return item;
          if (item && Array.isArray(item.children)) {
            const inChild = findRecursive(item.children);
            if (inChild) return inChild;
          }
        }
        return null;
      };

      const found = findRecursive(activeSections);
      if (!found) return;

      const cloned = JSON.parse(JSON.stringify(found));
      setClipboardSection(cloned);
      toast.success("تم نسخ القسم");
    },
    [activeSections, selectedSectionKey]
  );

  // Section Paste Handler (Paste After target/active section)
  const handlePasteSection = useCallback(
    (targetKey?: string, atIndex?: number) => {
      if (!clipboardSection) {
        toast.info("لا يوجد قسم في الحافظة للصقه");
        return;
      }

      const cloned = JSON.parse(JSON.stringify(clipboardSection));
      const timestamp = Date.now();
      const rand = Math.floor(Math.random() * 1000);
      cloned.key = `${cloned.type || "section"}-${timestamp}-${rand}`;

      if (cloned.children && Array.isArray(cloned.children)) {
        const regenKeys = (children: any[], prefix = "") => {
          children.forEach((c: any, i: number) => {
            c.key = `${c.type || "section"}-${timestamp}-${prefix}${i}`;
            if (c.children && Array.isArray(c.children)) {
              regenKeys(c.children, `${prefix}${i}-`);
            }
          });
        };
        regenKeys(cloned.children, "child-");
      }

      let insertIndex = activeSections.length;
      if (typeof atIndex === "number" && atIndex >= 0 && atIndex <= activeSections.length) {
        insertIndex = atIndex + 1;
      } else {
        const keyToTarget = targetKey || selectedSectionKey;
        if (keyToTarget) {
          const foundIdx = activeSections.findIndex(
            (s: any, idx: number) => getSectionKey(s, idx) === keyToTarget
          );
          if (foundIdx !== -1) {
            insertIndex = foundIdx + 1;
          }
        }
      }

      const nextSections = [...activeSections];
      nextSections.splice(insertIndex, 0, cloned);

      const nextPages = {
        ...((currentDesignTokens?.pages as Record<string, unknown>) || {}),
        ...((currentDesignTokens?.pageOverrides as Record<string, unknown>) || {}),
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

      setSelectedSectionKey(cloned.key);
      toast.success("تم لصق القسم");
    },
    [
      clipboardSection,
      activeSections,
      currentDesignTokens,
      activePageKey,
      activePageConfig,
      handleDesignTokensChange,
      selectedSectionKey,
      setSelectedSectionKey,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextMenu) {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu(null);
          return;
        }
        if (showImagePickerModal) {
          setShowImagePickerModal(false);
        } else if (showCatalogModal) {
          setShowCatalogModal(false);
        } else if (showSpacingOverlay) {
          setShowSpacingOverlay(false);
          toast.info("تم إخفاء أداة المسافات");
        }
      }

      // Input check: prevent hijacking shortcuts when user is in input/textarea/select/contenteditable
      const target = e.target as HTMLElement | null;
      const isInput = Boolean(
        target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable ||
            (typeof target.closest === "function" &&
              Boolean(target.closest("input, textarea, select, [contenteditable='true']"))))
      );

      if (!isInput && (e.ctrlKey || e.metaKey)) {
        if (e.key === "c" || e.key === "C") {
          if (selectedSectionKey) {
            e.preventDefault();
            handleCopySection(selectedSectionKey);
          }
        } else if (e.key === "v" || e.key === "V") {
          if (clipboardSection) {
            e.preventDefault();
            handlePasteSection(selectedSectionKey);
          }
        } else if (e.key === "=" || e.key === "+") {
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
  }, [
    contextMenu,
    selectedSectionKey,
    clipboardSection,
    handleCopySection,
    handlePasteSection,
    showImagePickerModal,
    showCatalogModal,
    showSpacingOverlay,
    isLeftDrawerOpen,
    isInspectorOpen,
    leftRailTab,
    deviceMode,
  ]);

  // Two-way Selection Sync: smoothly scroll canvas into view when section is selected
  useEffect(() => {
    if (!selectedSectionKey) return;
    const sectionEl = document.querySelector(
      `[data-studio-sortable-section="true"][data-section-key="${selectedSectionKey}"]`
    );
    if (sectionEl && typeof sectionEl.scrollIntoView === "function") {
      sectionEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedSectionKey]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [inspectorTab, setInspectorTab] = useState<StudioInspectorTab>("design");

  const standardPageIdSet = useMemo(() => new Set(STUDIO_PAGES.map((p) => p.id)), []);

  const customPages: StudioPageDefinition[] = useMemo(() => {
    const pagesMap = new Map<string, StudioPageDefinition>();

    // 1. From DB
    dbCustomPages.forEach((p) => {
      if (!standardPageIdSet.has(p.slug)) {
        pagesMap.set(p.slug, {
          id: p.slug,
          label: p.title || p.slug,
          icon: "📄",
          description: `/${p.slug}`,
        });
      }
    });

    // 2. From designTokens.pages & pageOverrides
    const fromTokensPages = (currentDesignTokens?.pages as Record<string, any>) || {};
    const fromTokenOverrides = (currentDesignTokens?.pageOverrides as Record<string, any>) || {};
    const allTokenPageKeys = new Set([
      ...Object.keys(fromTokensPages),
      ...Object.keys(fromTokenOverrides),
    ]);

    allTokenPageKeys.forEach((key) => {
      if (!standardPageIdSet.has(key)) {
        const pageData = fromTokensPages[key] || fromTokenOverrides[key] || {};
        const existing = pagesMap.get(key);
        pagesMap.set(key, {
          id: key,
          label: pageData.title || pageData.label || existing?.label || key,
          icon: "📄",
          description: existing?.description || `/${key}`,
        });
      }
    });

    return Array.from(pagesMap.values());
  }, [dbCustomPages, currentDesignTokens, standardPageIdSet]);

  const existingSlugs = useMemo(() => {
    const set = new Set<string>();
    STUDIO_PAGES.forEach((p) => set.add(p.id.toLowerCase()));
    customPages.forEach((p) => set.add(p.id.toLowerCase()));
    dbCustomPages.forEach((p) => set.add(p.slug.toLowerCase()));
    return Array.from(set);
  }, [customPages, dbCustomPages]);

  const handleCreateCustomPage = useCallback(
    async (pageData: {
      title: string;
      slug: string;
      template: string;
      showInMenu: boolean;
    }) => {
      const { title, slug, template, showInMenu } = pageData;
      const cleanSlug = slug.trim().toLowerCase();

      const pageTypeMap: Record<string, string> = {
        about: "ABOUT_US",
        contact: "CONTACT_US",
        faq: "FAQ",
        article: "CUSTOM",
      };
      const pageType = pageTypeMap[template] || "CUSTOM";

      // Call DB API
      try {
        const res = await fetch(`${getApiUrl()}/store-pages/`, {
          method: "POST",
          headers: tokenManager.createAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            companyId,
            title,
            slug: cleanSlug,
            content: `<p>${title}</p>`,
            pageType,
            isActive: true,
            showInFooter: true,
            showInMenu,
            order: 0,
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setDbCustomPages((prev) => [
            ...prev.filter((p) => p.slug !== cleanSlug),
            { id: data.data.id || cleanSlug, slug: cleanSlug, title, pageType },
          ]);
        }
      } catch (err) {
        console.warn("DB page creation warning (proceeding to designTokens):", err);
      }

      // Generate template sections
      const templateSections = createTemplateSections(template, title);

      // Write to BOTH designTokens.pages[cleanSlug] and designTokens.pageOverrides[cleanSlug]
      const nextPages = {
        ...((currentDesignTokens?.pages as Record<string, unknown>) || {}),
        [cleanSlug]: {
          id: cleanSlug,
          title,
          label: title,
          sections: templateSections,
        },
      };
      const nextPageOverrides = {
        ...((currentDesignTokens?.pageOverrides as Record<string, unknown>) || {}),
        [cleanSlug]: {
          id: cleanSlug,
          title,
          label: title,
          sections: templateSections,
        },
      };

      // Add to menu if showInMenu
      let nextNavigation = (currentDesignTokens?.navigation as Record<string, unknown>) || {};
      if (showInMenu) {
        const currentMenu = Array.isArray((nextNavigation as any)?.menu)
          ? [...(nextNavigation as any).menu]
          : [
              { label: "الرئيسية", url: "/" },
              { label: "كل المنتجات", url: "/shop" },
            ];
        const pageUrl = `/${cleanSlug}`;
        if (!currentMenu.some((item: any) => item.url === pageUrl)) {
          const preset = STUDIO_PAGE_PRESETS.find((p) => p.id === template);
          const menuLabelToUse =
            preset?.menuLabel && (!title || title === preset.label)
              ? preset.menuLabel
              : (preset?.menuLabel || title);
          currentMenu.push({ label: menuLabelToUse, url: pageUrl });
        }
        nextNavigation = {
          ...nextNavigation,
          menu: currentMenu,
        };
      }

      const nextTokens: Record<string, unknown> = {
        ...currentDesignTokens,
        pages: nextPages,
        pageOverrides: nextPageOverrides,
        ...(showInMenu ? { navigation: nextNavigation } : {}),
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      setActivePageKey(cleanSlug);
      toast.success(`تم إنشاء صفحة "${title}" بنجاح!`);
    },
    [companyId, currentDesignTokens, handleDesignTokensChange, onSave, setActivePageKey]
  );

  const pageSectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STUDIO_PAGES.forEach((p) => {
      counts[p.id] = 0;
    });
    customPages.forEach((p) => {
      counts[p.id] = 0;
    });
    if (previewTheme && previewTheme.pages) {
      Object.entries(previewTheme.pages).forEach(([key, page]: [string, any]) => {
        counts[key] = Array.isArray(page?.sections) ? page.sections.length : 0;
      });
    }
    counts[activePageKey] = activeSections.length;
    return counts;
  }, [previewTheme, activePageKey, activeSections, customPages]);

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
        customPages={customPages}
        onOpenCreatePageModal={() => setShowCreatePageModal(true)}
        pageStyle={activePageStyle}
        onApplyPageStylePreset={handleApplyPageStylePreset}
        onUpdatePageStyle={handleUpdatePageStyle}
        onResetPageStyle={handleResetPageStyle}
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
        onToggleSpacingOverlay={() => {
          setShowSpacingOverlay((prev) => {
            const next = !prev;
            if (next) {
              if (!selectedSectionKey && activeSections.length > 0) {
                const firstKey = getSectionKey(activeSections[0], 0);
                setSelectedSectionKey(firstKey);
                setIsInspectorOpen(true);
              }
              toast.info("أداة المسافات مفعّلة: أشرطة الهوامش والحشوات ظاهرة (Esc للإخفاء)");
            } else {
              toast.info("تم إخفاء أداة المسافات");
            }
            return next;
          });
        }}
        isInspectorOpen={isInspectorOpen}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        isLeftDrawerOpen={isLeftDrawerOpen}
        onToggleLeftDrawer={() => setIsLeftDrawerOpen((prev) => !prev)}
        onBack={onBack}
        onPageChange={(page) => {
          setActivePageKey(page);
          setSelectedSectionKey("");
          setSelectedElement(null);
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
                      onRenameSection={handleRenameSection}
                      onToggleSectionVisibility={handleToggleSectionVisibility}
                      onToggleSectionLock={handleToggleSectionLock}
                      onMoveSection={handleMoveSection}
                      onDuplicateSection={handleDuplicateSection}
                      onDeleteSection={handleDeleteSection}
                      onOpenSectionCatalog={handleOpenCatalogModal}
                      onTabChange={(nextTab) => setLayersPanelTab(nextTab)}
                      onUpdateThemeTokens={handleDesignTokensChange}
                      onCollapse={() => setIsLeftDrawerOpen(false)}
                      onSectionContextMenu={(e, info) => {
                        setSelectedSectionKey(info.sectionKey);
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          sectionKey: info.sectionKey,
                          index: info.index,
                          parentKey: info.parentKey,
                          totalSections: info.totalSections,
                          isHidden: info.isHidden,
                          isLocked: info.isLocked,
                          label: info.label,
                        });
                      }}
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
                    customPages={customPages}
                    onOpenCreatePageModal={() => setShowCreatePageModal(true)}
                  />
                )}
              </div>
            </>
          )}

          {/* Center Live Stage */}
          <StudioCanvasStage deviceMode={deviceMode} zoomLevel={zoomLevel}>
            <StorefrontThemeProvider
              initialTheme={previewTheme as unknown as StorefrontThemeInput}
              activePageKey={activePageKey}
            >
              <div
                className="relative min-h-[800px] bg-background"
                style={{
                  ...resolvePageStyleVars(previewTheme, activePageKey, activePageStyle),
                  fontFamily: activePageStyle?.fontFamily ? 'var(--store-font-family)' : undefined,
                  '--accent': 'var(--store-accent)',
                  '--radius': 'var(--store-radius)',
                } as React.CSSProperties}
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
                      const isSectionHidden = Boolean(
                        typeof sectionEntry === "object" &&
                          sectionEntry !== null &&
                          (sectionEntry.hidden === true || sectionEntry.settings?.hidden === true)
                      );
                      const isSectionLocked = Boolean(
                        typeof sectionEntry === "object" &&
                          sectionEntry !== null &&
                          (sectionEntry.locked === true || sectionEntry.settings?.locked === true)
                      );
                      const sectionLabel =
                        (typeof sectionEntry === "object" &&
                          sectionEntry !== null &&
                          (sectionEntry.label || sectionEntry.settings?.label)) ||
                        getStorefrontSectionManifest(
                          typeof sectionEntry === "string" ? sectionEntry : sectionEntry?.type
                        )?.label ||
                        getStorefrontSectionManifest(componentKey)?.label ||
                        (sectionId === "container" ? "حاوية" : getStorefrontSectionLabel(sectionId));
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
                          hidden={isSectionHidden}
                          locked={isSectionLocked}
                          libraryDropSlot={libraryDropSlot}
                          selectedElement={selectedElement}
                          onSelect={() => {
                            setSelectedSectionKey(stableKey);
                            setIsInspectorOpen(true);
                          }}
                          onToggleVisibility={() => handleToggleSectionVisibility(stableKey)}
                          onSelectElement={(el) => {
                            setSelectedSectionKey(stableKey);
                            setSelectedElement(el);
                            setIsInspectorOpen(true);
                          }}
                          onClearSelectedElement={() => {
                            setSelectedElement(null);
                          }}
                          onUpdateField={(field, val) => handleUpdateSectionField(field, val, deviceMode)}
                          onBatchUpdateFields={(updates) => handleBatchUpdateSectionFields(updates, stableKey, deviceMode)}
                          onSave={onSave}
                          onMoveUp={() => handleMoveSection(index, "up")}
                          onMoveDown={() => handleMoveSection(index, "down")}
                          onDuplicate={() => handleDuplicateSection(index)}
                          onDelete={() => handleDeleteSection(stableKey)}
                          onContextMenu={(e) => {
                            setContextMenu({
                              x: e.clientX,
                              y: e.clientY,
                              sectionKey: stableKey,
                              index,
                              totalSections: activeSections.length,
                              isHidden: isSectionHidden,
                              isLocked: isSectionLocked,
                              label: sectionLabel,
                            });
                          }}
                          onLibraryDragOver={(slot) => setLibraryDropSlot(slot)}
                          onLibraryDrop={(secType, slot) => {
                            handleAddSection(secType, slot);
                            setLibraryDropSlot(null);
                            setDraggingLibraryItem(null);
                          }}
                          onLibraryDropIntoContainer={(secType, containerKey) => {
                            handleAddSection(secType, undefined, containerKey);
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
                  selectedElement={selectedElement}
                  onClearSelectedElement={() => setSelectedElement(null)}
                  onClose={() => setIsInspectorOpen(false)}
                  onUpdateField={(field, val) => handleUpdateSectionField(field, val, deviceMode)}
                  onBatchUpdateFields={(updates) => handleBatchUpdateSectionFields(updates, selectedSectionKey, deviceMode)}
                  onResetDeviceOverrides={(dev) => handleResetDeviceOverrides(selectedSectionKey, dev)}
                  onOpenImagePicker={handleOpenImagePickerModal}
                  onSwitchDevice={setDeviceMode}
                  onSave={onSave}
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

      <StudioCreatePageModal
        isOpen={showCreatePageModal}
        onClose={() => setShowCreatePageModal(false)}
        existingSlugs={existingSlugs}
        onCreatePage={handleCreateCustomPage}
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

      {/* Right-click Context Menu */}
      {contextMenu && (
        <StudioContextMenu
          state={contextMenu}
          hasClipboard={Boolean(clipboardSection)}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => handleDuplicateSection(contextMenu.index, contextMenu.parentKey)}
          onCopy={() => handleCopySection(contextMenu.sectionKey)}
          onPasteAfter={() => handlePasteSection(contextMenu.sectionKey, contextMenu.index)}
          onMoveUp={() => handleMoveSection(contextMenu.index, "up", contextMenu.parentKey)}
          onMoveDown={() => handleMoveSection(contextMenu.index, "down", contextMenu.parentKey)}
          onToggleVisibility={() => handleToggleSectionVisibility(contextMenu.sectionKey)}
          onToggleLock={() => handleToggleSectionLock(contextMenu.sectionKey)}
          onDelete={() => handleDeleteSection(contextMenu.sectionKey)}
        />
      )}
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(studioContent, document.body)
    : studioContent;
};
