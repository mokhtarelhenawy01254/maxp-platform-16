import React, { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";
import { LandingSection, ProductLandingProduct, SECTION_VARIANTS_MAP } from "./types";
import { SectionItemEditor } from "./SectionItemEditor";

interface SectionsStackEditorProps {
  sections: LandingSection[];
  activeSectionId: string | null;
  onToggleActiveSection: (id: string) => void;
  onMoveSection: (index: number, direction: -1 | 1) => void;
  onReorderSections?: (sourceIndex: number, targetIndex: number) => void;
  onRemoveSection: (id: string) => void;
  onDuplicateSection?: (id: string) => void;
  onToggleEnabled?: (id: string) => void;
  onUpdateSectionContent: (
    id: string,
    updatedContent: LandingSection["content"],
  ) => void;
  onUpdateSectionVariant?: (id: string, variant: string) => void;
  product?: ProductLandingProduct | null;
}

export const SectionsStackEditor: React.FC<SectionsStackEditorProps> = ({
  sections,
  activeSectionId,
  onToggleActiveSection,
  onMoveSection,
  onReorderSections,
  onRemoveSection,
  onDuplicateSection,
  onToggleEnabled,
  onUpdateSectionContent,
  onUpdateSectionVariant,
  product,
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  return (
    <div className="eo-sections-stack">
      {sections.length === 0 ? (
        <div className="eo-canvas-empty-sections">
          <p>لا توجد أقسام مضافة بعد. اختر عنصراً من القائمة الجانبية لإضافته إلى الصفحة.</p>
        </div>
      ) : (
        sections.map((section, idx) => {
          const isActive = activeSectionId === section.id;
          const isEnabled = section.enabled !== false;
          const variants = SECTION_VARIANTS_MAP[section.type];
          const isDragging = draggedIdx === idx;
          const isDragOver = dragOverIdx === idx;

          return (
            <div
              key={section.id}
              className={`eo-section-block ${isActive ? "is-active" : ""} ${!isEnabled ? "is-disabled" : ""} ${isDragging ? "is-dragging" : ""} ${isDragOver ? "is-drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOverIdx !== idx) {
                  setDragOverIdx(idx);
                }
              }}
              onDragLeave={() => {
                if (dragOverIdx === idx) {
                  setDragOverIdx(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData("text/plain");
                const fromIdx = draggedIdx !== null ? draggedIdx : Number(raw);
                if (!isNaN(fromIdx) && fromIdx !== idx && onReorderSections) {
                  onReorderSections(fromIdx, idx);
                }
                setDraggedIdx(null);
                setDragOverIdx(null);
              }}
            >
              <div
                className="eo-section-header"
                onClick={() => onToggleActiveSection(section.id)}
              >
                <div className="eo-sec-title">
                  <div
                    className="eo-drag-handle"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(idx));
                      setDraggedIdx(idx);
                    }}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    title="اسحب لإعادة الترتيب (Drag & Drop)"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical size={16} />
                  </div>
                  <span className="eo-sec-num">#{idx + 1}</span>
                  <strong>{section.title}</strong>
                  <span className="eo-sec-type">{section.type}</span>
                  {!isEnabled && (
                    <span className="eo-disabled-tag">مخفي</span>
                  )}
                </div>

                {variants && variants.length > 1 && onUpdateSectionVariant && (
                  <div
                    className="eo-variant-switcher-bar"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="eo-variant-label">النمط:</span>
                    <div className="eo-variant-pills">
                      {variants.map((v) => {
                        const isSelected = (section.variant || variants[0].id) === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            className={`eo-variant-pill ${isSelected ? "is-selected" : ""}`}
                            onClick={() => onUpdateSectionVariant(section.id, v.id)}
                            title={v.desc}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div
                  className="eo-sec-controls"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onToggleEnabled && (
                    <button
                      type="button"
                      onClick={() => onToggleEnabled(section.id)}
                      className={isEnabled ? "eo-btn-ctrl-active" : "eo-btn-ctrl-muted"}
                      title={isEnabled ? "إخفاء القسم من العرض" : "إظهار القسم"}
                    >
                      {isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  )}

                  {onDuplicateSection && (
                    <button
                      type="button"
                      onClick={() => onDuplicateSection(section.id)}
                      title="نسخ وتكرار هذا القسم (Duplicate)"
                    >
                      <Copy size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onMoveSection(idx, -1)}
                    disabled={idx === 0}
                    title="تحريك لأعلى"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveSection(idx, 1)}
                    disabled={idx === sections.length - 1}
                    title="تحريك لأسفل"
                  >
                    <ArrowDown size={14} />
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
                    <Trash2 size={14} />
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
