import React, { useState, useMemo } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
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
    return Object.entries(STOREFRONT_SECTION_MANIFEST).map(([type, manifest]) => ({
      type,
      label: getStorefrontSectionLabel(type),
      note: manifest.note || "قسم جاهز وقابل للتخصيص الكامل.",
      icon: (manifest as any).icon || "📦",
    }));
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
              <h2 className="text-base font-black text-foreground">مكتبة الأقسام الجاهزة</h2>
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
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body (Categories Sidebar + Sections Grid) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Categories Sidebar */}
          <aside className="w-56 border-e border-border/80 bg-muted/20 p-3 space-y-1 overflow-y-auto">
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
          <main className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSections.map((section) => (
                <div
                  key={section.type}
                  className="group relative flex flex-col justify-between rounded-3xl border border-border/80 bg-background/50 p-5 transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{section.icon}</span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {section.type}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                      {section.label}
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {section.note}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onAddSection(section.type);
                      onClose();
                    }}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-2.5 text-xs font-bold text-foreground transition-all hover:bg-primary hover:text-primary-foreground active:scale-98"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>إضافة إلى الصفحة</span>
                  </button>
                </div>
              ))}
            </div>

            {filteredSections.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-muted-foreground">لم يتم العثور على أقسام مطابقة</p>
                <p className="mt-1 text-xs text-muted-foreground/60">جرب البحث بكلمة أخرى أو اختر تصنيفاً مختلفاً</p>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
};
