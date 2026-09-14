import React, { useState } from "react";
import { X, Sparkles, Check, LayoutTemplate, Layers, AlertTriangle } from "lucide-react";
import { LandingTemplate, LANDING_TEMPLATES, ProductLandingProduct } from "./types";

interface TemplatesLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (template: LandingTemplate) => void;
  product?: ProductLandingProduct | null;
  currentSectionsCount: number;
}

export const TemplatesLibraryModal: React.FC<TemplatesLibraryModalProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
  product,
  currentSectionsCount,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  if (!isOpen) return null;

  const handleChoose = (template: LandingTemplate) => {
    if (currentSectionsCount > 0) {
      setSelectedTemplateId(template.id);
      setConfirmReplace(true);
    } else {
      onApplyTemplate(template);
      onClose();
    }
  };

  const handleConfirm = () => {
    const template = LANDING_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (template) {
      onApplyTemplate(template);
    }
    setConfirmReplace(false);
    setSelectedTemplateId(null);
    onClose();
  };

  return (
    <div className="eo-modal-overlay" onClick={onClose}>
      <div
        className="eo-modal-card eo-templates-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 860,
          width: "92%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: 14,
          background: "#ffffff",
          boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                مكتبة قوالب صفحات الهبوط الجاهزة
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
                اختر قالباً تسويقياً متكاملاً ومجرّباً لتحقيق أعلى معدل تحويل (CRO) لمنتجك
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              borderRadius: 8,
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Templates Grid */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 16,
          }}
        >
          {LANDING_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                background: "#ffffff",
                transition: "all 0.15s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = tmpl.previewColor || "#3b82f6";
                e.currentTarget.style.boxShadow = "0 8px 20px -6px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 20,
                    background: `${tmpl.previewColor || "#3b82f6"}15`,
                    color: tmpl.previewColor || "#3b82f6",
                    border: `1px solid ${tmpl.previewColor || "#3b82f6"}30`,
                  }}
                >
                  {tmpl.badge}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Layers size={13} />
                  {tmpl.sectionsCount} أقسام
                </span>
              </div>

              <h4 style={{ margin: "4px 0 6px", fontSize: "0.98rem", fontWeight: 700, color: "#1e293b" }}>
                {tmpl.name}
              </h4>

              <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5, flex: 1 }}>
                {tmpl.desc}
              </p>

              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={() => handleChoose(tmpl)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "8px 14px",
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#1e293b")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#0f172a")}
                >
                  <Sparkles size={14} style={{ color: "#fbbf24" }} />
                  تطبيق هذا القالب
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Confirmation overlay if replacing current sections */}
        {confirmReplace && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15, 23, 42, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              zIndex: 10,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 12,
                padding: "24px",
                maxWidth: 440,
                width: "100%",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#fef2f2",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <AlertTriangle size={24} />
              </div>
              <h4 style={{ margin: "0 0 8px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                استبدال الأقسام الحالية؟
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                الصفحة الحالية تحتوي بالفعل على <strong>{currentSectionsCount}</strong> أقسام. تطبيق القالب الجديد سيستبدل أقسام الصفحة الحالية بأقسام القالب المختار.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setConfirmReplace(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  إلغاء التراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: "#ef4444",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  نعم، استبدال بالقالب
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
