import React from "react";
import { ChevronRight, Plus } from "lucide-react";
import { SIDEBAR_ITEMS, SectionType } from "./types";

interface ElementsSidebarDrawerProps {
  onAddSection: (type: SectionType) => void;
}

export const ElementsSidebarDrawer: React.FC<ElementsSidebarDrawerProps> = ({
  onAddSection,
}) => {
  return (
    <aside className="eo-builder-sidebar" dir="rtl">
      <div className="eo-sidebar-head">
        <h3>العناصر المتاحة</h3>
        <p>اضغط لإضافة أي عنصر إلى صفحة الهبوط</p>
      </div>

      <div className="eo-sidebar-items">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.type}
            className="eo-sidebar-item-card"
            type="button"
            onClick={() => onAddSection(item.type)}
          >
            <div className="eo-item-icon" style={{ backgroundColor: item.iconBg }}>
              {item.icon}
            </div>
            <div className="eo-item-text">
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </div>
            <div className="eo-item-add-badge">
              <Plus size={16} />
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};
