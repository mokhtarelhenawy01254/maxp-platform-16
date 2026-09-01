import React, { useState, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
  BoltIcon,
  FilmIcon,
} from "@heroicons/react/24/outline";
import { STUDIO_SECTION_CATEGORIES } from "./StudioTypes";
import { getStorefrontSectionLabel, getStorefrontSectionManifest, STOREFRONT_SECTION_MANIFEST } from "../sections/manifest";

interface StudioSectionCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSection: (sectionType: string) => void;
}

export const StudioSectionCatalogModal: React.FC<StudioSectionCatalogModalProps> = ({
  isOpen,
  onClose,
  onAddSection,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("hero");
  const [searchQuery, setSearchQuery] = useState("");

  const availableSections = useMemo(() => {
    const base = Object.entries(STOREFRONT_SECTION_MANIFEST).map(([type, manifest]) => ({
      type,
      label: getStorefrontSectionLabel(type),
      note: manifest.note || "قسم جاهز وقابل للتخصيص الكامل.",
      icon: (manifest as any).icon || "📦",
      is2026: false,
    }));

    // Add 2026 conversion sections if not present
    const modernSections = [
      {
        type: "shoppable-reels",
        label: "فيديوهات ريلز للشراء الفوري (Shoppable Reels)",
        note: "عرض فيديوهات ريلز وتيك توك مع نافذة شراء مباشرة للمنتج أثناء المشاهدة.",
        icon: "🎬",
        is2026: true,
      },
      {
        type: "flash-sale-timer",
        label: "مؤقت الفلاش سيل التنازلي (Urgency Timer)",
        note: "عداد تنازلي لعروض الساعات الأخيرة مع شريط المخزون المتبقي لرفع التحويل.",
        icon: "⚡",
        is2026: true,
      },
    ];

    return [...modernSections, ...base];
  }, []);

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const activeCategoryDef = STUDIO_SECTION_CATEGORIES.find((c) => c.id === selectedCategory);

    return availableSections.filter((item) => {
      const matchesSearch =
        !query ||
        item.label.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.note.toLowerCase().includes(query);

      if (query) return matchesSearch;

      if (!activeCategoryDef) return true;
      return (
        activeCategoryDef.types.includes(item.type) ||
        item.type.toLowerCase().includes(selectedCategory)
      );
    });
  }, [availableSections, searchQuery, selectedCategory]);

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث عن قسم..."
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

        {/* Body (Categories Sidebar + Sections Grid) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Categories Sidebar */}
          <aside className="w-60 border-e border-border/80 bg-muted/20 p-3 space-y-1 overflow-y-auto">
            {STUDIO_SECTION_CATEGORIES.map((category) => {
              const isActive = selectedCategory === category.id && !searchQuery;
              return (
                <button
                  key={category.id}
                  type="button"
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
            })}
          </aside>

          {/* Sections Grid */}
          <main className="flex-1 overflow-y-auto p-6 [scrollbar-width:none]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {filteredSections.map((section) => (
                <div
                  key={section.type}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-background/50 p-4 transition-all hover:border-primary/50 hover:bg-card hover:shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{section.icon}</span>
                        <h3 className="text-xs font-black text-foreground">{section.label}</h3>
                      </div>
                      {section.is2026 && (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          ✨ جديد 2026
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {section.note}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {section.type}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onAddSection(section.type);
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
          </main>
        </div>
      </div>
    </div>
  );
};
