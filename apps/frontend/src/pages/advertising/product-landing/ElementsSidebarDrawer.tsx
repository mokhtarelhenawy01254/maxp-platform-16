import React, { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { SIDEBAR_ITEMS, SectionType, SidebarCategory } from "./types";

interface ElementsSidebarDrawerProps {
  onAddSection: (type: SectionType) => void;
  onClose?: () => void;
  isMobileSheet?: boolean;
}

export const ElementsSidebarDrawer: React.FC<ElementsSidebarDrawerProps> = ({
  onAddSection,
  onClose,
  isMobileSheet = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SidebarCategory | "all">("all");

  const categories: Array<{ id: SidebarCategory | "all"; label: string }> = [
    { id: "all", label: "الكل" },
    { id: "media", label: "الصور والميديا" },
    { id: "commerce", label: "التجارة والشراء" },
    { id: "content", label: "العناوين والنصوص" },
    { id: "trust", label: "الثقة والضمانات" },
  ];

  const filteredItems = useMemo(() => {
    return SIDEBAR_ITEMS.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.label.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <aside className={`eo-builder-sidebar ${isMobileSheet ? "is-mobile-sheet" : ""}`} dir="rtl">
      <div className="eo-sidebar-head">
        <div className="eo-sidebar-head-title-row">
          <div>
            <h3>مكتبة عناصر الصفحة</h3>
            <p>اختر من بين 20+ عنصراً مخصصاً لرفع معدلات التحويل والمبيعات</p>
          </div>
          {onClose && (
            <button
              type="button"
              className="eo-sidebar-close-btn"
              onClick={onClose}
              aria-label="إغلاق القائمة"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="eo-sidebar-search">
        <Search size={14} className="eo-sidebar-search-icon" />
        <input
          type="text"
          placeholder="بحث في العناصر والأقسام..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="eo-sidebar-search-clear"
            onClick={() => setSearchQuery("")}
            aria-label="مسح البحث"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="eo-sidebar-categories">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`eo-cat-pill ${selectedCategory === cat.id ? "is-active" : ""}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="eo-sidebar-items">
        {filteredItems.length === 0 ? (
          <div className="eo-sidebar-no-results">
            <span>لا توجد عناصر مطابقة لبحثك</span>
          </div>
        ) : (
          filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                className="eo-sidebar-item-card"
                type="button"
                onClick={() => {
                  onAddSection(item.type);
                  onClose?.();
                }}
              >
                <div
                  className="eo-item-icon"
                  style={{ backgroundColor: item.iconBg }}
                >
                  <Icon size={18} />
                </div>
                <div className="eo-item-text">
                  <div className="eo-item-title-row">
                    <strong>{item.label}</strong>
                    <span className="eo-item-cat-tag">{item.categoryLabel}</span>
                  </div>
                  <span>{item.desc}</span>
                </div>
                <div className="eo-item-add-badge">
                  <Plus size={15} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

