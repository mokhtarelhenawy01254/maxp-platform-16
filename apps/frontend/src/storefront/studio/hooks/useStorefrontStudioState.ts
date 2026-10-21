import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { useStudioHistory } from "./useStudioHistory";
import { STOREFRONT_THEME_PRESETS } from "../../themes";
import { resolveStorefrontTheme } from "../../engine/themeResolver";
import { useCartStore } from "../../store/useCartStore";
import { getMarketplacePreviewCartItems } from "../../preview/marketplacePreviewCart";
import { isStorefrontSectionKnown } from "../../sections/manifest";
import type { StudioDeviceMode, PageStyleScope, PageStylesMap } from "../StudioTypes";
import { PAGE_STYLE_PRESETS } from "../StudioTypes";
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

export function useStorefrontStudioState({
  themeId,
  externalDesignTokens,
  onChange,
  onSave,
}: UseStorefrontStudioStateProps) {
  const [activePageKey, setActivePageKeyInternal] = useState<string>("home");
  const [selectedSectionKey, setSelectedSectionKey] = useState<string>("");

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
  } = useStudioHistory<Record<string, unknown>>(externalDesignTokens, {
    maxHistory: 30,
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
    return resolveStorefrontTheme({
      themeId,
      theme: baseTheme,
      designTokens: currentDesignTokens,
      activePageKey,
    });
  }, [themeId, currentDesignTokens, activePageKey]);

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
      setSelectedSectionKey(getSectionKey(activeSections[0], 0));
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

  const handleAddSection = (sectionType: string, insertAtIndex?: number) => {
    if (!isStorefrontSectionKnown(sectionType)) {
      toast.error(`نوع القسم "${sectionType}" غير مدعوم في المتجر`);
      return;
    }

    const newKey = `${sectionType}-${Date.now()}`;
    const starterSettings = STUDIO_STARTER_SETTINGS[sectionType] || {};
    const baseSections = activeSections;

    const newSection = {
      type: sectionType,
      key: newKey,
      settings: { ...starterSettings },
    };

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
      const targetIndex = currentSections.findIndex(
        (s: any, idx: number) => getSectionKey(s, idx) === sectionKey
      );
      if (targetIndex === -1) return;

      const target = currentSections[targetIndex];
      const base = typeof target === "string" ? { type: target } : { ...target };
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

      const nextSections = [...currentSections];
      nextSections[targetIndex] = {
        ...base,
        settings: baseSettings,
        config: baseConfig,
      };

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

  return {
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
    undo: handleUndo,
    redo: handleRedo,
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
    activePageStyle,
    handleApplyPageStylePreset,
    handleUpdatePageStyle,
    handleResetPageStyle,
  };
}
