import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { StudioTopBar } from "./StudioTopBar";
import { StudioHistoryPanel } from "./StudioHistoryPanel";
import { StudioLeftRail } from "./StudioLeftRail";
import { StudioElementsPanel } from "./StudioElementsPanel";
import { StudioLayersDrawer, GripDotsIcon } from "./StudioLayersDrawer";
import { StudioPropertyInspector } from "./StudioPropertyInspector";
import { StudioCanvasStage } from "./StudioCanvasStage";
import { StudioSortableSection } from "./StudioSortableSection";
import { StudioStatusBar } from "./StudioStatusBar";
import { StudioOnboarding, isOnboardingCompleted } from "./StudioOnboarding";
import { StudioSectionCatalogModal } from "./StudioSectionCatalogModal";
import { StudioShortcutsModal } from "./StudioShortcutsModal";
import { StudioSearchReplacePanel } from "./StudioSearchReplacePanel";
import { StudioMultiSelectActionBar } from "./StudioMultiSelectActionBar";
import { StudioPagesPanel } from "./StudioPagesPanel";
import { StudioHeaderFooterPanel } from "./StudioHeaderFooterPanel";
import { StudioTemplateGalleryPanel } from "./StudioTemplateGalleryPanel";
import { StudioThemeGalleryPanel } from "./StudioThemeGalleryPanel";
import { StudioVariablesPanel } from "./StudioVariablesPanel";
import { StudioVariablesStyle } from "./StudioVariablesStyle";
import { LegalBundlePanel } from "../compliance/LegalBundlePanel";
import {
  buildLegalBundlePage,
  buildLegalBundleSectionSettings,
  type LegalBundlePlan,
} from "../compliance/legalBundle";
import { StudioGlobalComponentsPanel } from "./inspector/StudioGlobalComponentsPanel";
import { StudioCreatePageModal } from "./StudioCreatePageModal";
import { StudioPageSettingsPanel } from "./StudioPageSettingsPanel";
import { StudioLocaleSettingsPanel } from "./StudioLocaleSettingsPanel";
import { StudioExportImportModal } from "./StudioExportImportModal";
import { StudioErrorBoundary } from "./StudioErrorBoundary";
import { StudioCommentsLayer, type StudioCommentDraftInput, type StudioCommentSectionTarget } from "./StudioCommentsLayer";
import { StudioCommentsPanel } from "./StudioCommentsPanel";
import {
  addStudioCommentToSettings,
  deleteStudioCommentFromSettings,
  findStudioSectionElement,
  readStudioComments,
  resolveCommentAuthorName,
  setStudioCommentResolvedInSettings,
} from "./utils/studioComments";
import {
  trackStudioOpen,
  trackStudioPublish,
  trackStudioTemplateApply,
  trackStudioAiOpen,
} from "../analytics/beacon";
import { useStudioTouchDrag } from "./hooks/useStudioTouchDrag";
import { preserveStudioVariablesOnThemeChange } from "./utils/studioVariables";
import type { StorefrontPageSEOConfig, StorefrontPageStatus } from "../types/theme.types";
import { buildPresetPage, type IndustryPreset } from "../presets/industryPresets";
import type { StudioLeftRailActiveTab } from "./StudioLeftRail";
import { createTemplateSections } from "./utils/studioPageTemplates";
import { STUDIO_PAGE_PRESETS } from "./StudioPagePresets";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { useAuth } from "../../hooks/useAuthSimple";
import type { StudioPageDefinition } from "./StudioTypes";
import StorefrontImagePickerModal from "../../components/store/StorefrontImagePickerModal";
import { StudioMediaLibraryPanel } from "./StudioMediaLibraryPanel";
import {
  resolveStudioAccess,
  recordStudioHeartbeat,
  getActiveStudioEditors,
  clearStudioHeartbeat,
  type StudioActiveEditor,
  type StudioUser,
  type StudioCompany,
} from "./utils/studioPermissions";
import { StudioViewerBanner } from "./StudioViewerBanner";
import { StudioConflictPanel } from "./StudioConflictPanel";
import { toast } from "sonner";
import {
  StudioContextMenu,
  type StudioContextMenuState,
  type StudioContextMenuProps,
} from "./StudioContextMenu";
export {
  StudioContextMenu,
  type StudioContextMenuState,
  type StudioContextMenuProps,
} from "./StudioContextMenu";
import "./storefront-studio.css";

import {
  STUDIO_PAGES,
  type StudioDeviceMode,
  type StudioLeftRailTab,
  type StudioLeftPanelTab,
  type StudioZoomLevel,
  type StudioInspectorTab,
  type StudioSelectedElement,
  type StudioComment,
} from "./StudioTypes";
import { PageComposer } from "../engine/PageComposer";
import { StorefrontThemeProvider } from "../engine/ThemeProvider";
import { resolvePageStyleVars } from "../engine/themeResolverCore";
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
  onSave: (options?: { baseRevision?: number }) => Promise<unknown> | void;
  onDiscard?: () => void;
  onBack: () => void;
  onOpenPreview: () => void;
  onChange: (nextTokens: Record<string, unknown>) => void;
  onThemeIdChange?: (themeId: string) => void;
  companyId?: string;
  onReload?: () => Promise<void> | void;
  user?: StudioUser | null;
  company?: StudioCompany | null;
  canEdit?: boolean;
  canPublish?: boolean;
  readOnly?: boolean;
  baseRevision?: number;
}

export const StorefrontStudioShell: React.FC<StorefrontStudioShellProps> = ({
  themeId, designTokens: externalDesignTokens, storeName = "متجري",
  hasPendingChanges, saving, previewUrl, onSave, onDiscard, onBack, onOpenPreview, onChange,
  onThemeIdChange,
  companyId: propCompanyId,
  onReload,
  user: propUser,
  company: propCompany,
  canEdit: propCanEdit,
  canPublish: propCanPublish,
  readOnly: propReadOnly,
  baseRevision: propBaseRevision,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isExportImportModalOpen, setIsExportImportModalOpen] = useState<boolean>(false);
  const auth = useAuth?.() || {};
  const authUser = (auth as { user?: StudioUser })?.user;
  const effectiveUser = propUser !== undefined ? propUser : authUser;
  const user = effectiveUser;
  const effectiveCompany = propCompany !== undefined ? propCompany : (effectiveUser as any)?.company;

  const access = useMemo(() => {
    const resolved = resolveStudioAccess(effectiveUser, effectiveCompany);
    const effectiveCanEdit =
      propCanEdit !== undefined
        ? propCanEdit
        : propReadOnly === true
        ? false
        : resolved.canEdit;
    const effectiveCanPublish =
      propCanPublish !== undefined
        ? propCanPublish
        : propReadOnly === true
        ? false
        : resolved.canPublish;
    return {
      canEdit: effectiveCanEdit,
      canPublish: effectiveCanPublish,
      reason: resolved.reason,
    };
  }, [effectiveUser, effectiveCompany, propCanEdit, propCanPublish, propReadOnly]);

  const canEdit = access.canEdit;
  const canPublish = access.canPublish;

  const sessionIdRef = useRef<string>(`sess_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`);
  const [activeEditors, setActiveEditors] = useState<StudioActiveEditor[]>([]);

  const companyId = propCompanyId || (effectiveUser as any)?.companyId || "";
  const [deviceMode, setDeviceMode] = useState<StudioDeviceMode>("desktop");
  const [zoomLevel, setZoomLevel] = useState<StudioZoomLevel>(1);
  const [showSpacingOverlay, setShowSpacingOverlay] = useState<boolean>(true);
  const [leftRailTab, setLeftRailTab] = useState<StudioLeftRailActiveTab>("elements");
  const [layersPanelTab, setLayersPanelTab] = useState<StudioLeftPanelTab>("layers");
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState<boolean>(false);
  const [isPageSettingsOpen, setIsPageSettingsOpen] = useState<boolean>(false);
  const [imagePickerTargetField, setImagePickerTargetField] = useState<string>("image");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<StudioSelectedElement | null>(null);
  const [showCreatePageModal, setShowCreatePageModal] = useState<boolean>(false);
  const [dbCustomPages, setDbCustomPages] = useState<
    Array<{ id: string; slug: string; title: string; pageType: string }>
  >([]);
  const [contextMenu, setContextMenu] = useState<StudioContextMenuState | null>(null);
  const [clipboardSection, setClipboardSection] = useState<any | null>(null);
  // CMT-1 — وضع التعليق على الكانفس + بانل كل التعليقات
  const [isCommentsMode, setIsCommentsMode] = useState<boolean>(false);
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState<boolean>(false);

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

  // Product Metrics: Track studio open once on mount (PERF-1)
  useEffect(() => {
    if (companyId) {
      trackStudioOpen(activePageKey || "home", { companyId });
    }
  }, [companyId]);

  // Optimistic Concurrency Lock (PERM-1)
  const [currentBaseRevision, setCurrentBaseRevision] = useState<number>(propBaseRevision || 1);
  const [conflictState, setConflictState] = useState<{
    isOpen: boolean;
    baseRevision: number;
    serverRevision: number;
    serverTokens?: Record<string, unknown> | null;
  }>({
    isOpen: false,
    baseRevision: 1,
    serverRevision: 1,
    serverTokens: null,
  });

  useEffect(() => {
    if (propBaseRevision !== undefined) {
      setCurrentBaseRevision(propBaseRevision);
    }
  }, [propBaseRevision]);

  const handleSafeSave = useCallback(async () => {
    if (!canEdit) {
      toast.error("أنت في وضع المشاهدة: ليس لديك صلاحية حفظ التعديلات");
      return;
    }

    try {
      const savePromise = onSave({ baseRevision: currentBaseRevision });
      const result = await Promise.resolve(savePromise);

      if (result && typeof result === "object") {
        const resObj = result as {
          status?: number;
          conflict?: boolean;
          serverRevision?: number;
          serverTokens?: Record<string, unknown>;
        };
        if (resObj.status === 409 || resObj.conflict) {
          setConflictState({
            isOpen: true,
            baseRevision: currentBaseRevision,
            serverRevision: resObj.serverRevision || currentBaseRevision + 1,
            serverTokens: resObj.serverTokens || null,
          });
          return; // Zero write to state!
        }
      }
    } catch (err: unknown) {
      const errorObj = err as {
        status?: number;
        code?: number | string;
        message?: string;
        serverRevision?: number;
        serverTokens?: Record<string, unknown>;
        response?: {
          status?: number;
          data?: {
            serverRevision?: number;
            designTokens?: Record<string, unknown>;
          };
        };
      };

      if (
        errorObj?.status === 409 ||
        errorObj?.response?.status === 409 ||
        errorObj?.code === 409 ||
        errorObj?.code === "CONFLICT" ||
        String(errorObj?.message || "").includes("409")
      ) {
        setConflictState({
          isOpen: true,
          baseRevision: currentBaseRevision,
          serverRevision:
            errorObj?.serverRevision ||
            errorObj?.response?.data?.serverRevision ||
            currentBaseRevision + 1,
          serverTokens:
            errorObj?.serverTokens ||
            errorObj?.response?.data?.designTokens ||
            null,
        });
        return; // Zero write to state!
      }
      throw err;
    }
  }, [canEdit, currentBaseRevision, onSave]);

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
    const leftPanelWidth = isLeftDrawerOpen
      ? leftRailTab === "elements"
        ? 280
        : leftRailTab === "header-footer" ||
          leftRailTab === "templates" ||
          leftRailTab === "themes" ||
          leftRailTab === "variables"
        ? 340
        : 288
      : 0;
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

  const handleOpenImagePickerModal = (targetField: string = "image") => {
    setShowCatalogModal(false);
    setImagePickerTargetField(typeof targetField === "string" ? targetField : "image");
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
    selectedSectionKeys,
    setSelectedSectionKeys,
    toggleSectionSelection,
    handleBulkDelete,
    handleBulkToggleVisibility,
    handleBulkToggleLock,
    handleBulkDuplicate,
    handleBulkAlign,
    handleUpdateActiveSections,
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
    historySteps,
    currentHistoryStepIndex,
    jumpToHistoryStep,
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
    handleResetPropertyOverride,
    activePageStyle,
    handleApplyPageStylePreset,
    handleUpdatePageStyle,
    handleResetPageStyle,
    globalComponents,
    handleCreateGlobalComponent,
    handleInsertComponentInstance,
    handleUpdateGlobalComponent,
    handleDeleteGlobalComponent,
    handleDetachComponentInstance,
    templates,
    handleSaveTemplate,
    handleDeleteTemplate,
    exportPage,
    downloadPageJSON,
    importPage,
    createPrePublishSnapshot,
    handleRestorePrePublishSnapshot,
    handlePublish,
    variables,
    handleUpdateVariables,
    handleDeletePage,
    handleDuplicatePage,
    handleRenamePage,
  } = useStorefrontStudioState({
    themeId,
    externalDesignTokens,
    onChange,
    onSave,
  });

  // Heartbeat: update active editors on activePageKey change (PERM-1)
  const heartbeatUserKey = `${effectiveUser?.id || ""}:${effectiveUser?.email || ""}:${effectiveUser?.name || ""}`;
  useEffect(() => {
    const updateHeartbeat = () => {
      try {
        recordStudioHeartbeat(activePageKey || "home", effectiveUser, sessionIdRef.current);
        const editors = getActiveStudioEditors(activePageKey || "home");
        setActiveEditors((prev) => {
          if (
            prev.length === editors.length &&
            prev.every(
              (item, i) =>
                item.sessionId === editors[i]?.sessionId &&
                item.pageKey === editors[i]?.pageKey &&
                item.userName === editors[i]?.userName
            )
          ) {
            return prev;
          }
          return editors;
        });
      } catch {
        // Safe fallback
      }
    };

    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 15000);

    return () => {
      clearInterval(interval);
      try {
        clearStudioHeartbeat(sessionIdRef.current);
      } catch {
        // Safe fallback
      }
    };
  }, [activePageKey, heartbeatUserKey]);

  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSearchReplacePanel, setShowSearchReplacePanel] = useState(false);

  const serverOnboarded = useMemo(() => {
    return Boolean(
      (externalDesignTokens as any)?.studioOnboarded ||
      (externalDesignTokens as any)?.onboardingSeen ||
      (externalDesignTokens as any)?.hasSeenOnboarding ||
      (user as any)?.studioOnboarded ||
      (user as any)?.preferences?.studioOnboarded
    );
  }, [externalDesignTokens, user]);

  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(() => {
    return !isOnboardingCompleted(undefined, serverOnboarded);
  });

  const handleSelectSection = useCallback(
    (key: string, e?: React.MouseEvent) => {
      if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        toggleSectionSelection(key, { multi: e.ctrlKey || e.metaKey, range: e.shiftKey });
      } else {
        setSelectedSectionKey(key);
        setSelectedSectionKeys([key]);
      }
    },
    [toggleSectionSelection, setSelectedSectionKey, setSelectedSectionKeys]
  );

  // CMT-1 — تعليقات الكانفس (تُحفظ داخل نفس settings blob: designTokens.comments)
  const studioCommentTargets = useMemo<StudioCommentSectionTarget[]>(
    () =>
      activeSections.map((entry: any, index: number) => {
        const key = getSectionKey(entry, index);
        const type = typeof entry === "string" ? entry : entry?.type || "section";
        const explicitLabel =
          typeof entry === "object" && entry !== null
            ? entry.label || entry.settings?.label
            : "";
        const label =
          (typeof explicitLabel === "string" && explicitLabel.trim() ? explicitLabel : "") ||
          getStorefrontSectionManifest(type)?.label ||
          getStorefrontSectionLabel(type);
        return { key, label: String(label || type) };
      }),
    [activeSections]
  );

  const studioComments = useMemo(
    () => readStudioComments(currentDesignTokens),
    [currentDesignTokens]
  );

  const commentSectionKeysByPage = useMemo(
    () => ({
      [activePageKey || "home"]: studioCommentTargets.map((target) => target.key),
    }),
    [activePageKey, studioCommentTargets]
  );

  const commentSectionLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    studioCommentTargets.forEach((target) => {
      labels[`${activePageKey || "home"}::${target.key}`] = target.label;
    });
    return labels;
  }, [activePageKey, studioCommentTargets]);

  const commentAuthorName = useMemo(
    () => resolveCommentAuthorName(effectiveUser),
    [effectiveUser]
  );

  const handleAddStudioComment = useCallback(
    (input: StudioCommentDraftInput) => {
      if (!canEdit) {
        toast.error("أنت في وضع المشاهدة: لا يمكن إضافة تعليقات");
        return;
      }
      const result = addStudioCommentToSettings(currentDesignTokens, {
        pageKey: activePageKey || "home",
        sectionKey: input.sectionKey,
        anchor: input.anchor,
        text: input.text,
        author: commentAuthorName,
      });
      if (!result.comment) {
        toast.error("تعذر إضافة التعليق: النص فارغ");
        return;
      }
      handleDesignTokensChange(result.tokens);
      onSave();
    },
    [
      activePageKey,
      canEdit,
      commentAuthorName,
      currentDesignTokens,
      handleDesignTokensChange,
      onSave,
    ]
  );

  const handleSetStudioCommentResolved = useCallback(
    (id: string, resolved: boolean) => {
      if (!canEdit) return;
      handleDesignTokensChange(
        setStudioCommentResolvedInSettings(currentDesignTokens, id, resolved)
      );
      onSave();
    },
    [canEdit, currentDesignTokens, handleDesignTokensChange, onSave]
  );

  const handleDeleteStudioComment = useCallback(
    (id: string) => {
      if (!canEdit) return;
      handleDesignTokensChange(
        deleteStudioCommentFromSettings(currentDesignTokens, id)
      );
      onSave();
    },
    [canEdit, currentDesignTokens, handleDesignTokensChange, onSave]
  );

  const handleNavigateToStudioComment = useCallback(
    (comment: StudioComment) => {
      if (!comment || !comment.sectionKey) return;
      if (comment.pageKey !== (activePageKey || "home")) {
        setActivePageKey(comment.pageKey);
      }
      handleSelectSection(comment.sectionKey);
      setIsInspectorOpen(true);
      const element = findStudioSectionElement(comment.sectionKey);
      if (element && typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    },
    [activePageKey, handleSelectSection, setActivePageKey]
  );

  const handleTouchReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
      const fromKey = sectionKeys[fromIndex];
      const toKey = sectionKeys[toIndex];
      if (!fromKey || !toKey) return;
      handleDragEnd({
        active: { id: fromKey },
        over: { id: toKey },
      } as any);
    },
    [sectionKeys, handleDragEnd]
  );

  const {
    isTouchDragging,
    activeTouchDragIndex,
    activeTouchDragKey,
    touchDropTargetSlot,
    touchDragOffsetY,
    handleTouchPointerDown,
  } = useStudioTouchDrag({
    sections: activeSections,
    sectionKeys,
    activePageKey,
    onReorder: handleTouchReorder,
  });

  const handleUpdatePageSettings = useCallback(
    (updates: { seo?: Partial<StorefrontPageSEOConfig>; status?: StorefrontPageStatus }) => {
      const currentTokens = (currentDesignTokens as Record<string, any>) || {};
      const currentPages = (currentTokens.pages as Record<string, any>) || {};
      const currentPage = currentPages[activePageKey] || activePageConfig || {};

      const nextPage = {
        ...currentPage,
        ...(updates.seo !== undefined
          ? { seo: { ...((currentPage.seo as Record<string, any>) || {}), ...updates.seo } }
          : {}),
        ...(updates.status !== undefined ? { status: updates.status } : {}),
      };

      const nextPages = {
        ...currentPages,
        [activePageKey]: nextPage,
      };

      handleDesignTokensChange({
        ...currentTokens,
        pages: nextPages,
        pageOverrides: nextPages,
      });
      onSave();
    },
    [activePageKey, activePageConfig, currentDesignTokens, handleDesignTokensChange, onSave]
  );

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
        } else if (showShortcutsModal) {
          setShowShortcutsModal(false);
        } else if (showSearchReplacePanel) {
          setShowSearchReplacePanel(false);
        } else if (selectedSectionKeys.length > 1) {
          setSelectedSectionKeys(selectedSectionKey ? [selectedSectionKey] : []);
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

      if (!isInput && (e.key === "?" || (e.shiftKey && (e.key === "?" || e.code === "Slash")))) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      if (!isInput && (e.key === "Delete" || e.key === "Backspace")) {
        if (selectedSectionKeys.length > 1) {
          e.preventDefault();
          handleBulkDelete();
          return;
        } else if (selectedSectionKey) {
          e.preventDefault();
          handleDeleteSection(selectedSectionKey);
          return;
        }
      }

      if (!isInput && (e.ctrlKey || e.metaKey)) {
        if (e.key === "f" || e.key === "F") {
          e.preventDefault();
          setShowSearchReplacePanel((prev) => !prev);
          return;
        }
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

    selectedSectionKeys,
    showShortcutsModal,
    showSearchReplacePanel,
    handleBulkDelete,
    handleDeleteSection,
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

  const handleStudioDeletePage = useCallback(
    (pageKey: string) => {
      const res = handleDeletePage(pageKey);
      if (res !== false) {
        setDbCustomPages((prev) => prev.filter((p) => p.slug !== pageKey && p.id !== pageKey));
        try {
          fetch(`${getApiUrl()}/store-pages/${pageKey}`, {
            method: "DELETE",
            headers: tokenManager.createAuthHeaders(),
          }).catch(() => {});
        } catch {}
      }
      return res;
    },
    [handleDeletePage]
  );

  const handleStudioRenamePage = useCallback(
    (pageKey: string, newTitle: string, newSlug?: string) => {
      const res = handleRenamePage(pageKey, newTitle, newSlug);
      if (res !== false) {
        const cleanSlug = newSlug
          ? newSlug.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "")
          : pageKey;
        setDbCustomPages((prev) =>
          prev.map((p) =>
            p.slug === pageKey ? { ...p, slug: cleanSlug || p.slug, title: newTitle.trim() } : p
          )
        );
      }
      return res;
    },
    [handleRenamePage]
  );

  const handleCreateCustomPage = useCallback(
    async (pageData: {
      title: string;
      slug: string;
      template: string;
      showInMenu: boolean;
    }) => {
      const { title, slug, template, showInMenu } = pageData;
      const cleanSlug = slug.trim().toLowerCase();

      // Ticket MANAGE-PAGES: Generate template sections FIRST and verify template application
      const templateSections = createTemplateSections(template, title);
      if (!templateSections || templateSections.length === 0) {
        toast.error("لم يتم تطبيق القالب — أعد المحاولة");
        return;
      }

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

  const handleApplyIndustryPreset = useCallback(
    (preset: IndustryPreset) => {
      const presetConfig = buildPresetPage(preset.id);
      const currentPages = {
        ...((currentDesignTokens?.pages as Record<string, any>) || {}),
      };
      const currentOverrides = {
        ...((currentDesignTokens?.pageOverrides as Record<string, any>) || {}),
      };
      const targetPageKey = activePageKey || "home";
      const existingPage = currentPages[targetPageKey] || currentOverrides[targetPageKey] || {};

      const updatedPage = {
        ...existingPage,
        id: targetPageKey,
        sections: presetConfig.sections,
      };

      currentPages[targetPageKey] = updatedPage;
      currentOverrides[targetPageKey] = updatedPage;

      const existingPageStyles =
        ((currentDesignTokens?.pageStyles as Record<string, any>) || {});
      const nextPageStyles = {
        ...existingPageStyles,
        [targetPageKey]: {
          ...(existingPageStyles[targetPageKey] || {}),
          accent: preset.style.accent,
          density: preset.style.density,
          radius: preset.style.radius,
        },
      };

      const nextTokens: Record<string, unknown> = {
        ...currentDesignTokens,
        pages: currentPages,
        pageOverrides: currentOverrides,
        pageStyles: nextPageStyles,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      setSelectedSectionKey("");
      if (companyId) {
        trackStudioTemplateApply(targetPageKey, preset.id, { companyId });
      }
      toast.success(`تم تطبيق قالب «${preset.label}» على صفحة ${targetPageKey} بنجاح`);
    },
    [activePageKey, currentDesignTokens, handleDesignTokensChange, onSave, setSelectedSectionKey, companyId]
  );

  // COMPLY-1: adds the cookie bar to the current page plus the two policy pages,
  // built from the panel's idempotent plan (nothing is ever added twice).
  const handleApplyLegalBundle = useCallback(
    (plan: LegalBundlePlan) => {
      if (!plan || plan.items.length === 0) {
        return;
      }

      const currentTokens = (currentDesignTokens as Record<string, any>) || {};
      const currentPages = (currentTokens["pages"] as Record<string, any>) || {};
      const nextPages: Record<string, any> = { ...currentPages };

      plan.items.forEach((item) => {
        if (item.kind === "section") {
          const targetPageKey = item.pageKey || activePageKey || "home";
          const pageFromTokens: Record<string, any> | undefined = nextPages[targetPageKey];
          const existingPage: Record<string, any> =
            pageFromTokens || (targetPageKey === activePageKey ? (activePageConfig as Record<string, any>) : {}) || {};
          const existingSections: any[] = Array.isArray(existingPage["sections"])
            ? [...existingPage["sections"]]
            : [];
          const alreadyPresent = existingSections.some((section: any) =>
            (typeof section === "string" ? section : section?.type) === item.sectionType
          );

          if (!alreadyPresent) {
            existingSections.push({
              key: `${item.sectionType}-${Date.now()}`,
              type: item.sectionType,
              settings: buildLegalBundleSectionSettings("ar"),
            });
          }

          nextPages[targetPageKey] = { ...existingPage, id: targetPageKey, sections: existingSections };
          return;
        }

        if (nextPages[item.pageKey]) {
          return;
        }

        nextPages[item.pageKey] = buildLegalBundlePage(
          { pageKey: item.pageKey, sectionType: item.sectionType, title: item.label },
          "ar"
        );
      });

      handleDesignTokensChange({
        ...currentTokens,
        pages: nextPages,
        pageOverrides: nextPages,
      });
      onSave();
      toast.success("تمت إضافة حزمة الامتثال: شريط الكوكيز وصفحتي الخصوصية والشروط");
    },
    [activePageConfig, activePageKey, currentDesignTokens, handleDesignTokensChange, onSave]
  );

  const handleApplyTheme = useCallback(
    (newThemeId: string, nextTokens: Record<string, unknown>) => {
      // TOKENS-1: theme switching must never wipe merchant-authored --sf-* variables
      // (same lesson as MERCHANT_CONTENT_KEYS on the backend).
      const preservedTokens = preserveStudioVariablesOnThemeChange(
        currentDesignTokens,
        nextTokens
      );
      handleDesignTokensChange(preservedTokens);
      onSave();
      toast.success(`تم تطبيق ثيم «${newThemeId}» بنجاح ✨`);
    },
    [currentDesignTokens, handleDesignTokensChange, onSave]
  );

  const handleApplyImportedTheme = useCallback(
    (importedTheme: any) => {
      const nextTokens: Record<string, unknown> = {
        ...currentDesignTokens,
        themeId: importedTheme.id,
        colors: importedTheme.tokens?.colors,
        typography: importedTheme.tokens?.typography,
        shape: importedTheme.tokens?.shape,
        productCard: importedTheme.tokens?.productCard,
        header: importedTheme.chrome?.header || importedTheme.header,
        footer: importedTheme.chrome?.footer || importedTheme.footer,
        direction: importedTheme.tokens?.direction || importedTheme.direction || "rtl",
        pages: importedTheme.pages,
        pageOverrides: importedTheme.pages,
      };
      handleDesignTokensChange(nextTokens);
      onThemeIdChange?.(importedTheme.id);
      onSave();
      toast.success(`تم استيراد وتطبيق قالب «${importedTheme.name || importedTheme.id}» بنجاح ✨`);
    },
    [currentDesignTokens, handleDesignTokensChange, onSave, onThemeIdChange]
  );

  const handlePublishWithTracking = useCallback(async () => {
    if (!canPublish || !canEdit) {
      toast.error("ليس لديك صلاحية النشر");
      return;
    }
    if (companyId) {
      trackStudioPublish(activePageKey || "home", {
        companyId,
        sectionCount: activeSections?.length,
      });
    }
    try {
      await handlePublish();
    } catch (err: unknown) {
      const errorObj = err as {
        status?: number;
        code?: number | string;
        message?: string;
        serverRevision?: number;
        response?: { status?: number };
      };
      if (
        errorObj?.status === 409 ||
        errorObj?.response?.status === 409 ||
        errorObj?.code === 409 ||
        String(errorObj?.message || "").includes("409")
      ) {
        setConflictState({
          isOpen: true,
          baseRevision: currentBaseRevision,
          serverRevision: errorObj?.serverRevision || currentBaseRevision + 1,
          serverTokens: null,
        });
        return;
      }
      throw err;
    }
  }, [canPublish, canEdit, companyId, activePageKey, activeSections?.length, handlePublish, currentBaseRevision]);


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
      {/* 0. TOKENS-1 — page-level design variables (--sf-*) */}
      <StudioVariablesStyle variables={variables} />

      {/* 1. Pro Studio Top Bar */}
      <StudioTopBar
        storeName={storeName}
        themeName={themeName}
        activePageKey={activePageKey}
        customPages={customPages}
        onOpenCreatePageModal={() => setShowCreatePageModal(true)}
        onDeletePage={handleStudioDeletePage}
        onDuplicatePage={handleDuplicatePage}
        onRenamePage={handleStudioRenamePage}
        existingSlugs={existingSlugs}
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
        onSave={handleSafeSave}
        onPublish={handlePublishWithTracking}
        canEdit={canEdit}
        canPublish={canPublish}
        readOnly={!canEdit}
        activeEditors={activeEditors}
        onOpenExportImport={() => setIsExportImportModalOpen(true)}
        onOpenPreview={onOpenPreview}
        isHistoryOpen={isHistoryOpen}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
        pageStatus={(activePageConfig?.status as StorefrontPageStatus) || "published"}
        onOpenPageSettings={() => setIsPageSettingsOpen(true)}
      />

      {/* 1.1 Viewer Mode Banner (PERM-1) */}
      {!canEdit && (
        <StudioViewerBanner
          reason={access.reason === "viewer_no_permission" ? "صلاحية storefront.edit غير مفعّلة" : undefined}
          onRequestPermission={() => {
            toast.info("يرجى التواصل مع مالك أو مدير المتجر لمنحك صلاحية التعديل (storefront.edit)");
          }}
        />
      )}

      {/* 1.2 Concurrency Conflict Dialog (PERM-1) */}
      {conflictState.isOpen && (
        <StudioConflictPanel
          isOpen={conflictState.isOpen}
          baseRevision={conflictState.baseRevision}
          serverRevision={conflictState.serverRevision}
          localTokens={currentDesignTokens}
          serverTokens={conflictState.serverTokens}
          onClose={() => setConflictState((prev) => ({ ...prev, isOpen: false }))}
          onReload={async () => {
            setConflictState((prev) => ({ ...prev, isOpen: false }));
            if (onReload) {
              await onReload();
            }
          }}
        />
      )}

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
                setLeftRailTab("media");
                setIsLeftDrawerOpen(true);
                return;
              }
              if (tab === "ai") {
                if (companyId) {
                  trackStudioAiOpen(activePageKey || "home", { companyId });
                }
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

                {(leftRailTab === "layers" || leftRailTab === "styles" || leftRailTab === "code") && (
                  <div className="w-72 max-w-[85vw] h-full flex flex-col bg-[#202226] border-e border-[#0c0d0f]">
                    <StudioLayersDrawer
                      sections={activeSections}
                      sectionKeys={sectionKeys}
                      selectedSectionKey={selectedSectionKey}
                      selectedSectionKeys={selectedSectionKeys}
                      leftPanelTab={layersPanelTab}
                      designTokens={currentDesignTokens}
                      onSelectSection={(key, e) => {
                        handleSelectSection(key, e);

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
                    onDeletePage={handleStudioDeletePage}
                    onDuplicatePage={handleDuplicatePage}
                    onRenamePage={handleStudioRenamePage}
                    existingSlugs={existingSlugs}
                  />
                )}

                {leftRailTab === "header-footer" && (
                  <StudioHeaderFooterPanel
                    designTokens={currentDesignTokens}
                    onChange={handleDesignTokensChange}
                    onClose={() => setIsLeftDrawerOpen(false)}
                  />
                )}

                {leftRailTab === "settings" && (
                  <div className="w-72 max-w-[85vw] h-full flex flex-col bg-[#202226] border-e border-[#0c0d0f]">
                    <StudioLocaleSettingsPanel
                      designTokens={currentDesignTokens}
                      onUpdateThemeTokens={handleDesignTokensChange}
                      onClose={() => setIsLeftDrawerOpen(false)}
                    />
                  </div>
                )}

                {leftRailTab === "compliance" && (
                  <LegalBundlePanel
                    activePageKey={activePageKey}
                    existingSectionTypes={activeSections.map((section: any) =>
                      typeof section === "string" ? section : section?.type || ""
                    )}
                    existingPageKeys={Array.from(
                      new Set([
                        ...Object.keys(((currentDesignTokens as any)?.pages as Record<string, unknown>) || {}),
                        ...Object.keys(((currentDesignTokens as any)?.pageOverrides as Record<string, unknown>) || {}),
                      ])
                    )}
                    onApplyBundle={handleApplyLegalBundle}
                    onClose={() => setIsLeftDrawerOpen(false)}
                  />
                )}

                {leftRailTab === "components" && (
                  <StudioGlobalComponentsPanel
                    globalComponents={globalComponents}
                    selectedSectionKey={selectedSectionKey}
                    selectedSectionConfig={selectedSectionConfig}
                    activePageKey={activePageKey}
                    allPages={((currentDesignTokens as any)?.pages || {}) as any}
                    onCreateComponent={(name, sec) => handleCreateGlobalComponent(name, sec)}
                    onInsertInstance={(id, idx) => handleInsertComponentInstance(id, idx)}
                    onUpdateMaster={handleUpdateGlobalComponent}
                    onDetachInstance={(key) => handleDetachComponentInstance(key)}
                    onDeleteComponent={(id, force) => handleDeleteGlobalComponent(id, force)}
                    onClose={() => setIsLeftDrawerOpen(false)}
                  />
                )}

                {leftRailTab === "templates" && (
                  <StudioTemplateGalleryPanel
                    activePageKey={activePageKey}
                    onApplyPreset={handleApplyIndustryPreset}
                    onClose={() => setIsLeftDrawerOpen(false)}
                    templates={templates}
                    onSaveTemplate={handleSaveTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                    currentSections={activeSections}
                  />
                )}

                {leftRailTab === "media" && (
                  <StudioMediaLibraryPanel
                    onClose={() => setIsLeftDrawerOpen(false)}
                    onInsertImage={(img) => {
                      handleAddSection("image");
                      setTimeout(() => {
                        handleUpdateSectionField("src", img.url, deviceMode);
                        if (img.alt) handleUpdateSectionField("alt", img.alt, deviceMode);
                        if (img.webp) handleUpdateSectionField("webp", img.webp, deviceMode);
                        if (img.width) handleUpdateSectionField("width", img.width, deviceMode);
                        if (img.height) handleUpdateSectionField("height", img.height, deviceMode);
                      }, 50);
                    }}
                  />
                )}

                {leftRailTab === "themes" && (
                  <StudioThemeGalleryPanel
                    currentThemeId={(currentDesignTokens as any)?.themeId || themeId}
                    designTokens={currentDesignTokens}
                    onApplyTheme={handleApplyTheme}
                    onClose={() => setIsLeftDrawerOpen(false)}
                  />
                )}

                {leftRailTab === "variables" && (
                  <StudioVariablesPanel
                    variables={variables}
                    onChange={handleUpdateVariables}
                    onClose={() => setIsLeftDrawerOpen(false)}
                    readOnly={!canEdit}
                  />
                )}

              </div>
            </>
          )}

          {/* Center Live Stage */}
          <StorefrontThemeProvider
            asFragment
            initialTheme={previewTheme as unknown as StorefrontThemeInput}
            activePageKey={activePageKey}
          >
            <StudioCanvasStage
              deviceMode={deviceMode}
              zoomLevel={zoomLevel}
              direction={(previewTheme?.tokens as any)?.direction || "rtl"}
              showChrome={true}
              onSelectHeader={() => {
                setLeftRailTab("header-footer");
                setSelectedElement(null);
              }}
              onSelectFooter={() => {
                setLeftRailTab("header-footer");
                setSelectedElement(null);
              }}
              isHeaderSelected={leftRailTab === "header-footer"}
              isFooterSelected={leftRailTab === "header-footer"}
            >
              <div
                className="relative min-h-[800px] bg-background"
                onPointerDownCapture={(e) => {
                  if (e.pointerType === "mouse") return;
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-studio-drag-handle]")) return;
                  const handle = target.closest<HTMLElement>(
                    "button[title='اسحب لإعادة الترتيب']"
                  );
                  if (!handle) return;
                  const sectionWrapper = handle.closest<HTMLElement>(
                    "[data-studio-touch-section], [data-studio-sortable-section='true']"
                  );
                  if (!sectionWrapper) return;
                  const sectionKey =
                    sectionWrapper.getAttribute("data-studio-touch-section") ||
                    sectionWrapper.getAttribute("data-section-key");
                  const indexStr = sectionWrapper.getAttribute("data-studio-section-index");
                  const idx = typeof indexStr === "string" ? parseInt(indexStr, 10) : -1;
                  if (sectionKey && idx >= 0) {
                    handleTouchPointerDown(e, idx, sectionKey);
                  }
                }}
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
                    globalComponents={globalComponents}
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

                      const isBeingTouchDragged = isTouchDragging && activeTouchDragKey === stableKey;
                      const isDropTargetBefore =
                        isTouchDragging &&
                        touchDropTargetSlot === index &&
                        activeTouchDragIndex !== index;
                      const isDropTargetAfter =
                        isTouchDragging &&
                        touchDropTargetSlot === index + 1 &&
                        index === activeSections.length - 1 &&
                        activeTouchDragIndex !== index;

                      return (
                        <div
                          key={stableKey}
                          data-studio-touch-section={stableKey}
                          data-studio-section-index={index}
                          className="relative group/touch-section"
                          style={{
                            transform: isBeingTouchDragged ? `translateY(${touchDragOffsetY}px)` : undefined,
                            zIndex: isBeingTouchDragged ? 45 : undefined,
                            boxShadow: isBeingTouchDragged ? "0 10px 25px -5px rgba(43, 108, 246, 0.3)" : undefined,
                          }}
                        >
                          {/* Drop indicator before section */}
                          {isDropTargetBefore && (
                            <div
                              data-studio-drop-indicator="true"
                              data-studio-touch-drop-indicator="true"
                              className="h-1 bg-[#2b6cf6] rounded-full my-1 shadow-[0_0_8px_#2b6cf6] transition-all"
                            />
                          )}

                          {/* Touch drag handle on section: touch-action: none ONLY on this handle */}
                          <button
                            type="button"
                            data-studio-drag-handle="true"
                            data-testid="studio-drag-handle"
                            data-section-key={stableKey}
                            data-section-index={index}
                            tabIndex={0}
                            aria-label={`اسحب لإعادة ترتيب ${sectionLabel}`}
                            title="اسحب لإعادة الترتيب"
                            style={{ touchAction: "none" }}
                            className="touch-none absolute start-2 top-2 z-30 flex items-center justify-center p-1.5 rounded-md bg-[#17181c]/90 text-[#9ba0a8] hover:text-white hover:bg-[#202226] border border-[#33363c] shadow-md cursor-grab active:cursor-grabbing opacity-0 group-hover/touch-section:opacity-100 max-sm:opacity-85 focus-visible:opacity-100 transition-opacity"
                            onPointerDown={(e) => handleTouchPointerDown(e, index, stableKey)}
                          >
                            <GripDotsIcon className="h-3.5 w-3.5" />
                          </button>

                          <StudioSortableSection
                            key={stableKey}
                            id={stableKey}
                            index={index}
                            sectionKey={stableKey}
                            sectionLabel={sectionLabel}
                            sectionType={sectionType}
                            selected={isSelected || selectedSectionKeys.includes(stableKey)}
                            selectedSectionKeys={selectedSectionKeys}
                            totalSections={activeSections.length}
                            deviceMode={deviceMode}
                            showSpacingOverlay={showSpacingOverlay}
                            settings={sectionSettings}
                            hidden={isSectionHidden}
                            locked={isSectionLocked}
                            libraryDropSlot={libraryDropSlot}
                            selectedElement={selectedElement}
                            onSelect={(e) => {
                              handleSelectSection(stableKey, e);

                              setIsInspectorOpen(true);
                            }}
                            onToggleVisibility={() => handleToggleSectionVisibility(stableKey)}
                            onSelectElement={(el) => {
                              setSelectedSectionKey(stableKey);
                              setSelectedSectionKeys([stableKey]);

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
                            <StudioErrorBoundary
                              sectionKey={stableKey}
                              companyId={companyId}
                              pageKey={activePageKey}
                            >
                              {element}
                            </StudioErrorBoundary>
                          </StudioSortableSection>

                          {/* Drop indicator after last section */}
                          {isDropTargetAfter && (
                            <div
                              data-studio-drop-indicator="true"
                              data-studio-touch-drop-indicator="true"
                              className="h-1 bg-[#2b6cf6] rounded-full my-1 shadow-[0_0_8px_#2b6cf6] transition-all"
                            />
                          )}
                        </div>
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
              {/* CMT-1 — طبقة تعليقات الكانفس (محرر فقط، لا تُرندر في المتجر العام) */}
              <StudioCommentsLayer
                pageKey={activePageKey || "home"}
                sections={studioCommentTargets}
                comments={studioComments}
                canComment={canEdit}
                isActive={isCommentsMode}
                onToggleActive={setIsCommentsMode}
                onOpenPanel={() => setIsCommentsPanelOpen(true)}
                onAddComment={handleAddStudioComment}
              />
            </StudioCanvasStage>
          </StorefrontThemeProvider>

          {/* CMT-1 — بانل كل التعليقات (مفتوح/محلول) */}
          <StudioCommentsPanel
            isOpen={isCommentsPanelOpen}
            onClose={() => setIsCommentsPanelOpen(false)}
            comments={studioComments}
            activePageKey={activePageKey || "home"}
            pageSectionKeys={commentSectionKeysByPage}
            sectionLabels={commentSectionLabels}
            canEdit={canEdit}
            onResolve={(id) => handleSetStudioCommentResolved(id, true)}
            onReopen={(id) => handleSetStudioCommentResolved(id, false)}
            onDelete={handleDeleteStudioComment}
            onNavigate={handleNavigateToStudioComment}
          />

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
                  onResetPropertyOverride={(prop, dev) => handleResetPropertyOverride(prop, dev as any, selectedSectionKey)}
                  onOpenImagePicker={handleOpenImagePickerModal}
                  onSwitchDevice={setDeviceMode}
                  onSave={onSave}
                  companyId={companyId}
                  activePageKey={activePageKey}
                  sections={activeSections}
                  pageConfig={activePageConfig}
                  theme={currentDesignTokens}
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
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenOnboarding={() => setShowOnboardingModal(true)}
      />

      {/* Search & Replace Floating Panel */}
      <StudioSearchReplacePanel
        isOpen={showSearchReplacePanel}
        onClose={() => setShowSearchReplacePanel(false)}
        sections={activeSections}
        onUpdateSections={handleUpdateActiveSections}
        onNavigateToSection={(key) => {
          setSelectedSectionKey(key);
          setSelectedSectionKeys([key]);
        }}
      />

      {/* Floating Multi-Select Action Bar */}
      <StudioMultiSelectActionBar
        selectedCount={selectedSectionKeys.length}
        onHide={() => handleBulkToggleVisibility()}
        onLock={() => handleBulkToggleLock()}
        onDuplicate={() => handleBulkDuplicate()}
        onDelete={() => handleBulkDelete()}
        onAlign={(alignment) => handleBulkAlign(alignment)}
        onClear={() => setSelectedSectionKeys(selectedSectionKey ? [selectedSectionKey] : [])}
      />

      {/* Keyboard Shortcuts Palette Modal */}
      <StudioShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* First-Run Onboarding Tour Modal */}
      <StudioOnboarding
        isOpen={showOnboardingModal}
        serverOnboarded={serverOnboarded}
        onClose={() => setShowOnboardingModal(false)}
        onStartFromTemplate={() => {
          setShowOnboardingModal(false);
          setLeftRailTab("templates");
          setIsLeftDrawerOpen(true);
        }}
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
          if (imagePickerTargetField === "ogImage") {
            handleUpdatePageSettings({ seo: { ogImage: url } });
          } else if (imagePickerTargetField && imagePickerTargetField.includes(".")) {
            // Nested dot path (e.g. items.0.image, cards.1.src, hotspots.0.image)
            const parts = imagePickerTargetField.split(".");
            const rootKey = parts[0];
            const currentRoot = selectedSectionConfig?.settings?.[rootKey] ?? (selectedSectionConfig as any)?.[rootKey];

            if (Array.isArray(currentRoot)) {
              const nextArray = currentRoot.map((item: any, idx: number) => {
                if (idx !== parseInt(parts[1], 10)) return item;
                if (typeof item === "string" && parts.length === 2) {
                  return url;
                }
                const subProp = parts.slice(2).join(".") || "image";
                return typeof item === "object" && item !== null
                  ? { ...item, [subProp]: url }
                  : { image: url };
              });
              handleUpdateSectionField(rootKey, nextArray, deviceMode);
            } else if (typeof currentRoot === "object" && currentRoot !== null) {
              const subProp = parts.slice(1).join(".");
              const nextObj = { ...currentRoot, [subProp]: url };
              handleUpdateSectionField(rootKey, nextObj, deviceMode);
            } else {
              handleUpdateSectionField(imagePickerTargetField, url, deviceMode);
            }
          } else if (
            imagePickerTargetField &&
            imagePickerTargetField !== "image" &&
            imagePickerTargetField !== "backgroundImage"
          ) {
            // Specific field (e.g. beforeImage, afterImage, poster, src, fallbackImage, panelImage)
            handleUpdateSectionField(imagePickerTargetField, url, deviceMode);
          } else {
            // Generic fallback
            handleUpdateSectionField("image", url, deviceMode);
            handleUpdateSectionField("backgroundImage", url, deviceMode);
          }
          setShowImagePickerModal(false);
        }}
        selectedUrl={(() => {
          if (imagePickerTargetField === "ogImage") {
            return activePageConfig?.seo?.ogImage || "";
          }
          if (imagePickerTargetField && imagePickerTargetField.includes(".")) {
            const parts = imagePickerTargetField.split(".");
            const root = selectedSectionConfig?.settings?.[parts[0]] ?? (selectedSectionConfig as any)?.[parts[0]];
            if (Array.isArray(root)) {
              const idx = parseInt(parts[1], 10);
              const item = root[idx];
              if (typeof item === "string") return item;
              if (item && typeof item === "object") {
                const subProp = parts.slice(2).join(".") || "image";
                return item[subProp] || "";
              }
            }
            return "";
          }
          if (
            imagePickerTargetField &&
            imagePickerTargetField !== "image" &&
            imagePickerTargetField !== "backgroundImage"
          ) {
            return (
              selectedSectionConfig?.settings?.[imagePickerTargetField] ||
              (selectedSectionConfig as any)?.[imagePickerTargetField] ||
              ""
            );
          }
          return (
            selectedSectionConfig?.settings?.image ||
            selectedSectionConfig?.image ||
            selectedSectionConfig?.settings?.backgroundImage ||
            selectedSectionConfig?.backgroundImage ||
            ""
          );
        })()}
      />

      <StudioPageSettingsPanel
        isOpen={isPageSettingsOpen}
        onClose={() => setIsPageSettingsOpen(false)}
        pageKey={activePageKey}
        pageTitle={activePageConfig?.title || activePageConfig?.label || activePageKey}
        storeName={storeName}
        seo={activePageConfig?.seo}
        status={(activePageConfig?.status as StorefrontPageStatus) || "published"}
        sections={activeSections}
        availablePages={Object.keys(((currentDesignTokens as any)?.pages as Record<string, any>) || {}).concat(STUDIO_PAGES.map((p) => p.id))}
        onUpdateSeo={(newSeo) => handleUpdatePageSettings({ seo: newSeo })}
        onUpdateStatus={(newStatus) => handleUpdatePageSettings({ status: newStatus })}
        onOpenImagePicker={() => {
          setImagePickerTargetField("ogImage");
          setShowImagePickerModal(true);
        }}
        onSelectSection={(sectionKey) => {
          handleSelectSection(sectionKey);
          setIsInspectorOpen(true);
        }}
      />

      <StudioHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        companyId={companyId}
        steps={historySteps}
        currentStepIndex={currentHistoryStepIndex}
        onJumpToStep={jumpToHistoryStep}
        onRestoreSuccess={(restoredSettings) => {
          if (restoredSettings.designTokens) {
            onChange(restoredSettings.designTokens as Record<string, unknown>);
          }
          if (onReload) {
            void onReload();
          }
        }}
      />

      <StudioExportImportModal
        isOpen={isExportImportModalOpen}
        onClose={() => setIsExportImportModalOpen(false)}
        activePageKey={activePageKey}
        currentSections={activeSections}
        currentStyles={activePageStyle}
        designTokens={currentDesignTokens}
        theme={previewTheme}
        onApplyImport={(data) => {
          importPage(data, true);
        }}
        onApplyThemeImport={handleApplyImportedTheme}
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
