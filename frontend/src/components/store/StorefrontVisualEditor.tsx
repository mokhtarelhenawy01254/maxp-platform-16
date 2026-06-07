import React, { useEffect, useMemo, useState } from "react";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EyeSlashIcon,
  PaintBrushIcon,
  PhotoIcon,
  PlusIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { StorefrontSettings } from "../../services/storefrontSettingsService";
import { PageComposer } from "../../storefront/engine/PageComposer";
import { StorefrontThemeProvider, useStorefrontTheme } from "../../storefront/engine/ThemeProvider";
import { resolveStorefrontTheme, type StorefrontThemeInput } from "../../storefront/engine/themeResolver";
import {
  getStorefrontSectionLabel,
  getStorefrontSectionManifest,
  type StorefrontSectionFieldDefinition,
} from "../../storefront/sections/manifest";
import { getStorefrontThemePreset } from "../../storefront/themes";
import type {
  StorefrontPageConfig,
  StorefrontSectionConfig,
  StorefrontTheme,
} from "../../storefront/types/theme.types";
import {
  getStorefrontContentOverridesFromDesignTokens,
  upsertStorefrontContentOverridesInDesignTokens,
} from "../../storefront/utils/contentOverrides";
import {
  getStorefrontPageOverridesFromDesignTokens,
  upsertStorefrontPageOverridesInDesignTokens,
} from "../../storefront/utils/pageOverrides";
import type { StorefrontPageValidationIssue } from "../../storefront/utils/pageOverrideValidation";
import {
  cleanStorefrontSectionSettings,
  extractStorefrontSectionSettings,
  getStorefrontSectionFieldDisplayValue,
} from "../../storefront/utils/structuredSectionFields";

type DeviceMode = "desktop" | "mobile";
type SidebarMode = "current" | "library";
type SectionEntry = string | StorefrontSectionConfig;
type SectionSettings = Record<string, unknown>;
type SectionConfig = {
  id?: string;
  type: string;
  variant?: string;
  settings?: SectionSettings;
};

const HOME_LIBRARY_SECTION_TYPES = [
  "promo-strip",
  "hero-banner",
  "featured-collections",
  "featured-products",
  "lookbook-showcase",
  "newsletter",
  "story-parallax",
  "hero-sidebar",
  "tech-grid",
  "product-grid",
] as const;

const CONTENT_MANAGED_FIELDS: Record<string, readonly string[]> = {
  "hero-banner": [
    "title",
    "subtitle",
    "ctaText",
    "ctaLink",
    "secondaryCtaText",
    "secondaryCtaLink",
    "backgroundImage",
  ],
  "featured-products": ["title"],
  newsletter: ["title", "subtitle"],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getSectionKey = (section: SectionEntry): string =>
  typeof section === "string"
    ? section
    : typeof section.id === "string" && section.id.trim()
      ? section.id
      : section.type;

const getSectionType = (section: SectionEntry): string =>
  typeof section === "string" ? section : section.type;

const getSectionVariant = (section: SectionEntry): string =>
  typeof section === "string"
    ? ""
    : typeof section.variant === "string"
      ? section.variant
      : "";

const getSectionSettings = (section: SectionEntry): SectionSettings =>
  typeof section === "string" || !isRecord(section.settings)
    ? {}
    : extractStorefrontSectionSettings(section.settings);

const normalizeSectionConfig = (section: SectionEntry): SectionConfig =>
  typeof section === "string"
    ? { type: section }
    : {
        ...(typeof section.id === "string" && section.id.trim()
          ? { id: section.id }
          : {}),
        type: section.type,
        ...(typeof section.variant === "string" && section.variant.trim()
          ? { variant: section.variant }
          : {}),
        ...(Object.keys(getSectionSettings(section)).length > 0
          ? { settings: getSectionSettings(section) }
          : {}),
      };

const cleanSectionSettings = (settings: SectionSettings = {}): SectionSettings =>
  cleanStorefrontSectionSettings(settings);

const cleanSectionConfig = (section: SectionConfig): SectionConfig => {
  const normalizedSettings = cleanSectionSettings(section.settings);

  return {
    ...(typeof section.id === "string" && section.id.trim()
      ? { id: section.id.trim() }
      : {}),
    type: section.type,
    ...(typeof section.variant === "string" && section.variant.trim()
      ? { variant: section.variant.trim() }
      : {}),
    ...(Object.keys(normalizedSettings).length > 0
      ? { settings: normalizedSettings }
      : {}),
  };
};

const areSectionsEqual = (left: SectionEntry[], right: SectionEntry[]): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const finalizeSectionEntry = (
  section: SectionConfig,
  baseSection?: SectionEntry,
): SectionEntry => {
  const cleanedSection = cleanSectionConfig(section);

  let cleanedBase: SectionEntry | undefined;
  if (baseSection) {
    cleanedBase =
      typeof baseSection === "string"
        ? baseSection
        : cleanSectionConfig(normalizeSectionConfig(baseSection));
  }

  if (cleanedBase && areSectionsEqual([cleanedBase], [cleanedSection as SectionEntry])) {
    return baseSection as SectionEntry;
  }

  if (!cleanedSection.id && !cleanedSection.variant && !cleanedSection.settings) {
    return cleanedSection.type;
  }

  return cleanedSection;
};

const getFieldDisplayValue = (
  settings: SectionSettings,
  field: StorefrontSectionFieldDefinition,
  contentOverrides: ReturnType<typeof getStorefrontContentOverridesFromDesignTokens> = { home: { sections: {} } },
  sectionType: string = "",
): string => {
  if (sectionType && isContentManagedField(sectionType, field.key)) {
    const contentValue = contentOverrides?.home?.sections?.[sectionType]?.[field.key];
    if (contentValue !== undefined && contentValue !== null && contentValue !== "") {
      return getStorefrontSectionFieldDisplayValue({ [field.key]: contentValue } as SectionSettings, field.key);
    }
  }
  return getStorefrontSectionFieldDisplayValue(settings, field.key);
};

const getHomeLibrarySections = () =>
  HOME_LIBRARY_SECTION_TYPES.map((sectionType) => ({
    type: sectionType,
    label: getStorefrontSectionLabel(sectionType),
    note:
      getStorefrontSectionManifest(sectionType)?.note ||
      "أضيفي هذا القسم داخل الصفحة الرئيسية ثم عدّلي محتواه من اليسار.",
  }));

const isContentManagedField = (sectionType: string, fieldKey: string): boolean =>
  Boolean(CONTENT_MANAGED_FIELDS[sectionType]?.includes(fieldKey));

const SortableSectionRow: React.FC<{
  section: SectionEntry;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}> = ({ section, selected, onSelect, onRemove }) => {
  const sectionKey = getSectionKey(section);
  const manifest = getStorefrontSectionManifest(getSectionType(section));
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sectionKey });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`rounded-3xl border bg-white p-3 shadow-sm transition ${
        selected
          ? "border-gray-900 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)]"
          : "border-gray-200 hover:border-gray-300"
      } ${isDragging ? "opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-start gap-3 text-right"
        >
          <span
            className={`mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
              selected ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            <Squares2X2Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-900">
              {getStorefrontSectionLabel(getSectionType(section))}
            </span>
            <span className="mt-1 block text-xs leading-5 text-gray-500">
              {manifest?.note || "اختاريه لتعديل المحتوى والإعدادات من اللوحة اليسرى."}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label={`إعادة ترتيب ${getStorefrontSectionLabel(getSectionType(section))}`}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 text-red-500 hover:bg-red-50"
            aria-label={`حذف ${getStorefrontSectionLabel(getSectionType(section))}`}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const PreviewShellInner: React.FC<{
  theme: StorefrontTheme;
  selectedSectionKey: string;
  deviceMode: DeviceMode;
  onSelectSection: (sectionKey: string) => void;
}> = ({ theme, selectedSectionKey, deviceMode, onSelectSection }) => {
  const { theme: scopedTheme } = useStorefrontTheme();
  const homePage = theme.pages.home as StorefrontPageConfig | undefined;
  const navigationLinks = scopedTheme.header?.navigation?.slice(0, 4) || [];
  const footerGroups = scopedTheme.footer?.navigation?.slice(0, 2) || [];
  const direction = scopedTheme.tokens?.typography?.direction === "ltr" ? "ltr" : "rtl";

  if (!homePage) {
    return (
      <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-sm text-gray-500">
        لا توجد أقسام مفعلة للصفحة الرئيسية حاليًا.
      </div>
    );
  }

  return (
    <div
      dir={direction}
      className={`mx-auto min-h-full overflow-hidden rounded-[2rem] border border-black/5 bg-background text-foreground shadow-[0_40px_120px_-58px_rgba(15,23,42,0.55)] ${
        deviceMode === "mobile" ? "max-w-[410px]" : "w-full"
      }`}
    >
      <div className="border-b border-border/70 bg-background/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
              {scopedTheme.name.charAt(0)}
            </span>
            <div>
              <div className="text-sm font-black">{scopedTheme.name}</div>
              <div className="text-xs text-muted-foreground">المعاينة المباشرة للصفحة الرئيسية</div>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {navigationLinks.map((link) => (
              <span
                key={`${link.label}-${link.to}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                {link.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.88),_rgba(226,232,240,0.55)_55%,_rgba(241,245,249,0.85))] p-4 md:p-5">
        <div className="space-y-1 px-2 pb-4 text-right">
          <div className="text-sm font-black text-gray-900">بناء الصفحة الرئيسية</div>
          <div className="text-sm text-gray-500">اضغطي على أي قسم داخل المعاينة لتعديل النصوص والصور والترتيب مباشرة.</div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_28px_90px_-60px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="border-b border-gray-200/80 bg-gray-50/90 px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="rounded-full border border-gray-200 bg-white px-4 py-1 text-xs font-semibold text-gray-500">
                {deviceMode === "mobile" ? "معاينة الهاتف" : "معاينة الكمبيوتر"}
              </div>
            </div>
          </div>

          <div className="max-h-[980px] overflow-auto bg-background">
            <PageComposer
              pageConfig={homePage}
              layout={homePage.layoutHint || "stack"}
              renderSectionFrame={({ element, index, sectionEntry, sectionId, componentKey }) => {
                const stableSectionKey = getSectionKey(sectionEntry);
                const selected = stableSectionKey === selectedSectionKey;
                const sectionLabel =
                  getStorefrontSectionManifest(getSectionType(sectionEntry))?.label ||
                  getStorefrontSectionManifest(componentKey)?.label ||
                  getStorefrontSectionLabel(sectionId);

                return (
                  <div
                    key={`${stableSectionKey}-${index}`}
                    className="group relative"
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectSection(stableSectionKey)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectSection(stableSectionKey);
                      }
                    }}
                    aria-label={`تعديل قسم ${sectionLabel}`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-3 z-20 rounded-[1.75rem] border-2 transition ${
                        selected
                          ? "border-gray-900 bg-black/[0.04] shadow-[0_0_0_3px_rgba(255,255,255,0.95)]"
                          : "border-transparent group-hover:border-black/20 group-hover:bg-black/[0.025]"
                      }`}
                    />

                    <div className="relative z-10 select-text [&_a]:pointer-events-none [&_button]:pointer-events-none [&_input]:pointer-events-none [&_label]:pointer-events-none [&_select]:pointer-events-none [&_summary]:pointer-events-none [&_textarea]:pointer-events-none">
                      {element}
                    </div>

                    <div className="pointer-events-none absolute start-6 top-6 z-30 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.18em] text-gray-900 shadow-sm backdrop-blur uppercase">
                        {sectionLabel}
                      </span>
                      {selected ? (
                        <span className="rounded-full bg-gray-900 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                          محدد
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            />

            <div className="border-t border-border/60 bg-card px-6 py-8">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
                <div>
                  <div className="text-lg font-black text-foreground">{scopedTheme.name}</div>
                  <div className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                    {scopedTheme.footer?.description || "واجهة معاينة مباشرة للصفحة الرئيسية مع نفس الهوية العامة للهيدر والفوتر."}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {footerGroups.map((group) => (
                    <div key={group.title}>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                        {group.title}
                      </div>
                      <div className="mt-3 space-y-2">
                        {group.links.slice(0, 3).map((link) => (
                          <div key={`${group.title}-${link.label}`} className="text-sm font-medium text-foreground">
                            {link.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface StorefrontVisualEditorProps {
  themeId: string;
  designTokens: StorefrontSettings["designTokens"];
  storeName?: string;
  validationIssues?: StorefrontPageValidationIssue[];
  onChange: (nextDesignTokens: Record<string, unknown>) => void;
  onOpenHeroImagePicker?: () => void;
}

const StorefrontVisualEditor: React.FC<StorefrontVisualEditorProps> = ({
  themeId,
  designTokens,
  storeName,
  validationIssues = [],
  onChange,
  onOpenHeroImagePicker,
}) => {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("current");
  const [selectedSectionKey, setSelectedSectionKey] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const baseTheme = useMemo(() => getStorefrontThemePreset(themeId), [themeId]);
  const previewTheme = useMemo(
    () =>
      resolveStorefrontTheme({
        themeId,
        name: storeName,
        designTokens: designTokens || {},
      }),
    [designTokens, storeName, themeId],
  );
  const pageOverrides = useMemo(
    () => getStorefrontPageOverridesFromDesignTokens(designTokens),
    [designTokens],
  );
  const contentOverrides = useMemo(
    () => getStorefrontContentOverridesFromDesignTokens(designTokens),
    [designTokens],
  );
  const homeSections = useMemo(
    () => ((previewTheme.pages.home?.sections || []) as SectionEntry[]),
    [previewTheme.pages.home],
  );
  const homeValidationIssues = useMemo(
    () => validationIssues.filter((issue) => issue.pageKey === "home"),
    [validationIssues],
  );
  const availableLibrarySections = useMemo(() => {
    const activeTypes = new Set(homeSections.map((section) => getSectionType(section)));
    return getHomeLibrarySections().filter((section) => !activeTypes.has(section.type));
  }, [homeSections]);
  const selectedSection =
    homeSections.find((section) => getSectionKey(section) === selectedSectionKey) ||
    null;
  const selectedSectionType = selectedSection ? getSectionType(selectedSection) : "";
  const selectedSectionManifest = selectedSection
    ? getStorefrontSectionManifest(selectedSectionType)
    : undefined;
  const selectedSectionSettings = selectedSection
    ? getSectionSettings(selectedSection)
    : {};
  const contentManagedFieldKeys = selectedSectionType
    ? new Set(CONTENT_MANAGED_FIELDS[selectedSectionType] || [])
    : new Set<string>();

  useEffect(() => {
    if (homeSections.length === 0) {
      if (selectedSectionKey) {
        setSelectedSectionKey("");
      }
      return;
    }

    if (!homeSections.some((section) => getSectionKey(section) === selectedSectionKey)) {
      setSelectedSectionKey(getSectionKey(homeSections[0]!));
    }
  }, [homeSections, selectedSectionKey]);

  const commitHomeSections = (nextSections: SectionEntry[]) => {
    const nextOverrides = { ...pageOverrides };
    const baseSections = (baseTheme.pages.home?.sections || []) as SectionEntry[];
    const existingLayoutHint = pageOverrides.home?.layoutHint;
    const normalizedSections = nextSections.map((section) => {
      const baseSection = baseSections.find(
        (entry) => getSectionKey(entry) === getSectionKey(section),
      );

      if (typeof section === "string") {
        return section;
      }

      return finalizeSectionEntry(normalizeSectionConfig(section), baseSection);
    });

    if (baseSections.length > 0 && areSectionsEqual(normalizedSections, baseSections)) {
      if (existingLayoutHint) {
        nextOverrides.home = {
          layoutHint: existingLayoutHint,
          sections: baseSections,
        };
      } else {
        delete nextOverrides.home;
      }
    } else {
      nextOverrides.home = {
        ...(existingLayoutHint ? { layoutHint: existingLayoutHint } : {}),
        sections: normalizedSections,
      };
    }

    onChange(upsertStorefrontPageOverridesInDesignTokens(designTokens, nextOverrides));
  };

  const stripHomePageFieldOverride = (
    overrides: ReturnType<typeof getStorefrontPageOverridesFromDesignTokens>,
    sectionType: string,
    fieldKey: string,
  ) => {
    const homeOverrideSections = (overrides.home?.sections || []) as SectionEntry[];

    if (homeOverrideSections.length === 0) {
      return overrides;
    }

    const baseSections = (baseTheme.pages.home?.sections || []) as SectionEntry[];
    const nextSections = homeOverrideSections.map((section) => {
      if (getSectionType(section) !== sectionType) {
        return section;
      }

      const baseSection = baseSections.find(
        (entry) => getSectionKey(entry) === getSectionKey(section),
      );
      const normalizedConfig = normalizeSectionConfig(section);
      const nextSettings = {
        ...(normalizedConfig.settings || {}),
      };

      delete nextSettings[fieldKey];

      return finalizeSectionEntry(
        {
          ...normalizedConfig,
          settings: nextSettings,
        },
        baseSection,
      );
    });

    const nextOverrides = { ...overrides };
    if (baseSections.length > 0 && areSectionsEqual(nextSections, baseSections)) {
      if (overrides.home?.layoutHint) {
        nextOverrides.home = {
          layoutHint: overrides.home.layoutHint,
          sections: baseSections,
        };
      } else {
        delete nextOverrides.home;
      }
    } else {
      nextOverrides.home = {
        ...(overrides.home?.layoutHint ? { layoutHint: overrides.home.layoutHint } : {}),
        sections: nextSections,
      };
    }

    return nextOverrides;
  };

  const handleSectionFieldChange = (
    field: StorefrontSectionFieldDefinition,
    rawValue: string,
  ) => {
    if (!selectedSection) {
      return;
    }

    if (isContentManagedField(selectedSectionType, field.key)) {
      const nextContentOverrides = {
        ...contentOverrides,
      };
      const nextHomeSections = {
        ...(contentOverrides.home?.sections || {}),
      };
      const nextSectionContent = isRecord(nextHomeSections[selectedSectionType])
        ? { ...(nextHomeSections[selectedSectionType] as Record<string, unknown>) }
        : {};

      if (field.type === "number") {
        const parsedValue = Number(rawValue);
        if (Number.isFinite(parsedValue) && parsedValue > 0) {
          nextSectionContent[field.key] = parsedValue;
        } else {
          delete nextSectionContent[field.key];
        }
      } else if (field.type === "select") {
        if (rawValue === "true") {
          nextSectionContent[field.key] = true;
        } else if (rawValue === "false") {
          nextSectionContent[field.key] = false;
        } else if (rawValue.trim()) {
          nextSectionContent[field.key] = rawValue;
        } else {
          delete nextSectionContent[field.key];
        }
      } else if (rawValue.trim()) {
        nextSectionContent[field.key] = rawValue;
      } else {
        delete nextSectionContent[field.key];
      }

      if (Object.keys(nextSectionContent).length > 0) {
        nextHomeSections[selectedSectionType] = nextSectionContent;
      } else {
        delete nextHomeSections[selectedSectionType];
      }

      if (Object.keys(nextHomeSections).length > 0) {
        nextContentOverrides.home = { sections: nextHomeSections };
      } else {
        delete nextContentOverrides.home;
      }

      const cleanedPageOverrides = stripHomePageFieldOverride(
        pageOverrides,
        selectedSectionType,
        field.key,
      );

      const nextTokensWithContent = upsertStorefrontContentOverridesInDesignTokens(
        designTokens,
        nextContentOverrides,
      );
      const nextTokens = upsertStorefrontPageOverridesInDesignTokens(
        nextTokensWithContent,
        cleanedPageOverrides,
      );

      onChange(nextTokens);
      return;
    }

    const baseSections = (baseTheme.pages.home?.sections || []) as SectionEntry[];
    const nextSections = homeSections.map((section) => {
      if (getSectionKey(section) !== getSectionKey(selectedSection)) {
        return section;
      }

      const baseSection = baseSections.find(
        (entry) => getSectionKey(entry) === getSectionKey(section),
      );
      const nextConfig = normalizeSectionConfig(section);
      const nextSettings = {
        ...(nextConfig.settings || {}),
      };

      if (field.type === "number") {
        const parsedValue = Number(rawValue);
        if (Number.isFinite(parsedValue) && parsedValue > 0) {
          nextSettings[field.key] = parsedValue;
        } else {
          delete nextSettings[field.key];
        }
      } else if (field.type === "select") {
        if (rawValue === "true") {
          nextSettings[field.key] = true;
        } else if (rawValue === "false") {
          nextSettings[field.key] = false;
        } else if (rawValue.trim()) {
          nextSettings[field.key] = rawValue;
        } else {
          delete nextSettings[field.key];
        }
      } else if (rawValue.trim()) {
        nextSettings[field.key] = rawValue;
      } else {
        delete nextSettings[field.key];
      }

      return finalizeSectionEntry(
        {
          ...nextConfig,
          settings: nextSettings,
        },
        baseSection,
      );
    });

    commitHomeSections(nextSections);
  };

  const handleVariantChange = (variant: string) => {
    if (!selectedSection) {
      return;
    }

    const baseSections = (baseTheme.pages.home?.sections || []) as SectionEntry[];
    const nextSections = homeSections.map((section) => {
      if (getSectionKey(section) !== getSectionKey(selectedSection)) {
        return section;
      }

      const baseSection = baseSections.find(
        (entry) => getSectionKey(entry) === getSectionKey(section),
      );

      return finalizeSectionEntry(
        {
          ...normalizeSectionConfig(section),
          variant,
        },
        baseSection,
      );
    });

    commitHomeSections(nextSections);
  };

  const handleRemoveSection = (sectionKey: string) => {
    const nextSections = homeSections.filter(
      (section) => getSectionKey(section) !== sectionKey,
    );
    commitHomeSections(nextSections);
  };

  const handleAddSection = (sectionType: string) => {
    if (homeSections.some((section) => getSectionType(section) === sectionType)) {
      const existingSection = homeSections.find(
        (section) => getSectionType(section) === sectionType,
      );
      if (existingSection) {
        setSelectedSectionKey(getSectionKey(existingSection));
      }
      setSidebarMode("current");
      return;
    }

    const nextSections = [...homeSections, sectionType];
    commitHomeSections(nextSections);
    setSelectedSectionKey(sectionType);
    setSidebarMode("current");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = homeSections.findIndex(
      (section) => getSectionKey(section) === active.id,
    );
    const newIndex = homeSections.findIndex(
      (section) => getSectionKey(section) === over.id,
    );

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    commitHomeSections(arrayMove(homeSections, oldIndex, newIndex));
  };

  const handleMoveSection = (direction: "up" | "down") => {
    if (!selectedSection) {
      return;
    }

    const currentIndex = homeSections.findIndex(
      (section) => getSectionKey(section) === getSectionKey(selectedSection),
    );
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (
      currentIndex === -1 ||
      targetIndex < 0 ||
      targetIndex >= homeSections.length
    ) {
      return;
    }

    commitHomeSections(arrayMove(homeSections, currentIndex, targetIndex));
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_90px_-62px_rgba(15,23,42,0.65)] dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white/90 px-5 py-5 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <SparklesIcon className="h-4 w-4" />
              المحرر المرئي
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white">
                محرر الصفحة الرئيسية المباشر
              </h4>
              <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
                نفس فكرة الشاشة اللي طلبتها: مكونات على اليمين، معاينة في المنتصف، وإعدادات القسم المحدد على اليسار.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDeviceMode("desktop")}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${
                deviceMode === "desktop"
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              }`}
            >
              <ComputerDesktopIcon className="h-4 w-4" />
              شاشات الكمبيوتر
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode("mobile")}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${
                deviceMode === "mobile"
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              }`}
            >
              <DevicePhoneMobileIcon className="h-4 w-4" />
              الهاتف
            </button>
          </div>
        </div>

        {homeValidationIssues.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            توجد {homeValidationIssues.length} ملاحظات على الصفحة الرئيسية. يمكنكِ تعديل الأقسام من هنا، ثم مراجعة التنبيهات قبل الحفظ النهائي.
          </div>
        ) : null}
      </div>

      <div className="grid gap-0 xl:grid-cols-[320px_minmax(0,1fr)_290px]" dir="ltr">
        <aside
          dir="rtl"
          className="order-2 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900 xl:order-1 xl:border-e xl:border-t-0"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-gray-900 dark:text-white">الإعدادات</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">القسم المحدد داخل المعاينة</div>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {selectedSection ? "نشط" : "اختيار"}
              </span>
            </div>

            {selectedSection ? (
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                  <div className="text-sm font-black text-gray-900 dark:text-white">
                    {getStorefrontSectionLabel(selectedSectionType)}
                  </div>
                  <div className="mt-1 text-xs leading-6 text-gray-500 dark:text-gray-400">
                    {selectedSectionManifest?.note ||
                      "يمكنك تعديل محتوى القسم وشكله بسرعة من نفس اللوحة."}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleMoveSection("up")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                      فوق
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSection("down")}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                      تحت
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(getSectionKey(selectedSection))}
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                    >
                      <EyeSlashIcon className="h-4 w-4" />
                      إخفاء القسم من الصفحة
                    </button>
                  </div>
                </div>

                {selectedSectionManifest?.variants?.length ? (
                  <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      شكل العرض
                    </label>
                    <select
                      value={getSectionVariant(selectedSection)}
                      onChange={(event) => handleVariantChange(event.target.value)}
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    >
                      <option value="">الوضع الافتراضي للقالب</option>
                      {selectedSectionManifest.variants.map((variant) => (
                        <option key={variant.value} value={variant.value}>
                          {variant.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {selectedSectionManifest?.fields?.length ? (
                  <div className="space-y-3">
                    {selectedSectionManifest.fields.map((field) => (
                      <div
                        key={`${selectedSectionType}-${field.key}`}
                        className="rounded-[1.5rem] border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60"
                      >
                        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
                          {field.label}
                        </label>

                        {field.type === "textarea" ? (
                          <textarea
                            rows={field.key === "subtitle" ? 3 : 4}
                            value={getFieldDisplayValue(selectedSectionSettings, field, contentOverrides, selectedSectionType)}
                            onChange={(event) =>
                              handleSectionFieldChange(field, event.target.value)
                            }
                            placeholder={field.placeholder}
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                          />
                        ) : field.type === "select" ? (
                          <select
                            value={getFieldDisplayValue(selectedSectionSettings, field, contentOverrides, selectedSectionType)}
                            onChange={(event) =>
                              handleSectionFieldChange(field, event.target.value)
                            }
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                          >
                            <option value="">اختيار من القائمة</option>
                            {field.options?.map((option) => (
                              <option key={`${field.key}-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                            value={getFieldDisplayValue(selectedSectionSettings, field, contentOverrides, selectedSectionType)}
                            onChange={(event) =>
                              handleSectionFieldChange(field, event.target.value)
                            }
                            placeholder={field.placeholder}
                            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                          />
                        )}

                        {selectedSectionType === "hero-banner" &&
                        field.key === "backgroundImage" &&
                        onOpenHeroImagePicker ? (
                          <button
                            type="button"
                            onClick={onOpenHeroImagePicker}
                            className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-950"
                          >
                            <PhotoIcon className="h-4 w-4" />
                            اختيار أو رفع صورة
                          </button>
                        ) : null}

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                          {contentManagedFieldKeys.has(field.key) ? (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 font-bold dark:bg-gray-800">
                              محتوى مباشر
                            </span>
                          ) : null}
                          {field.helperText ? <span>{field.helperText}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-white p-5 text-sm leading-7 text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                    هذا القسم لا يملك حقولًا مباشرة داخل المحرر الحالي، لكن يمكنك تحديده وإعادة ترتيبه أو استخدام الإعدادات المتقدمة بالأسفل.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-white p-5 text-sm leading-7 text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                اختاري قسمًا من المعاينة أو من قائمة المكونات حتى تظهر إعداداته هنا.
              </div>
            )}
          </div>
        </aside>

        <main
          dir="rtl"
          className="order-1 min-w-0 border-t border-gray-200 bg-gray-50/70 px-4 py-4 dark:border-gray-700 dark:bg-gray-950/40 xl:order-2 xl:border-t-0"
        >
          <StorefrontThemeProvider initialTheme={previewTheme as unknown as StorefrontThemeInput}>
            <PreviewShellInner
              theme={previewTheme}
              selectedSectionKey={selectedSectionKey}
              deviceMode={deviceMode}
              onSelectSection={setSelectedSectionKey}
            />
          </StorefrontThemeProvider>
        </main>

        <aside
          dir="rtl"
          className="order-3 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900 xl:border-s xl:border-t-0"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-gray-900 dark:text-white">المكونات</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">رتبي الأقسام أو أضيفي أقسامًا جاهزة</div>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {homeSections.length} أقسام
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-gray-100 p-1 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setSidebarMode("current")}
                className={`rounded-[1.2rem] px-3 py-2 text-sm font-semibold ${
                  sidebarMode === "current"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                العناصر الحالية
              </button>
              <button
                type="button"
                onClick={() => setSidebarMode("library")}
                className={`rounded-[1.2rem] px-3 py-2 text-sm font-semibold ${
                  sidebarMode === "library"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                الأقسام الجاهزة
              </button>
            </div>

            {sidebarMode === "current" ? (
              homeSections.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={homeSections.map((section) => getSectionKey(section))}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {homeSections.map((section) => (
                        <SortableSectionRow
                          key={getSectionKey(section)}
                          section={section}
                          selected={getSectionKey(section) === selectedSectionKey}
                          onSelect={() => setSelectedSectionKey(getSectionKey(section))}
                          onRemove={() => handleRemoveSection(getSectionKey(section))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-7 text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                  لا توجد أقسام حالية في الصفحة الرئيسية. افتحي &quot;الأقسام الجاهزة&quot; لإضافة أول قسم.
                </div>
              )
            ) : availableLibrarySections.length > 0 ? (
              <div className="space-y-3">
                {availableLibrarySections.map((section) => (
                  <button
                    key={section.type}
                    type="button"
                    onClick={() => handleAddSection(section.type)}
                    className="w-full rounded-[1.5rem] border border-gray-200 bg-white p-4 text-right shadow-sm transition hover:border-gray-900 hover:shadow-[0_16px_38px_-28px_rgba(15,23,42,0.7)] dark:border-gray-700 dark:bg-gray-900/60"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        <PlusIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-gray-900 dark:text-white">
                          {section.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                          {section.note}
                        </span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-7 text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400">
                كل الأقسام الجاهزة الموجودة في المكتبة مضافة بالفعل داخل الصفحة.
              </div>
            )}

            <div className="rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                <PaintBrushIcon className="h-5 w-5 text-gray-500" />
                ملاحظات سريعة
              </div>
              <div className="mt-3 space-y-2 text-xs leading-6 text-gray-500 dark:text-gray-400">
                <div>اسحبي البطاقات لإعادة ترتيب الأقسام بنفس فكرة الصورة المرجعية.</div>
                <div>الضغط على أي قسم داخل المعاينة يفتح إعداداته فورًا.</div>
                <div>حفظ التعديلات يتم من أزرار الحفظ الموجودة أعلى هذه الصفحة.</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default StorefrontVisualEditor;
