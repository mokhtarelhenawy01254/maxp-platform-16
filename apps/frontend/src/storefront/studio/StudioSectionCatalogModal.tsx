import React, { useState, useMemo, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
  Squares2X2Icon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import { STUDIO_SECTION_CATEGORIES } from "./StudioTypes";
import { getStorefrontSectionLabel, STOREFRONT_SECTION_MANIFEST } from "../sections/manifest";
import {
  APP_SECTION_PRESETS,
  getAllAppPresetSections,
  searchAppSectionPresets,
} from "../presets/appSectionPresets";

interface StudioSectionCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSection: (sectionType: string, initialSettings?: Record<string, unknown>) => void;
}

export const StudioSectionCatalogModal: React.FC<StudioSectionCatalogModalProps> = ({
  isOpen,
  onClose,
  onAddSection,
}) => {
  const [activeTab, setActiveTab] = useState<"standard" | "apps">("standard");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAppId, setSelectedAppId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const availableSections = useMemo(() => {
    return Object.entries(STOREFRONT_SECTION_MANIFEST)
      .filter(([_, manifest]) => !(manifest as any).legacy)
      .map(([type, manifest]) => {
        const entry = manifest as any;
        return {
          id: type,
          type,
          label: getStorefrontSectionLabel(type),
          note: (entry.note as string) || "قسم جاهز وقابل للتخصيص الكامل.",
          icon: (entry.icon as string) || "📦",
          is2026: false,
          badge: undefined as string | undefined,
          initialSettings: undefined as Record<string, unknown> | undefined,
        };
      });
  }, []);

  const totalAppSectionsCount = useMemo(() => {
    return getAllAppPresetSections().length;
  }, []);

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (activeTab === "apps") {
      const appMatches = searchAppSectionPresets(query);
      return appMatches
        .filter((item) => selectedAppId === "all" || item.appId === selectedAppId)
        .map((item) => ({
          id: item.id,
          type: item.type,
          label: item.label,
          note: item.description,
          icon: item.icon || "📱",
          is2026: false,
          badge: item.badge,
          initialSettings: item.settings,
          appId: item.appId,
          appName: item.appName,
          category: item.category,
        }));
    }

    // activeTab === "standard"
    if (query) {
      const standardMatches = availableSections.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          item.note.toLowerCase().includes(query)
      );

      const appMatches = searchAppSectionPresets(query).map((item) => ({
        id: item.id,
        type: item.type,
        label: item.label,
        note: item.description,
        icon: item.icon || "📱",
        is2026: false,
        badge: item.badge,
        initialSettings: item.settings,
        appId: item.appId,
        appName: item.appName,
        category: item.category,
      }));

      return [...standardMatches, ...appMatches];
    }

    if (selectedCategory === "all") {
      return availableSections;
    }

    const activeCategoryDef = STUDIO_SECTION_CATEGORIES.find((c) => c.id === selectedCategory);

    return availableSections.filter((item) => {
      if (!activeCategoryDef) return true;
      return (
        activeCategoryDef.types.includes(item.type) ||
        item.type.toLowerCase().includes(selectedCategory)
      );
    });
  }, [activeTab, availableSections, searchQuery, selectedAppId, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">مكتبة الأقسام الجاهزة 2026</h2>
              <p className="text-xs text-muted-foreground">اختر قسماً جاهزاً لإضافته إلى صفحتك بلمسة واحدة</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative w-64">
              <MagnifyingGlassIcon className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                data-testid="section-catalog-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن قسم أو تطبيق..."
                className="w-full rounded-xl border border-border bg-background ps-9 pe-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation: General Sections vs Apps */}
        <div className="flex items-center gap-2 border-b border-border/80 px-6 py-2.5 bg-muted/20">
          <button
            type="button"
            data-testid="tab-standard-sections"
            onClick={() => {
              setActiveTab("standard");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeTab === "standard"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Squares2X2Icon className="h-4 w-4" />
            <span>الأقسام العامة</span>
          </button>
          <button
            type="button"
            data-testid="tab-app-presets"
            onClick={() => {
              setActiveTab("apps");
              setSearchQuery("");
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeTab === "apps"
                ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 text-primary"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <RectangleGroupIcon className="h-4 w-4" />
            <span>التطبيقات</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
              {APP_SECTION_PRESETS.length} تطبيق
            </span>
          </button>
        </div>

        {/* Body (Categories/Apps Sidebar + Sections Grid) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 border-e border-border/80 bg-muted/20 p-3 space-y-1 overflow-y-auto">
            {activeTab === "standard" ? (
              STUDIO_SECTION_CATEGORIES.map((category) => {
                const isActive = selectedCategory === category.id && !searchQuery;
                return (
                  <button
                    key={category.id}
                    type="button"
                    data-testid={`category-btn-${category.id}`}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSearchQuery("");
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all text-start ${
                      isActive
                        ? "bg-card text-foreground shadow-sm ring-1 ring-border/50"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <span className="text-base">{category.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate">{category.title}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <>
                <button
                  type="button"
                  data-testid="app-filter-all"
                  onClick={() => {
                    setSelectedAppId("all");
                    setSearchQuery("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-start ${
                    selectedAppId === "all" && !searchQuery
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">📱</span>
                    <span className="truncate">جميع التطبيقات</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">({totalAppSectionsCount})</span>
                </button>
                <div className="my-1 border-t border-border/40" />
                {APP_SECTION_PRESETS.map((app) => {
                  const isActive = selectedAppId === app.appId && !searchQuery;
                  return (
                    <button
                      key={app.appId}
                      type="button"
                      data-testid={`app-filter-${app.appId}`}
                      onClick={() => {
                        setSelectedAppId(app.appId);
                        setSearchQuery("");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all text-start ${
                        isActive
                          ? "bg-card text-foreground shadow-sm ring-1 ring-border/50 text-primary"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{app.icon}</span>
                        <p className="truncate">{app.appName}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ms-1">
                        ({app.sections.length})
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </aside>

          {/* Sections Grid */}
          <main className="flex-1 overflow-y-auto p-6 [scrollbar-width:none]">
            {filteredSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-3">🔍</span>
                <p className="text-sm font-bold text-foreground">لم يتم العثور على نتائج مطابقة</p>
                <p className="text-xs text-muted-foreground mt-1">
                  جرب البحث بكلمات أخرى أو تصفح تبويب التطبيقات
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {filteredSections.map((section) => (
                  <div
                    key={section.id || section.type}
                    data-testid="section-catalog-card"
                    className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-background/50 p-4 transition-all hover:border-primary/50 hover:bg-card hover:shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl shrink-0">{section.icon}</span>
                          <h3 className="text-xs font-black text-foreground truncate">{section.label}</h3>
                        </div>
                        {section.badge ? (
                          <span
                            data-testid="app-preset-badge"
                            className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary border border-primary/20"
                          >
                            {section.badge}
                          </span>
                        ) : section.is2026 ? (
                          <span className="shrink-0 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            ✨ جديد 2026
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
                        {section.note}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3">
                      <button
                        type="button"
                        data-testid="insert-section-btn"
                        onClick={() => {
                          onAddSection(section.type, section.initialSettings);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow transition-all hover:bg-primary/90 active:scale-95"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        <span>إدراج بالصفحة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
