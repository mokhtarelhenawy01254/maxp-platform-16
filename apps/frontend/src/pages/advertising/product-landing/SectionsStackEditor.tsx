import React from "react";
import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from "lucide-react";
import { LandingSection, ProductLandingProduct } from "./types";
import { SectionItemEditor } from "./SectionItemEditor";

interface SectionsStackEditorProps {
  sections: LandingSection[];
  activeSectionId: string | null;
  onToggleActiveSection: (id: string) => void;
  onMoveSection: (index: number, direction: -1 | 1) => void;
  onRemoveSection: (id: string) => void;
  onUpdateSectionContent: (
    id: string,
    updatedContent: LandingSection["content"],
  ) => void;
  product?: ProductLandingProduct | null;
}

export const SectionsStackEditor: React.FC<SectionsStackEditorProps> = ({
  sections,
  activeSectionId,
  onToggleActiveSection,
  onMoveSection,
  onRemoveSection,
  onUpdateSectionContent,
  product,
}) => {
  return (
    <div className="eo-sections-stack">
      {sections.length === 0 ? (
        <div className="eo-canvas-empty-sections">
          <p>لا توجد أقسام مضافة بعد. اختر عنصراً من القائمة الجانبية لإضافته إلى الصفحة.</p>
        </div>
      ) : (
        sections.map((section, idx) => {
          const isActive = activeSectionId === section.id;

          return (
            <div
              key={section.id}
              className={`eo-section-block ${isActive ? "is-active" : ""}`}
            >
              <div
                className="eo-section-header"
                onClick={() => onToggleActiveSection(section.id)}
              >
                <div className="eo-sec-title">
                  <span className="eo-sec-num">#{idx + 1}</span>
                  <strong>{section.title}</strong>
                  <span className="eo-sec-type">{section.type}</span>
                </div>

                <div
                  className="eo-sec-controls"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onMoveSection(idx, -1)}
                    disabled={idx === 0}
                    title="تحريك لأعلى"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveSection(idx, 1)}
                    disabled={idx === sections.length - 1}
                    title="تحريك لأسفل"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`هل أنت متأكد من حذف قسم "${section.title}"؟`)) {
                        onRemoveSection(section.id);
                      }
                    }}
                    className="eo-btn-del"
                    title="حذف القسم"
                  >
                    <Trash2 size={15} />
                  </button>
                  <ChevronDown
                    size={18}
                    className={`eo-chevron ${isActive ? "is-open" : ""}`}
                  />
                </div>
              </div>

              {isActive && (
                <SectionItemEditor
                  section={section}
                  onUpdateContent={(updated) =>
                    onUpdateSectionContent(section.id, updated)
                  }
                  product={product}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
