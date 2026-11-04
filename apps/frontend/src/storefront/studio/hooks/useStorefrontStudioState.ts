import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { useStudioHistory } from "./useStudioHistory";
import { STUDIO_HISTORY_MAX_STEPS } from "../utils/studioHistoryTimeline";
import { STOREFRONT_THEME_PRESETS } from "../../themes";
import { resolveStorefrontTheme } from "../../engine/themeResolver";
import { useCartStore } from "../../store/useCartStore";
import { getMarketplacePreviewCartItems } from "../../preview/marketplacePreviewCart";
import { isStorefrontSectionKnown } from "../../sections/manifest";
import type {
  StudioDeviceMode,
  PageStyleScope,
  PageStylesMap,
  SavedStudioSection,
  StudioGlobalComponent,
  ThemeBuilderTemplate,
  StudioExportedPageData,
  StudioImportResult,
  StudioPrePublishSnapshot,
} from "../StudioTypes";
import {
  exportPage as exportPageHelper,
  importPage as importPageHelper,
  downloadJSON,
} from "../utils/studioPageExportImport";
import {
  createGlobalComponent,
  detachComponentInstance,
  validateComponentHierarchy,
} from "../utils/resolveComponentInstance";
import { PAGE_STYLE_PRESETS, STUDIO_PAGES } from "../StudioTypes";
import {
  applyStudioVariablesToTokens,
  getStudioVariablesFromTokens,
  type StudioVariableValues,
} from "../utils/studioVariables";
import type {
  StorefrontGlobalTokens,
  StorefrontGlobalHeaderConfig,
  StorefrontGlobalFooterConfig,
} from "../StudioHeaderFooterPanel";
import {
  findNodeByKey,
  findNodeAndParent,
  updateNodeInTree,
  removeNodeFromTree,
  insertNodeInTree,
  moveNodeInTree,
  reorderNodeChildren,
  getAllSectionKeys,
} from "../../engine/tree/treeUtils";
import { RESPONSIVE_STYLE_FIELDS } from "../utils/studioStyleUtils";

export const CONTAINER_RESPONSIVE_FIELDS = new Set<string>([
  "direction",
  "columns",
  "gap",
  "align",
  "wrap",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
]);

const STUDIO_STARTER_SETTINGS: Record<string, Record<string, any>> = {
  "hero-banner": {
    title: "مرحبًا بكم في متجرنا",
    subtitle: "اكتشف أحدث التشكيلات والعروض الحصرية بأفضل الأسعار وبجودة مضمونة.",
    ctaText: "تسوق الآن",
    ctaLink: "/shop",
  },
  richtext: {
    title: "عنوان القسم",
    content: "أضف هنا نصوصك التعريفية وتفاصيل مميزات متجرك لعملائك الكرام.",
  },
  "info-content": {
    title: "عن متجرنا",
    body: "نقدم لك تجربة تسوق استثنائية مع تشكيلات مختارة بعناية لتناسب كل الأذواق.",
    badge: "قصتنا",
  },
  "featured-products": {
    title: "المنتجات المميزة",
    subtitle: "مختارات حصرية من أفضل منتجاتنا لهذا الموسم",
  },
  "product-grid": {
    title: "جميع المنتجات",
    subtitle: "تصفح أحدث ما وصلنا واستمتع بأقوى العروض",
  },
  "promo-strip": {
    badge: "عرض خاص",
    message: "خصومات موسمية مميزة وشحن سريع لجميع المحافظات",
    saleLabel: "خصم يصل إلى 30%",
    shippingLabel: "شحن مجاني للطلبات الكبيرة",
    ctaText: "تصفح العروض",
    ctaLink: "/shop",
  },
  "countdown-banner": {
    title: "عروض لفترة محدودة",
    subtitle: "لا تفوت فرصة الاستفادة من الخصومات قبل انتهاء المؤقت",
    ctaText: "اغتنم العرض",
    ctaLink: "/shop",
  },
  reviews: {
    title: "آراء وتجارب العملاء",
    subtitle: "ثقة أكثر من 10,000 عميل سعيد بخدماتنا ومنتجاتنا",
  },
  "features-bar": {
    title: "مميزات التسوق معنا",
  },
  newsletter: {
    title: "انضم إلى نشرتنا البريدية",
    subtitle: "كن أول من يعلم بالعروض والمنتجات الحصرية فور نزولها",
    buttonText: "اشترك الآن",
  },
  container: {
    direction: "column",
    gap: 12,
    columns: 1,
  },
  loop: {
    source: "products",
    limit: 6,
    columns: 3,
    emptyMessage: "لا توجد عناصر لعرضها في هذا التكرار",
    template: [
      {
        type: "heading",
        settings: {
          text: "{{product.title}}",
          level: "h3",
        },
      },
      {
        type: "text",
        settings: {
          content: "السعر: {{product.priceFormatted}}",
          size: "sm",
        },
      },
    ],
  },
  video: {
    url: "",
    poster: "",
    ratio: "16:9",
    autoplay: false,
    controls: true,
    loop: false,
    muted: false,
  },
  marquee: {
    text: "توصيل سريع لجميع المحافظات • دفع عند الاستلام • استرجاع مجاني خلال 14 يوم • دعم فني متواصل 24/7",
    speed: 30,
    direction: "left",
    pauseOnHover: true,
  },
  lottie: {
    url: "",
    autoplay: true,
    loop: true,
    ratio: "1:1",
  },
};

interface UseStorefrontStudioStateProps {
  themeId: string;
  externalDesignTokens: Record<string, unknown>;
  onChange: (nextTokens: Record<string, unknown>) => void;
  onSave: () => void;
}

export const getSectionKey = (section: any, index: number): string => {
  if (typeof section === "string") return `${section}-${index}`;
  return section?.key || `${section?.type || "section"}-${index}`;
};

export function useStorefrontStudioState(props: UseStorefrontStudioStateProps & { designTokens?: Record<string, unknown> }) {
  const {
    themeId,
    onChange,
    onSave,
  } = props;
  const externalDesignTokens = props.externalDesignTokens || props.designTokens || {};
  const [activePageKey, setActivePageKeyInternal] = useState<string>("home");
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>("");
  const [selectedSectionKeys, setSelectedSectionKeys] = useState<string[]>([]);

  // Seed cart items for preview
  useEffect(() => {
    const currentItems = useCartStore.getState().items;
    if (currentItems.length > 0) return;
    const previewItems = getMarketplacePreviewCartItems(themeId);
    if (previewItems && previewItems.length > 0) {
      useCartStore.setState({ items: previewItems, isOpen: false });
    }
  }, [themeId]);

  // History State
  const {
    state: currentDesignTokens,
    set: setDesignTokensWithHistory,
    undo: rawUndo,
    redo: rawRedo,
    canUndo,
    canRedo,
    steps: historySteps,
    currentStepIndex: currentHistoryStepIndex,
    jumpToStep: rawJumpToHistoryStep,
  } = useStudioHistory<Record<string, unknown>>(externalDesignTokens, {
    maxSteps: STUDIO_HISTORY_MAX_STEPS,
    onChange,
  });

  const currentDesignTokensRef = useRef(currentDesignTokens);
  currentDesignTokensRef.current = currentDesignTokens;

  const handleDesignTokensChange = useCallback(
    (next: Record<string, unknown>) => {
      currentDesignTokensRef.current = next;
      setDesignTokensWithHistory(next);
    },
    [setDesignTokensWithHistory]
  );

  const handleUndo = useCallback(() => {
    const prev = rawUndo();
    if (prev !== undefined) {
      currentDesignTokensRef.current = prev;
      onSave();
    }
    return prev;
  }, [rawUndo, onSave]);

  const handleRedo = useCallback(() => {
    const next = rawRedo();
    if (next !== undefined) {
      currentDesignTokensRef.current = next;
      onSave();
    }
    return next;
  }, [rawRedo, onSave]);

  // UNDO-1: jump straight to a recorded step (same persistence semantics as undo/redo).
  const handleJumpToHistoryStep = useCallback(
    (stepId: number) => {
      const target = rawJumpToHistoryStep(stepId);
      if (target !== undefined) {
        currentDesignTokensRef.current = target;
        onSave();
      }
      return target;
    },
    [rawJumpToHistoryStep, onSave]
  );

  // Keyboard Shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          onSave();
        } else if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          if (e.shiftKey) {
            if (canRedo) handleRedo();
          } else {
            if (canUndo) handleUndo();
          }
        } else if (e.key === "y" || e.key === "Y") {
          e.preventDefault();
          if (canRedo) handleRedo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, handleUndo, handleRedo, canUndo, canRedo]);

  const previewTheme = useMemo(() => {
    const baseTheme = STOREFRONT_THEME_PRESETS[themeId] || STOREFRONT_THEME_PRESETS["modern-minimal"];
    const resolved = resolveStorefrontTheme({
      themeId,
      theme: baseTheme,
      designTokens: currentDesignTokens,
      activePageKey,
    });
    // Ensure global tokens and designTokens are accessible on resolved previewTheme
    (resolved as any).global = currentDesignTokens?.global;
    (resolved as any).designTokens = currentDesignTokens;
    return resolved;
  }, [themeId, currentDesignTokens, activePageKey]);

  const globalTokens = useMemo<StorefrontGlobalTokens>(() => {
    return (currentDesignTokens?.global as StorefrontGlobalTokens) || {};
  }, [currentDesignTokens]);

  const handleUpdateGlobalHeader = useCallback(
    (partial: Partial<StorefrontGlobalHeaderConfig>) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentGlobal = (currentTokens.global as StorefrontGlobalTokens) || {};
      const currentHeader = currentGlobal.header || { menu: [] };
      const nextHeader: StorefrontGlobalHeaderConfig = {
        ...currentHeader,
        ...partial,
      };
      const nextTokens = {
        ...currentTokens,
        global: {
          ...currentGlobal,
          header: nextHeader,
        },
      };
      handleDesignTokensChange(nextTokens);
    },
    [handleDesignTokensChange]
  );

  const handleUpdateGlobalFooter = useCallback(
    (partial: Partial<StorefrontGlobalFooterConfig>) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentGlobal = (currentTokens.global as StorefrontGlobalTokens) || {};
      const currentFooter = currentGlobal.footer || { columns: [], social: [] };
      const nextFooter: StorefrontGlobalFooterConfig = {
        ...currentFooter,
        ...partial,
      };
      const nextTokens = {
        ...currentTokens,
        global: {
          ...currentGlobal,
          footer: nextFooter,
        },
      };
      handleDesignTokensChange(nextTokens);
    },
    [handleDesignTokensChange]
  );

  const handleUpdateGlobalTokens = useCallback(
    (nextGlobal: StorefrontGlobalTokens) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const nextTokens = {
        ...currentTokens,
        global: nextGlobal,
      };
      handleDesignTokensChange(nextTokens);
    },
    [handleDesignTokensChange]
  );

  // ─────────────────────────────────────────────────────────────
  // TOKENS-1: editable design variables (--sf-*), stored as design-token overrides.
  // ─────────────────────────────────────────────────────────────
  const variables = useMemo<StudioVariableValues>(
    () => getStudioVariablesFromTokens(currentDesignTokens),
    [currentDesignTokens]
  );

  const handleUpdateVariables = useCallback(
    (nextVariables: StudioVariableValues) => {
      const currentTokens = currentDesignTokensRef.current || {};
      handleDesignTokensChange(applyStudioVariablesToTokens(currentTokens, nextVariables));
    },
    [handleDesignTokensChange]
  );

  const activePageStyle = useMemo<PageStyleScope | undefined>(() => {
    const styles = currentDesignTokens?.pageStyles as PageStylesMap | undefined;
    return styles?.[activePageKey];
  }, [currentDesignTokens, activePageKey]);

  const handleApplyPageStylePreset = useCallback(
    (presetId: string) => {
      const preset = PAGE_STYLE_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      const currentTokens = currentDesignTokensRef.current || {};
      const existingPageStyles = (currentTokens.pageStyles as PageStylesMap) || {};
      const nextStyles: PageStylesMap = {
        ...existingPageStyles,
        [activePageKey]: {
          preset: preset.id,
          accent: preset.accent,
          fontFamily: preset.fontFamily,
          density: preset.density,
          radius: preset.radius,
        },
      };
      const nextTokens = {
        ...currentTokens,
        pageStyles: nextStyles,
      };
      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success(`تم تطبيق طابع «${preset.label}» على صفحة ${activePageKey}`);
    },
    [activePageKey, handleDesignTokensChange, onSave]
  );

  const handleUpdatePageStyle = useCallback(
    (partial: Partial<PageStyleScope>) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const existingPageStyles = (currentTokens.pageStyles as PageStylesMap) || {};
      const currentForPage = existingPageStyles[activePageKey] || {};
      const nextStyles: PageStylesMap = {
        ...existingPageStyles,
        [activePageKey]: {
          ...currentForPage,
          ...partial,
        },
      };
      const nextTokens = {
        ...currentTokens,
        pageStyles: nextStyles,
      };
      handleDesignTokensChange(nextTokens);
    },
    [activePageKey, handleDesignTokensChange]
  );

  const handleResetPageStyle = useCallback(() => {
    const currentTokens = currentDesignTokensRef.current || {};
    const existingPageStyles = (currentTokens.pageStyles as PageStylesMap) || {};
    if (!existingPageStyles[activePageKey]) return;
    const nextStyles = { ...existingPageStyles };
    delete nextStyles[activePageKey];
    const nextTokens = {
      ...currentTokens,
      pageStyles: nextStyles,
    };
    handleDesignTokensChange(nextTokens);
    onSave();
    toast.info(`تمت استعادة الطابع الافتراضي لصفحة ${activePageKey}`);
  }, [activePageKey, handleDesignTokensChange, onSave]);

  const setActivePageKey = useCallback(
    (pageKey: string) => {
      const existsInTheme = Boolean(previewTheme.pages && previewTheme.pages[pageKey]);
      const existsInTokens = Boolean(
        (currentDesignTokensRef.current?.pages as any)?.[pageKey] ||
        (currentDesignTokensRef.current?.pageOverrides as any)?.[pageKey]
      );
      if (!existsInTheme && !existsInTokens) {
        toast.error(`الصفحة "${pageKey}" غير متوفرة في هذا الثيم`);
        return;
      }
      setActivePageKeyInternal(pageKey);
      setSelectedSectionKey("");
    },
    [previewTheme]
  );

  const activePageConfig = useMemo(() => {
    const page = previewTheme.pages?.[activePageKey];
    const fromPages = (currentDesignTokens?.pages as Record<string, any>)?.[activePageKey];
    const fromOverrides = (currentDesignTokens?.pageOverrides as Record<string, any>)?.[activePageKey];

    const themeSecs = Array.isArray(page?.sections) ? page.sections : [];
    const userSections =
      Array.isArray(fromOverrides?.sections)
        ? fromOverrides.sections
        : Array.isArray(fromPages?.sections)
        ? fromPages.sections
        : null;

    return {
      ...(page || {}),
      ...(fromPages || {}),
      ...(fromOverrides || {}),
      sections: userSections !== null ? userSections : themeSecs,
    };
  }, [previewTheme, activePageKey, currentDesignTokens]);

  const activeSections = useMemo(() => {
    return activePageConfig.sections || [];
  }, [activePageConfig]);

  const sectionKeys = useMemo(() => {
    return activeSections.map((s: any, idx: number) => getSectionKey(s, idx));
  }, [activeSections]);

  // Auto-select first section
  useEffect(() => {
    if (activeSections.length > 0 && !selectedSectionKey) {
      const firstKey = getSectionKey(activeSections[0], 0);
      setSelectedSectionKey(firstKey);
      setSelectedSectionKeys([firstKey]);
    }
  }, [activeSections, selectedSectionKey]);

  const selectedSectionConfig = useMemo(() => {
    if (!selectedSectionKey) return null;
    return (
      activeSections.find((s: any, idx: number) => getSectionKey(s, idx) === selectedSectionKey) ||
      null
    );
  }, [activeSections, selectedSectionKey]);

  // Handle Drag End with @dnd-kit arrayMove
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sectionKeys.indexOf(String(active.id));
    const newIndex = sectionKeys.indexOf(String(over.id));

    if (oldIndex !== -1 && newIndex !== -1) {
      const activeSection = activeSections[oldIndex];
      const isLocked = Boolean(
        typeof activeSection === "object" &&
          activeSection !== null &&
          (activeSection.locked || activeSection.settings?.locked)
      );
      if (isLocked) {
        toast.info("هذا القسم مقفل. لا يمكن إعادة ترتيبه وهو في وضع القفل.");
        return;
      }

      const normalizedSections = activeSections.map((s: any, idx: number) => {
        const key = getSectionKey(s, idx);
        return typeof s === "string" ? { type: s, key } : { ...s, key: s.key || key };
      });
      const nextSections = arrayMove(normalizedSections, oldIndex, newIndex);
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
      onSave();
    }
  };

  const handleMoveSection = useCallback(
    (index: number, direction: "up" | "down", parentKey?: string) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const nextSections = reorderNodeChildren(
        activeSections,
        parentKey || null,
        index,
        targetIndex
      );

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
    },
    [activeSections, currentDesignTokens, activePageKey, activePageConfig, handleDesignTokensChange]
  );

  const handleMoveSectionToContainer = useCallback(
    (sourceKey: string, targetContainerKey: string | null, targetIndex?: number) => {
      const nextSections = moveNodeInTree(
        activeSections,
        sourceKey,
        targetContainerKey,
        targetIndex
      );

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
    },
    [activeSections, currentDesignTokens, activePageKey, activePageConfig, handleDesignTokensChange]
  );

  const handleDuplicateSection = (index: number, parentKey?: string) => {
    const found = parentKey
      ? findNodeByKey(activeSections, parentKey)?.children?.[index]
      : activeSections[index];
    if (!found) return;

    const cloned = JSON.parse(JSON.stringify(found));
    cloned.key = `${cloned.type || "section"}-${Date.now()}`;
    if (cloned.children && Array.isArray(cloned.children)) {
      const regenKeys = (children: any[]) => {
        children.forEach((c: any, i: number) => {
          c.key = `${c.type || "section"}-${Date.now()}-${i}`;
          if (c.children) regenKeys(c.children);
        });
      };
      regenKeys(cloned.children);
    }

    const nextSections = insertNodeInTree(
      activeSections,
      parentKey || null,
      cloned,
      index + 1
    );

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
  };

  const handleDeleteSection = (keyToDelete: string) => {
    const nextSections = activeSections.filter(
      (s: any, idx: number) => getSectionKey(s, idx) !== keyToDelete
    );

    if (selectedSectionKey === keyToDelete) {
      setSelectedSectionKey(nextSections[0] ? getSectionKey(nextSections[0], 0) : "");
    }

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
  };

  const toggleSectionSelection = useCallback(
    (key: string, options?: { multi?: boolean; range?: boolean }) => {
      if (options?.multi) {
        setSelectedSectionKeys((prev) => {
          const exists = prev.includes(key);
          const next = exists ? prev.filter((k) => k !== key) : [...prev, key];
          if (next.length > 0) {
            setSelectedSectionKey(next[next.length - 1]!);
          } else {
            setSelectedSectionKey("");
          }
          return next;
        });
      } else if (options?.range && selectedSectionKey) {
        const fromIdx = sectionKeys.indexOf(selectedSectionKey);
        const toIdx = sectionKeys.indexOf(key);
        if (fromIdx !== -1 && toIdx !== -1) {
          const start = Math.min(fromIdx, toIdx);
          const end = Math.max(fromIdx, toIdx);
          const ranged = sectionKeys.slice(start, end + 1);
          setSelectedSectionKeys(ranged);
          setSelectedSectionKey(key);
          return;
        }
        setSelectedSectionKey(key);
        setSelectedSectionKeys([key]);
      } else {
        setSelectedSectionKey(key);
        setSelectedSectionKeys([key]);
      }
    },
    [selectedSectionKey, sectionKeys]
  );

  const handleBulkDelete = useCallback(
    (keysToDelete?: string[]) => {
      const targetList = keysToDelete && keysToDelete.length > 0 ? keysToDelete : selectedSectionKeys;
      const targets = new Set(targetList);
      if (targets.size === 0) return;

      const nextSections = activeSections.filter(
        (s: any, idx: number) => !targets.has(getSectionKey(s, idx))
      );

      const remainingFirst = nextSections[0] ? getSectionKey(nextSections[0], 0) : "";
      setSelectedSectionKey(remainingFirst);
      setSelectedSectionKeys(remainingFirst ? [remainingFirst] : []);

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
    },
    [
      selectedSectionKeys,
      activeSections,
      activePageKey,
      activePageConfig,
      currentDesignTokens,
      handleDesignTokensChange,
    ]
  );

  const handleBulkToggleVisibility = useCallback(
    (keysToToggle?: string[]) => {
      const targetList = keysToToggle && keysToToggle.length > 0 ? keysToToggle : selectedSectionKeys;
      const targets = new Set(targetList);
      if (targets.size === 0) return;

      const nextSections = activeSections.map((s: any, idx: number) => {
        const key = getSectionKey(s, idx);
        if (!targets.has(key)) return s;
        const secObj = typeof s === "string" ? { type: s } : { ...s };
        const currentHidden = Boolean(secObj.hidden ?? secObj.settings?.hidden);
        const nextHidden = !currentHidden;
        return {
          ...secObj,
          hidden: nextHidden,
          settings: {
            ...(secObj.settings || {}),
            hidden: nextHidden,
          },
        };
      });

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
    },
    [
      selectedSectionKeys,
      activeSections,
      activePageKey,
      activePageConfig,
      currentDesignTokens,
      handleDesignTokensChange,
    ]
  );

  const handleBulkToggleLock = useCallback(
    (keysToToggle?: string[]) => {
      const targetList = keysToToggle && keysToToggle.length > 0 ? keysToToggle : selectedSectionKeys;
      const targets = new Set(targetList);
      if (targets.size === 0) return;

      const nextSections = activeSections.map((s: any, idx: number) => {
        const key = getSectionKey(s, idx);
        if (!targets.has(key)) return s;
        const secObj = typeof s === "string" ? { type: s } : { ...s };
        const currentLocked = Boolean(secObj.locked ?? secObj.settings?.locked);
        const nextLocked = !currentLocked;
        return {
          ...secObj,
          locked: nextLocked,
          settings: {
            ...(secObj.settings || {}),
            locked: nextLocked,
          },
        };
      });

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
    },
    [
      selectedSectionKeys,
      activeSections,
      activePageKey,
      activePageConfig,
      currentDesignTokens,
      handleDesignTokensChange,
    ]
  );

  const handleBulkDuplicate = useCallback(
    (keysToDuplicate?: string[]) => {
      const targetList =
        keysToDuplicate && keysToDuplicate.length > 0 ? keysToDuplicate : selectedSectionKeys;
      const targets = new Set(targetList);
      if (targets.size === 0) return;

      const nextSections: any[] = [];
      const newKeys: string[] = [];

      activeSections.forEach((s: any, idx: number) => {
        nextSections.push(s);
        const key = getSectionKey(s, idx);
        if (targets.has(key)) {
          const secObj = typeof s === "string" ? { type: s } : JSON.parse(JSON.stringify(s));
          const dupKey = `${secObj.type || "section"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const cloned = {
            ...secObj,
            key: dupKey,
            settings: {
              ...(secObj.settings || {}),
              title: secObj.settings?.title ? `${secObj.settings.title} (نسخة)` : undefined,
            },
          };
          nextSections.push(cloned);
          newKeys.push(dupKey);
        }
      });

      if (newKeys.length > 0) {
        setSelectedSectionKeys(newKeys);
        setSelectedSectionKey(newKeys[0]!);
      }

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
    },
    [
      selectedSectionKeys,
      activeSections,
      activePageKey,
      activePageConfig,
      currentDesignTokens,
      handleDesignTokensChange,
    ]
  );

  const handleBulkAlign = useCallback(
    (alignment: "left" | "center" | "right", keysToAlign?: string[]) => {
      const targetList = keysToAlign && keysToAlign.length > 0 ? keysToAlign : selectedSectionKeys;
      const targets = new Set(targetList);
      if (targets.size === 0) return;

      const nextSections = activeSections.map((s: any, idx: number) => {
        const key = getSectionKey(s, idx);
        if (!targets.has(key)) return s;
        const secObj = typeof s === "string" ? { type: s } : { ...s };
        return {
          ...secObj,
          settings: {
            ...(secObj.settings || {}),
            alignment,
            textAlign: alignment,
          },
        };
      });

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
    },
    [
      selectedSectionKeys,
      activeSections,
      activePageKey,
      activePageConfig,
      currentDesignTokens,
      handleDesignTokensChange,
    ]
  );

  const handleUpdateActiveSections = useCallback(
    (nextSections: any[], actionLabel?: string) => {
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
      if (actionLabel) {
        toast.success(actionLabel);
      }
    },
    [currentDesignTokens, activePageKey, activePageConfig, handleDesignTokensChange]
  );

  const handleAddSection = (
    sectionType: string,
    initialSettingsOrIndex?: Record<string, unknown> | number,
    insertAtIndexOrContainerKey?: number | string
  ) => {
    if (!isStorefrontSectionKnown(sectionType)) {
      toast.error(`نوع القسم "${sectionType}" غير مدعوم في المتجر`);
      return;
    }

    const isInitialSettingsObject =
      typeof initialSettingsOrIndex === "object" && initialSettingsOrIndex !== null;
    const initialSettings = isInitialSettingsObject
      ? (initialSettingsOrIndex as Record<string, unknown>)
      : undefined;

    const actualInsertIndex =
      typeof initialSettingsOrIndex === "number"
        ? initialSettingsOrIndex
        : typeof insertAtIndexOrContainerKey === "number"
          ? insertAtIndexOrContainerKey
          : undefined;

    const targetContainerKey =
      typeof insertAtIndexOrContainerKey === "string"
        ? insertAtIndexOrContainerKey
        : undefined;

    const newKey = `${sectionType}-${Date.now()}`;
    const starterSettings = STUDIO_STARTER_SETTINGS[sectionType] || {};
    const baseSections = activeSections;

    const mergedSettings = {
      ...starterSettings,
      ...(initialSettings || {}),
    };

    const newSection: any = {
      type: sectionType,
      key: newKey,
      settings: mergedSettings,
      config: initialSettings ? { ...(initialSettings || {}) } : undefined,
    };

    let nextSections: any[];
    if (targetContainerKey) {
      nextSections = baseSections.map((sec: any) => {
        if (sec.key === targetContainerKey) {
          const children = Array.isArray(sec.children) ? [...sec.children, newSection] : [newSection];
          return { ...sec, children };
        }
        return sec;
      });
    } else if (
      typeof actualInsertIndex === "number" &&
      actualInsertIndex >= 0 &&
      actualInsertIndex <= baseSections.length
    ) {
      nextSections = [...baseSections];
      nextSections.splice(actualInsertIndex, 0, newSection);
    } else {
      nextSections = [...baseSections, newSection];
    }

    const nextPages = {
      ...((currentDesignTokens?.pages as Record<string, unknown>) || {}),
      ...((currentDesignTokens?.pageOverrides as Record<string, unknown>) || {}),
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

  const activeSectionsRef = useRef(activeSections);
  activeSectionsRef.current = activeSections;

  const activePageConfigRef = useRef(activePageConfig);
  activePageConfigRef.current = activePageConfig;

  const activePageKeyRef = useRef(activePageKey);
  activePageKeyRef.current = activePageKey;

  const handleBatchUpdateSectionFields = useCallback(
    (updates: Record<string, any>, targetSectionKey?: string, device: StudioDeviceMode = "desktop") => {
      const sectionKeyToUpdate = targetSectionKey || selectedSectionKey;
      if (!sectionKeyToUpdate) return;

      const currentTokens = currentDesignTokensRef.current;
      const currentSections = activeSectionsRef.current;
      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;

      const updateSectionNodeRecursive = (items: any[]): any[] => {
        return items.map((s: any, idx: number) => {
          const key = getSectionKey(s, idx);
          if (key === sectionKeyToUpdate) {
            const base = typeof s === "string" ? { type: s } : { ...s };
            const baseSettings =
              typeof base.settings === "object" && base.settings !== null ? { ...base.settings } : {};
            const baseConfig =
              typeof base.config === "object" && base.config !== null ? { ...base.config } : {};

            if (device === "mobile" || device === "tablet") {
              const existingResponsive = {
                ...(baseSettings.responsive || base.responsive || baseConfig.responsive || {}),
              };
              const existingDeviceOverrides = {
                ...(existingResponsive[device] || {}),
              };

              Object.entries(updates).forEach(([field, value]) => {
                if (field === "responsive" && typeof value === "object" && value !== null) {
                  Object.assign(existingResponsive, value);
                } else if (RESPONSIVE_STYLE_FIELDS.has(field) || CONTAINER_RESPONSIVE_FIELDS.has(field)) {
                  if (value === undefined || value === null || value === "") {
                    delete existingDeviceOverrides[field];
                  } else {
                    existingDeviceOverrides[field] = value;
                  }
                } else {
                  baseSettings[field] = value;
                  base[field] = value;
                  baseConfig[field] = value;
                }
              });

              const nextResponsive = {
                ...existingResponsive,
                [device]: existingDeviceOverrides,
              };

              baseSettings.responsive = nextResponsive;
              base.responsive = nextResponsive;
              baseConfig.responsive = nextResponsive;
            } else {
              Object.entries(updates).forEach(([field, value]) => {
                baseSettings[field] = value;
                base[field] = value;
                baseConfig[field] = value;
              });

              if (baseSettings.responsive) {
                baseConfig.responsive = baseSettings.responsive;
              }
            }

            base.settings = baseSettings;
            base.config = baseConfig;

            return {
              ...base,
              settings: baseSettings,
              config: baseConfig,
              ...(Array.isArray(s.children) ? { children: s.children } : {}),
            };
          }

          if (s && typeof s === "object" && Array.isArray(s.children) && s.children.length > 0) {
            return {
              ...s,
              children: updateSectionNodeRecursive(s.children),
            };
          }

          return s;
        });
      };

      const nextSections = updateSectionNodeRecursive(currentSections);

      activeSectionsRef.current = nextSections;

      const nextPages = {
        ...((currentTokens?.pages as Record<string, unknown>) || {}),
        ...((currentTokens?.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      const nextTokens = {
        ...currentTokens,
        themeId,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
    },
    [selectedSectionKey, themeId, handleDesignTokensChange]
  );

  const handleResetDeviceOverrides = useCallback(
    (sectionKey: string, device: "mobile" | "tablet" = "mobile") => {
      const currentSections = activeSectionsRef.current;

      const resetRecursive = (items: any[]): any[] => {
        return items.map((s: any, idx: number) => {
          const key = getSectionKey(s, idx);
          if (key === sectionKey) {
            const base = typeof s === "string" ? { type: s } : { ...s };
            const baseSettings =
              typeof base.settings === "object" && base.settings !== null ? { ...base.settings } : {};

            const responsive = {
              ...(baseSettings.responsive || base.responsive || base.config?.responsive || {}),
            };

            if (responsive[device]) {
              delete responsive[device];
            }

            baseSettings.responsive = responsive;
            base.responsive = responsive;
            const baseConfig =
              typeof base.config === "object" && base.config !== null ? { ...base.config } : {};
            baseConfig.responsive = responsive;
            base.config = baseConfig;

            return {
              ...base,
              settings: baseSettings,
              config: baseConfig,
              ...(Array.isArray(s.children) ? { children: s.children } : {}),
            };
          }

          if (s && typeof s === "object" && Array.isArray(s.children) && s.children.length > 0) {
            return {
              ...s,
              children: resetRecursive(s.children),
            };
          }

          return s;
        });
      };

      const nextSections = resetRecursive(currentSections);
      activeSectionsRef.current = nextSections;

      const currentTokens = currentDesignTokensRef.current;
      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;

      const nextPages = {
        ...((currentTokens?.pages as Record<string, unknown>) || {}),
        ...((currentTokens?.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      const nextTokens = {
        ...currentTokens,
        themeId,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success(
        `تم تصفير تخصيصات ${device === "mobile" ? "الجوال" : "التابلت"} والعودة للوراثة من سطح المكتب`
      );
    },
    [themeId, handleDesignTokensChange, onSave]
  );

  const handleResetPropertyOverride = useCallback(
    (property: string, device: "mobile" | "tablet" = "mobile", targetSectionKey?: string) => {
      const sectionKeyToUpdate = targetSectionKey || selectedSectionKey;
      if (!sectionKeyToUpdate) return;
      handleBatchUpdateSectionFields({ [property]: null }, sectionKeyToUpdate, device);
    },
    [handleBatchUpdateSectionFields, selectedSectionKey]
  );

  const handleRenameSection = useCallback(
    (sectionKey: string, newLabel: string) => {
      const trimmed = newLabel.trim();
      if (!trimmed) return;

      const currentSections = activeSectionsRef.current;
      const targetIndex = currentSections.findIndex(
        (s: any, idx: number) => getSectionKey(s, idx) === sectionKey
      );
      if (targetIndex === -1) return;

      const target = currentSections[targetIndex];
      const base = typeof target === "string" ? { type: target } : { ...target };
      const baseSettings =
        typeof base.settings === "object" && base.settings !== null ? { ...base.settings } : {};

      base.label = trimmed;
      baseSettings.label = trimmed;
      base.settings = baseSettings;

      const nextSections = [...currentSections];
      nextSections[targetIndex] = base;

      activeSectionsRef.current = nextSections;

      const currentTokens = currentDesignTokensRef.current;
      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;

      const nextPages = {
        ...((currentTokens?.pages as Record<string, unknown>) || {}),
        ...((currentTokens?.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      const nextTokens = {
        ...currentTokens,
        themeId,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
    },
    [themeId, handleDesignTokensChange, onSave]
  );

  const handleToggleSectionVisibility = useCallback(
    (sectionKey: string) => {
      const currentSections = activeSectionsRef.current;
      const targetIndex = currentSections.findIndex(
        (s: any, idx: number) => getSectionKey(s, idx) === sectionKey
      );
      if (targetIndex === -1) return;

      const target = currentSections[targetIndex];
      const base = typeof target === "string" ? { type: target } : { ...target };
      const baseSettings =
        typeof base.settings === "object" && base.settings !== null ? { ...base.settings } : {};

      const currentHidden = Boolean(base.hidden ?? baseSettings.hidden);
      const nextHidden = !currentHidden;

      if (nextHidden) {
        base.hidden = true;
        baseSettings.hidden = true;
      } else {
        base.hidden = false;
        delete base.hidden;
        delete baseSettings.hidden;
      }

      base.settings = baseSettings;

      const nextSections = [...currentSections];
      nextSections[targetIndex] = base;

      activeSectionsRef.current = nextSections;

      const currentTokens = currentDesignTokensRef.current;
      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;

      const nextPages = {
        ...((currentTokens?.pages as Record<string, unknown>) || {}),
        ...((currentTokens?.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      const nextTokens = {
        ...currentTokens,
        themeId,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
    },
    [themeId, handleDesignTokensChange, onSave]
  );

  const handleToggleSectionLock = useCallback(
    (sectionKey: string) => {
      const currentSections = activeSectionsRef.current;
      const targetIndex = currentSections.findIndex(
        (s: any, idx: number) => getSectionKey(s, idx) === sectionKey
      );
      if (targetIndex === -1) return;

      const target = currentSections[targetIndex];
      const base = typeof target === "string" ? { type: target } : { ...target };
      const baseSettings =
        typeof base.settings === "object" && base.settings !== null ? { ...base.settings } : {};

      const currentLocked = Boolean(base.locked ?? baseSettings.locked);
      const nextLocked = !currentLocked;

      if (nextLocked) {
        base.locked = true;
        baseSettings.locked = true;
      } else {
        base.locked = false;
        delete base.locked;
        delete baseSettings.locked;
      }

      base.settings = baseSettings;

      const nextSections = [...currentSections];
      nextSections[targetIndex] = base;

      activeSectionsRef.current = nextSections;

      const currentTokens = currentDesignTokensRef.current;
      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;

      const nextPages = {
        ...((currentTokens?.pages as Record<string, unknown>) || {}),
        ...((currentTokens?.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      const nextTokens = {
        ...currentTokens,
        themeId,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
    },
    [themeId, handleDesignTokensChange, onSave]
  );

  const handleUpdateSectionField = useCallback(
    (field: string, value: any, device: StudioDeviceMode = "desktop") => {
      handleBatchUpdateSectionFields({ [field]: value }, undefined, device);
    },
    [handleBatchUpdateSectionFields]
  );

  // ─────────────────────────────────────────────────────────────
  // Ticket QW-A: Page Management (Delete, Duplicate, Rename)
  // ─────────────────────────────────────────────────────────────
  const handleDeletePage = useCallback(
    (pageKey: string) => {
      const isThemePage = STUDIO_PAGES.some((p) => p.id === pageKey);
      if (isThemePage) {
        toast.error("لا يمكن حذف صفحات الثيم الأساسية الـ12");
        return false;
      }

      const currentTokens = currentDesignTokensRef.current || {};
      const currentPages = { ...((currentTokens.pages as Record<string, unknown>) || {}) };
      const currentOverrides = { ...((currentTokens.pageOverrides as Record<string, unknown>) || {}) };

      delete currentPages[pageKey];
      delete currentOverrides[pageKey];

      let nextStyles = currentTokens.pageStyles;
      if (nextStyles && typeof nextStyles === "object" && (nextStyles as any)[pageKey]) {
        nextStyles = { ...(nextStyles as any) };
        delete (nextStyles as any)[pageKey];
      }

      // Ticket MANAGE-PAGES: Remove page from navigation menu if present
      let nextNavigation = currentTokens.navigation as Record<string, unknown> | undefined;
      if (nextNavigation && Array.isArray((nextNavigation as any).menu)) {
        const currentMenu = (nextNavigation as any).menu as Array<{ label: string; url: string }>;
        const pageUrl = `/${pageKey}`;
        const filteredMenu = currentMenu.filter(
          (item) => item.url !== pageUrl && item.url !== pageKey && item.url !== `/${pageKey}/`
        );
        if (filteredMenu.length !== currentMenu.length) {
          nextNavigation = {
            ...nextNavigation,
            menu: filteredMenu,
          };
        }
      }

      const nextTokens = {
        ...currentTokens,
        pages: currentPages,
        pageOverrides: currentOverrides,
        ...(nextStyles ? { pageStyles: nextStyles } : {}),
        ...(nextNavigation ? { navigation: nextNavigation } : {}),
      };

      if (activePageKeyRef.current === pageKey) {
        setActivePageKeyInternal("home");
        setSelectedSectionKey("");
      }

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success("تم حذف الصفحة بنجاح");
      return true;
    },
    [handleDesignTokensChange, onSave]
  );

  const handleDuplicatePage = useCallback(
    (pageKey: string) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentPages = (currentTokens.pages as Record<string, any>) || {};
      const currentOverrides = (currentTokens.pageOverrides as Record<string, any>) || {};
      const themePage = previewTheme.pages?.[pageKey];

      const origData = currentOverrides[pageKey] || currentPages[pageKey] || themePage || {};
      const origLabel =
        origData.label || origData.title || STUDIO_PAGES.find((p) => p.id === pageKey)?.label || pageKey;

      let candidateSlug = `${pageKey}-copy`;
      let counter = 2;
      const existingPageKeys = new Set([
        ...STUDIO_PAGES.map((p) => p.id),
        ...Object.keys(currentPages),
        ...Object.keys(currentOverrides),
      ]);
      while (existingPageKeys.has(candidateSlug)) {
        candidateSlug = `${pageKey}-copy-${counter}`;
        counter++;
      }

      const newLabel = `${origLabel} (نسخة)`;

      const origSections = Array.isArray(origData.sections) ? origData.sections : [];
      const clonedSections = JSON.parse(JSON.stringify(origSections)).map((s: any, idx: number) => {
        const base = typeof s === "string" ? { type: s } : s;
        base.key = `${base.type || "section"}-${Date.now()}-${idx}`;
        if (base.children && Array.isArray(base.children)) {
          const regen = (children: any[]) => {
            children.forEach((c: any, i: number) => {
              c.key = `${c.type || "section"}-${Date.now()}-${i}`;
              if (c.children && Array.isArray(c.children)) regen(c.children);
            });
          };
          regen(base.children);
        }
        return base;
      });

      const newPageConfig = {
        id: candidateSlug,
        slug: candidateSlug,
        title: newLabel,
        label: newLabel,
        sections: clonedSections,
      };

      const nextPages = {
        ...currentPages,
        [candidateSlug]: newPageConfig,
      };
      const nextPageOverrides = {
        ...currentOverrides,
        [candidateSlug]: newPageConfig,
      };

      const nextTokens = {
        ...currentTokens,
        pages: nextPages,
        pageOverrides: nextPageOverrides,
      };

      handleDesignTokensChange(nextTokens);
      setActivePageKeyInternal(candidateSlug);
      setSelectedSectionKey("");
      onSave();
      toast.success(`تم تكرار الصفحة بنجاح: ${newLabel}`);
      return candidateSlug;
    },
    [previewTheme, handleDesignTokensChange, onSave]
  );

  const handleRenamePage = useCallback(
    (pageKey: string, newTitle: string, newSlug?: string) => {
      const trimmedTitle = newTitle.trim();
      if (!trimmedTitle) return false;

      const currentTokens = currentDesignTokensRef.current || {};
      const currentPages = { ...((currentTokens.pages as Record<string, any>) || {}) };
      const currentOverrides = { ...((currentTokens.pageOverrides as Record<string, any>) || {}) };

      // Slug normalization if newSlug is passed
      const cleanSlug = newSlug
        ? newSlug.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "")
        : pageKey;

      if (!cleanSlug) {
        toast.error("رابط الصفحة مطلوب");
        return false;
      }

      // If slug is changing, validate uniqueness against standard pages & other custom pages
      if (cleanSlug !== pageKey) {
        const isStandard = STUDIO_PAGES.some((p) => p.id === cleanSlug);
        const isTakenByCustom =
          Boolean(currentPages[cleanSlug]) || Boolean(currentOverrides[cleanSlug]);
        if (isStandard || isTakenByCustom) {
          toast.error(`الرابط "${cleanSlug}" مستخدم بالفعل، يرجى اختيار رابط آخر`);
          return false;
        }
      }

      const existingPage = currentPages[pageKey] || currentOverrides[pageKey] || {};
      const updatedPage = {
        ...existingPage,
        id: cleanSlug,
        slug: cleanSlug,
        title: trimmedTitle,
        label: trimmedTitle,
      };

      // If slug changed, delete old keys and assign to new cleanSlug
      if (cleanSlug !== pageKey) {
        delete currentPages[pageKey];
        delete currentOverrides[pageKey];
      }
      currentPages[cleanSlug] = updatedPage;
      currentOverrides[cleanSlug] = updatedPage;

      // Handle pageStyles key migration if slug changed
      let nextStyles = currentTokens.pageStyles;
      if (cleanSlug !== pageKey && nextStyles && typeof nextStyles === "object") {
        if ((nextStyles as any)[pageKey]) {
          nextStyles = { ...(nextStyles as any), [cleanSlug]: (nextStyles as any)[pageKey] };
          delete (nextStyles as any)[pageKey];
        }
      }

      // Update navigation menu item label and url
      let nextNavigation = currentTokens.navigation as Record<string, unknown> | undefined;
      if (nextNavigation && Array.isArray((nextNavigation as any).menu)) {
        const currentMenu = (nextNavigation as any).menu as Array<{ label: string; url: string }>;
        const oldUrl = `/${pageKey}`;
        const newUrl = `/${cleanSlug}`;
        const updatedMenu = currentMenu.map((item) => {
          if (item.url === oldUrl || item.url === pageKey) {
            return { ...item, label: trimmedTitle, url: newUrl };
          }
          return item;
        });
        nextNavigation = {
          ...nextNavigation,
          menu: updatedMenu,
        };
      }

      const nextTokens = {
        ...currentTokens,
        pages: currentPages,
        pageOverrides: currentOverrides,
        ...(nextStyles ? { pageStyles: nextStyles } : {}),
        ...(nextNavigation ? { navigation: nextNavigation } : {}),
      };

      if (cleanSlug !== pageKey && activePageKeyRef.current === pageKey) {
        setActivePageKeyInternal(cleanSlug);
      }

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success("تمت إعادة تسمية الصفحة بنجاح");
      return true;
    },
    [handleDesignTokensChange, onSave]
  );

  // ─────────────────────────────────────────────────────────────
  // Ticket QW-A: Saved Sections + «أقسامي» Library
  // ─────────────────────────────────────────────────────────────
  const savedSections = useMemo<SavedStudioSection[]>(() => {
    return Array.isArray(currentDesignTokens?.savedSections)
      ? (currentDesignTokens.savedSections as SavedStudioSection[])
      : [];
  }, [currentDesignTokens]);

  const handleSaveSection = useCallback(
    (customLabel?: string) => {
      const currentSections = activeSectionsRef.current;
      const targetConfig =
        currentSections.find(
          (s: any, idx: number) => getSectionKey(s, idx) === selectedSectionKey
        ) || selectedSectionConfig;

      if (!targetConfig) {
        toast.error("يرجى تحديد قسم في الكانفس أولاً لحفظه في مكتبة أقسامك");
        return null;
      }

      const clean = JSON.parse(JSON.stringify(targetConfig));
      delete clean.key;
      delete clean.id;
      if (clean.children && Array.isArray(clean.children)) {
        const stripKeys = (children: any[]) => {
          children.forEach((c: any) => {
            delete c.key;
            delete c.id;
            if (c.children && Array.isArray(c.children)) stripKeys(c.children);
          });
        };
        stripKeys(clean.children);
      }

      const finalLabel =
        customLabel?.trim() || clean.label || clean.settings?.title || clean.type || "قسم مخصص";

      const newSaved: SavedStudioSection = {
        id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: finalLabel,
        type: clean.type,
        settings: clean.settings || {},
        ...(clean.children ? { children: clean.children } : {}),
        createdAt: new Date().toISOString(),
      };

      const currentTokens = currentDesignTokensRef.current || {};
      const currentSaved: SavedStudioSection[] = Array.isArray(currentTokens.savedSections)
        ? (currentTokens.savedSections as SavedStudioSection[])
        : [];

      // Max 50 items: prepend newest and drop oldest
      const nextSaved = [newSaved, ...currentSaved].slice(0, 50);

      const nextTokens = {
        ...currentTokens,
        savedSections: nextSaved,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success(`تم حفظ القسم «${finalLabel}» في مكتبة أقسامي`);
      return newSaved;
    },
    [selectedSectionKey, selectedSectionConfig, handleDesignTokensChange, onSave]
  );

  const handleDeleteSavedSection = useCallback(
    (id: string) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentSaved: SavedStudioSection[] = Array.isArray(currentTokens.savedSections)
        ? (currentTokens.savedSections as SavedStudioSection[])
        : [];

      const nextSaved = currentSaved.filter((s) => s.id !== id);

      const nextTokens = {
        ...currentTokens,
        savedSections: nextSaved,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.info("تم حذف القسم من مكتبة أقسامي");
    },
    [handleDesignTokensChange, onSave]
  );

  const handleAddSavedSection = useCallback(
    (saved: SavedStudioSection, insertAtIndex?: number) => {
      const cloned = JSON.parse(JSON.stringify(saved));
      const newKey = `${cloned.type || "section"}-${Date.now()}`;
      const newSection: any = {
        type: cloned.type,
        key: newKey,
        label: cloned.label,
        settings: cloned.settings ? { ...cloned.settings } : {},
      };

      if (cloned.children && Array.isArray(cloned.children)) {
        const assignKeys = (children: any[]) => {
          children.forEach((c: any, i: number) => {
            c.key = `${c.type || "section"}-${Date.now()}-${i}`;
            if (c.children && Array.isArray(c.children)) assignKeys(c.children);
          });
        };
        const childrenClone = JSON.parse(JSON.stringify(cloned.children));
        assignKeys(childrenClone);
        newSection.children = childrenClone;
      }

      const baseSections = activeSectionsRef.current;
      let nextSections: any[];
      if (
        typeof insertAtIndex === "number" &&
        insertAtIndex >= 0 &&
        insertAtIndex <= baseSections.length
      ) {
        nextSections = [...baseSections];
        nextSections.splice(insertAtIndex, 0, newSection);
      } else {
        nextSections = [...baseSections, newSection];
      }

      const currentTokens = currentDesignTokensRef.current || {};
      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;

      const nextPages = {
        ...((currentTokens.pages as Record<string, unknown>) || {}),
        ...((currentTokens.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      setSelectedSectionKey(newKey);

      const nextTokens = {
        ...currentTokens,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success(`تمت إضافة «${cloned.label}» إلى الصفحة`);
      return newKey;
    },
    [handleDesignTokensChange, onSave]
  );

  // ─────────────────────────────────────────────────────────────
  // Ticket GLOBAL-1: Global Components (مكوّنات عالمية متزامنة)
  // ─────────────────────────────────────────────────────────────
  const globalComponents = useMemo<StudioGlobalComponent[]>(() => {
    return Array.isArray(currentDesignTokens?.globalComponents)
      ? (currentDesignTokens.globalComponents as StudioGlobalComponent[])
      : [];
  }, [currentDesignTokens]);

  const handleCreateGlobalComponent = useCallback(
    (customName?: string, sectionToConvert?: any) => {
      const currentSections = activeSectionsRef.current;
      const targetConfig =
        sectionToConvert ||
        currentSections.find(
          (s: any, idx: number) => getSectionKey(s, idx) === selectedSectionKey
        ) ||
        selectedSectionConfig;

      if (!targetConfig) {
        toast.error("يرجى تحديد قسم في الكانفس أولاً لتحويله لمكوّن عام");
        return null;
      }

      const currentTokens = currentDesignTokensRef.current || {};
      const currentComps: StudioGlobalComponent[] = Array.isArray(currentTokens.globalComponents)
        ? (currentTokens.globalComponents as StudioGlobalComponent[])
        : [];

      let newComp: StudioGlobalComponent;
      try {
        newComp = createGlobalComponent(customName || "", targetConfig, {
          existingComponents: currentComps,
        });
      } catch (err: any) {
        toast.error(err?.message || "فشل إنشاء المكوّن العام");
        throw err;
      }

      const nextComps = [newComp, ...currentComps];

      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;
      const targetIdx = currentSections.findIndex(
        (s: any, idx: number) => getSectionKey(s, idx) === selectedSectionKey
      );

      let nextSections = currentSections;
      if (targetIdx !== -1) {
        const existingKey = currentSections[targetIdx]?.key || `componentInstance-${Date.now()}`;
        const instanceSection = {
          type: "componentInstance",
          key: existingKey,
          componentId: newComp.id,
          label: newComp.name,
          settings: {
            componentId: newComp.id,
          },
        };
        nextSections = [...currentSections];
        nextSections[targetIdx] = instanceSection;
      }

      const nextPages = {
        ...((currentTokens.pages as Record<string, unknown>) || {}),
        ...((currentTokens.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      const nextTokens = {
        ...currentTokens,
        globalComponents: nextComps,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success(`تم إنشاء المكوّن العام «${newComp.name}» وتحويل القسم لنسخة متزامنة`);
      return newComp;
    },
    [selectedSectionKey, selectedSectionConfig, handleDesignTokensChange, onSave]
  );

  const handleInsertComponentInstance = useCallback(
    (componentId: string, insertAtIndex?: number) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentComps: StudioGlobalComponent[] = Array.isArray(currentTokens.globalComponents)
        ? (currentTokens.globalComponents as StudioGlobalComponent[])
        : [];

      const targetComp = currentComps.find((c) => c.id === componentId);
      if (!targetComp) {
        toast.error("المكوّن العام المطلوب غير موجود");
        return;
      }

      const newKey = `componentInstance-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const instanceSection = {
        type: "componentInstance",
        key: newKey,
        componentId: targetComp.id,
        label: targetComp.name,
        settings: {
          componentId: targetComp.id,
        },
      };

      const baseSections = activeSectionsRef.current;
      let nextSections: any[];
      if (
        typeof insertAtIndex === "number" &&
        insertAtIndex >= 0 &&
        insertAtIndex <= baseSections.length
      ) {
        nextSections = [...baseSections];
        nextSections.splice(insertAtIndex, 0, instanceSection);
      } else {
        nextSections = [...baseSections, instanceSection];
      }

      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;

      const nextPages = {
        ...((currentTokens.pages as Record<string, unknown>) || {}),
        ...((currentTokens.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      setSelectedSectionKey(newKey);

      const nextTokens = {
        ...currentTokens,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success(`تم إدراج نسخة متزامنة من «${targetComp.name}»`);
      return newKey;
    },
    [handleDesignTokensChange, onSave]
  );

  const handleUpdateGlobalComponent = useCallback(
    (componentId: string, updates: Partial<StudioGlobalComponent>) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentComps: StudioGlobalComponent[] = Array.isArray(currentTokens.globalComponents)
        ? (currentTokens.globalComponents as StudioGlobalComponent[])
        : [];

      const targetIdx = currentComps.findIndex((c) => c.id === componentId);
      if (targetIdx === -1) return;

      if (updates.section) {
        validateComponentHierarchy(componentId, updates.section, currentComps);
      }

      const nextComps = [...currentComps];
      nextComps[targetIdx] = {
        ...nextComps[targetIdx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const nextTokens = {
        ...currentTokens,
        globalComponents: nextComps,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success("تم تحديث المكوّن العام وتزامنت كافة نسخه");
    },
    [handleDesignTokensChange, onSave]
  );

  const handleDeleteGlobalComponent = useCallback(
    (componentId: string, _force = false) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentComps: StudioGlobalComponent[] = Array.isArray(currentTokens.globalComponents)
        ? (currentTokens.globalComponents as StudioGlobalComponent[])
        : [];

      const nextComps = currentComps.filter((c) => c.id !== componentId);

      const nextTokens = {
        ...currentTokens,
        globalComponents: nextComps,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.info("تم حذف المكوّن العام");
      return true;
    },
    [handleDesignTokensChange, onSave]
  );

  const handleDetachComponentInstance = useCallback(
    (sectionKeyToDetach?: string) => {
      const currentSections = activeSectionsRef.current;
      const targetKey = sectionKeyToDetach || selectedSectionKey;
      const targetIdx = currentSections.findIndex(
        (s: any, idx: number) => getSectionKey(s, idx) === targetKey
      );

      if (targetIdx === -1) return;

      const targetSection = currentSections[targetIdx];
      if (targetSection?.type !== "componentInstance") return;

      const currentTokens = currentDesignTokensRef.current || {};
      const currentComps: StudioGlobalComponent[] = Array.isArray(currentTokens.globalComponents)
        ? (currentTokens.globalComponents as StudioGlobalComponent[])
        : [];

      const detached = detachComponentInstance(targetSection, currentComps);

      const nextSections = [...currentSections];
      nextSections[targetIdx] = detached;

      const pageKey = activePageKeyRef.current;
      const pageConfig = activePageConfigRef.current;

      const nextPages = {
        ...((currentTokens.pages as Record<string, unknown>) || {}),
        ...((currentTokens.pageOverrides as Record<string, unknown>) || {}),
        [pageKey]: {
          ...pageConfig,
          sections: nextSections,
        },
      };

      const nextTokens = {
        ...currentTokens,
        pages: nextPages,
        pageOverrides: nextPages,
      };

      handleDesignTokensChange(nextTokens);
      onSave();
      toast.success("تم فصل النسخة لتصبح قسماً مستقلاً");
    },
    [selectedSectionKey, handleDesignTokensChange, onSave]
  );

  // ─────────────────────────────────────────────────────────────
  // Ticket TPL-2: Export / Import + Pre-Publish Snapshot + Theme Builder
  // ─────────────────────────────────────────────────────────────
  const templates = useMemo<ThemeBuilderTemplate[]>(() => {
    return Array.isArray(currentDesignTokens?.templates)
      ? (currentDesignTokens.templates as ThemeBuilderTemplate[])
      : [];
  }, [currentDesignTokens]);

  const handleSaveTemplate = useCallback(
    (template: ThemeBuilderTemplate) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentTemplates: ThemeBuilderTemplate[] = Array.isArray(currentTokens.templates)
        ? (currentTokens.templates as ThemeBuilderTemplate[])
        : [];
      const existingIdx = currentTemplates.findIndex((t) => t.id === template.id);
      let nextTemplates: ThemeBuilderTemplate[];
      if (existingIdx >= 0) {
        nextTemplates = [...currentTemplates];
        nextTemplates[existingIdx] = template;
      } else {
        nextTemplates = [template, ...currentTemplates];
      }
      const nextTokens = {
        ...currentTokens,
        templates: nextTemplates,
      };
      handleDesignTokensChange(nextTokens);
      onSave();
    },
    [handleDesignTokensChange, onSave]
  );

  const handleDeleteTemplate = useCallback(
    (templateId: string) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const currentTemplates: ThemeBuilderTemplate[] = Array.isArray(currentTokens.templates)
        ? (currentTokens.templates as ThemeBuilderTemplate[])
        : [];
      const nextTemplates = currentTemplates.filter((t) => t.id !== templateId);
      const nextTokens = {
        ...currentTokens,
        templates: nextTemplates,
      };
      handleDesignTokensChange(nextTokens);
      onSave();
    },
    [handleDesignTokensChange, onSave]
  );

  const exportPage = useCallback(
    (targetKey?: string): StudioExportedPageData => {
      const pageToExport = targetKey || activePageKey;
      const targetSections =
        pageToExport === activePageKey
          ? activeSectionsRef.current
          : (currentDesignTokensRef.current?.pages as any)?.[pageToExport]?.sections || [];
      const styles = (currentDesignTokensRef.current?.pageStyles as PageStylesMap)?.[pageToExport];
      return exportPageHelper(pageToExport, {
        sections: targetSections,
        styles,
        designTokens: currentDesignTokensRef.current,
        theme: previewTheme,
        title: (previewTheme.pages as any)?.[pageToExport]?.title || pageToExport,
      });
    },
    [activePageKey, previewTheme]
  );

  const downloadPageJSON = useCallback(
    (targetKey?: string) => {
      const exported = exportPage(targetKey);
      downloadJSON(`${targetKey || activePageKey}-page.json`, exported);
    },
    [exportPage, activePageKey]
  );

  const importPage = useCallback(
    (jsonInput: unknown, confirm: boolean = true): StudioImportResult => {
      return importPageHelper(jsonInput, {
        pageKey: activePageKey,
        currentSections: activeSectionsRef.current,
        currentStyles: activePageStyle,
        confirm,
        onApply: (imported) => {
          const currentTokens = currentDesignTokensRef.current || {};
          const pageKey = activePageKeyRef.current;
          const pageConfig = activePageConfigRef.current;
          const nextPages = {
            ...((currentTokens.pages as Record<string, unknown>) || {}),
            ...((currentTokens.pageOverrides as Record<string, unknown>) || {}),
            [pageKey]: {
              ...pageConfig,
              sections: imported.sections,
            },
          };
          let nextStyles = currentTokens.pageStyles;
          if (imported.styles) {
            nextStyles = {
              ...((currentTokens.pageStyles as PageStylesMap) || {}),
              [pageKey]: imported.styles,
            };
          }
          const nextTokens = {
            ...currentTokens,
            pages: nextPages,
            pageOverrides: nextPages,
            ...(nextStyles ? { pageStyles: nextStyles } : {}),
          };
          handleDesignTokensChange(nextTokens);
          onSave();
          toast.success(`تم استيراد محتوى صفحة "${pageKey}" بنجاح (${imported.sections.length} قسم)`);
        },
      });
    },
    [activePageKey, activePageStyle, handleDesignTokensChange, onSave]
  );

  const createPrePublishSnapshot = useCallback((): StudioPrePublishSnapshot => {
    const currentTokens = currentDesignTokensRef.current || {};
    const snapshot: StudioPrePublishSnapshot = {
      id: `pre-publish-${Date.now()}`,
      name: "pre-publish",
      createdAt: new Date().toISOString(),
      snapshot: JSON.parse(
        JSON.stringify({
          themeId,
          designTokens: currentTokens,
          activePageKey,
          sections: activeSectionsRef.current,
          pageStyles: currentTokens.pageStyles,
        })
      ),
    };
    const existingSnapshots = Array.isArray(currentTokens.snapshots)
      ? (currentTokens.snapshots as StudioPrePublishSnapshot[])
      : [];
    const nextSnapshots = [snapshot, ...existingSnapshots.slice(0, 29)];
    const nextTokens = {
      ...currentTokens,
      snapshots: nextSnapshots,
    };
    handleDesignTokensChange(nextTokens);
    return snapshot;
  }, [themeId, activePageKey, handleDesignTokensChange]);

  const handleRestorePrePublishSnapshot = useCallback(
    (targetSnapshot?: StudioPrePublishSnapshot) => {
      const currentTokens = currentDesignTokensRef.current || {};
      const snapshots = (currentTokens.snapshots as StudioPrePublishSnapshot[]) || [];
      const snapToRestore =
        targetSnapshot || snapshots.find((s) => s.name === "pre-publish") || snapshots[0];
      if (!snapToRestore || !snapToRestore.snapshot) {
        toast.error("لا توجد نسخة سابقة للاسترجاع");
        return false;
      }
      const snapData = snapToRestore.snapshot as any;
      const restoredTokens = snapData.designTokens || snapData;
      handleDesignTokensChange(restoredTokens);
      onSave();
      toast.success("تم استرجاع النسخة السابقة بنجاح 🔄");
      return true;
    },
    [handleDesignTokensChange, onSave]
  );

  const handlePublish = useCallback(async () => {
    createPrePublishSnapshot();
    toast.success("تم حفظ نسخة — استرجاع", {
      action: {
        label: "استرجاع",
        onClick: () => handleRestorePrePublishSnapshot(),
      },
    });
    onSave();
  }, [createPrePublishSnapshot, handleRestorePrePublishSnapshot, onSave]);

  // Sync to global bridge for component decoupling
  useEffect(() => {
    globalBridgeState = {
      currentDesignTokens,
      activePageKey,
      selectedSectionKey,
      selectedSectionConfig,
      savedSections,
      globalComponents,
      handleDeletePage,
      handleDuplicatePage,
      handleRenamePage,
      handleSaveSection,
      handleDeleteSavedSection,
      handleAddSavedSection,
      handleCreateGlobalComponent,
      handleInsertComponentInstance,
      handleUpdateGlobalComponent,
      handleDeleteGlobalComponent,
      handleDetachComponentInstance,
    };
    bridgeListeners.forEach((fn) => fn());
  }, [
    currentDesignTokens,
    activePageKey,
    selectedSectionKey,
    selectedSectionConfig,
    savedSections,
    globalComponents,
    handleDeletePage,
    handleDuplicatePage,
    handleRenamePage,
    handleSaveSection,
    handleDeleteSavedSection,
    handleAddSavedSection,
    handleCreateGlobalComponent,
    handleInsertComponentInstance,
    handleUpdateGlobalComponent,
    handleDeleteGlobalComponent,
    handleDetachComponentInstance,
  ]);

  return {
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
    undo: handleUndo,
    redo: handleRedo,
    historySteps,
    currentHistoryStepIndex,
    jumpToHistoryStep: handleJumpToHistoryStep,
    handleDesignTokensChange,
    handleDragEnd,
    handleMoveSection,
    handleMoveSectionToContainer,
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
    // Ticket QW-A exports
    savedSections,
    handleSaveSection,
    handleDeleteSavedSection,
    handleAddSavedSection,
    handleDeletePage,
    handleDuplicatePage,
    handleRenamePage,
    // Ticket HF-1 exports
    globalTokens,
    handleUpdateGlobalHeader,
    handleUpdateGlobalFooter,
    handleUpdateGlobalTokens,
    // Ticket TOKENS-1 exports
    variables,
    handleUpdateVariables,
    // Ticket GLOBAL-1 exports
    globalComponents,
    handleCreateGlobalComponent,
    handleInsertComponentInstance,
    handleUpdateGlobalComponent,
    handleDeleteGlobalComponent,
    handleDetachComponentInstance,
    // Ticket TPL-2 exports
    templates,
    handleSaveTemplate,
    handleDeleteTemplate,
    exportPage,
    downloadPageJSON,
    importPage,
    createPrePublishSnapshot,
    handleRestorePrePublishSnapshot,
    handlePublish,
  };
}

// ─────────────────────────────────────────────────────────────
// Studio Bridge Interface & Hook
// ─────────────────────────────────────────────────────────────
export interface StudioBridgeState {
  currentDesignTokens: Record<string, unknown>;
  activePageKey: string;
  selectedSectionKey: string;
  selectedSectionConfig: any;
  savedSections: SavedStudioSection[];
  handleDeletePage: (pageKey: string) => boolean | void;
  handleDuplicatePage: (pageKey: string) => string | undefined;
  handleRenamePage: (pageKey: string, newTitle: string, newSlug?: string) => boolean | void;
  handleSaveSection: (customLabel?: string) => SavedStudioSection | null;
  handleDeleteSavedSection: (id: string) => void;
  handleAddSavedSection: (saved: SavedStudioSection, insertAtIndex?: number) => string | void;
  globalComponents: StudioGlobalComponent[];
  handleCreateGlobalComponent: (name?: string, sectionToConvert?: any) => StudioGlobalComponent | null;
  handleInsertComponentInstance: (componentId: string, insertAtIndex?: number) => string | void;
  handleUpdateGlobalComponent: (componentId: string, updates: Partial<StudioGlobalComponent>) => void;
  handleDeleteGlobalComponent: (componentId: string, force?: boolean) => boolean | void;
  handleDetachComponentInstance: (sectionKey?: string) => void;
  // Ticket TPL-2 bridge items
  templates?: ThemeBuilderTemplate[];
  handleSaveTemplate?: (template: ThemeBuilderTemplate) => void;
  handleDeleteTemplate?: (templateId: string) => void;
  exportPage?: (targetKey?: string) => StudioExportedPageData;
  importPage?: (jsonInput: unknown, confirm?: boolean) => StudioImportResult;
  createPrePublishSnapshot?: () => StudioPrePublishSnapshot;
  handleRestorePrePublishSnapshot?: () => boolean;
  handlePublish?: () => Promise<void>;
}

let globalBridgeState: StudioBridgeState = {
  currentDesignTokens: {},
  activePageKey: "home",
  selectedSectionKey: "",
  selectedSectionConfig: null,
  savedSections: [],
  handleDeletePage: () => false,
  handleDuplicatePage: () => undefined,
  handleRenamePage: () => {},
  handleSaveSection: () => null,
  handleDeleteSavedSection: () => {},
  handleAddSavedSection: () => undefined,
  globalComponents: [],
  handleCreateGlobalComponent: () => null,
  handleInsertComponentInstance: () => undefined,
  handleUpdateGlobalComponent: () => {},
  handleDeleteGlobalComponent: () => false,
  handleDetachComponentInstance: () => {},
};

const bridgeListeners = new Set<() => void>();

export function useStudioBridge(): StudioBridgeState {
  const [state, setState] = useState<StudioBridgeState>(globalBridgeState);
  useEffect(() => {
    setState(globalBridgeState);
    const listener = () => setState(globalBridgeState);
    bridgeListeners.add(listener);
    return () => {
      bridgeListeners.delete(listener);
    };
  }, []);
  return state;
}
