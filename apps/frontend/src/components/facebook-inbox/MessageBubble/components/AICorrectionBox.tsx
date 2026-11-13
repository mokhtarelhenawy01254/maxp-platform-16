import React, { useState } from "react";
import { Bot, Pencil } from "lucide-react";
import { apiClient } from "@/services/apiClient";

export interface AICorrectionBoxProps {
  messageId: string;
  conversationId: string;
  initialContent?: string;
  isCustomer: boolean;
  onCorrect?: () => void;
}

export interface AICorrectionBadgeProps {
  isEditing: boolean;
  onStartEditing: () => void;
}

export const AICorrectionBadge: React.FC<AICorrectionBadgeProps> = ({
  isEditing,
  onStartEditing,
}) => {
  return (
    <div
      className="mt-2 pt-1.5 flex justify-between items-center text-[10px]"
      style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}
    >
      <span className="inline-flex items-center gap-1" style={{ color: "rgba(255, 255, 255, 0.75)" }}>
        <Bot className="w-3 h-3 text-white/70" />
        <span>رد تلقائي من الوكيل</span>
      </span>
      {!isEditing && (
        <button
          type="button"
          onClick={onStartEditing}
          className="inline-flex items-center gap-1 hover:underline font-medium cursor-pointer text-white"
        >
          <Pencil className="w-2.5 h-2.5 text-white/80" />
          <span>تصحيح الرد</span>
        </button>
      )}
    </div>
  );
};

export interface AICorrectionEditorProps {
  isEditing: boolean;
  isCustomer: boolean;
  correctionText: string;
  saving: boolean;
  onChangeText: (text: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export const AICorrectionEditor: React.FC<AICorrectionEditorProps> = ({
  isEditing,
  isCustomer,
  correctionText,
  saving,
  onChangeText,
  onCancel,
  onSubmit,
}) => {
  if (!isEditing) return null;

  return (
    <div className={`mt-2 flex ${isCustomer ? "justify-start" : "justify-end"}`}>
      <div
        className="w-full rounded-xl p-3 space-y-2"
        style={{
          background: "var(--color-muted)",
          border: "1px solid var(--business-card-border)",
        }}
      >
        <div
          className="text-xs font-semibold"
          style={{ color: "var(--color-foreground)" }}
        >
          تصحيح رد الوكيل:
        </div>
        <textarea
          value={correctionText}
          onChange={(e) => onChangeText(e.target.value)}
          className="w-full min-h-[60px] p-2 text-sm rounded border outline-none resize-none"
          style={{
            background: "var(--color-background)",
            color: "var(--color-foreground)",
            borderColor: "var(--business-card-border)",
          }}
          placeholder="اكتب الرد الصحيح للعميل هنا لتعليم الوكيل وتصحيح الخطأ..."
        />
        <div className="flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded font-medium"
            style={{
              background: "var(--color-secondary)",
              color: "var(--color-secondary-foreground)",
            }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !correctionText.trim()}
            className="px-3 py-1.5 rounded font-medium disabled:opacity-50"
            style={{ background: "var(--color-primary)", color: "white" }}
          >
            {saving ? "جاري الحفظ..." : "حفظ وتصحيح"}
          </button>
        </div>
      </div>
    </div>
  );
};

export const useAICorrection = ({
  messageId,
  conversationId,
  content,
  onCorrect,
}: {
  messageId: string;
  conversationId: string;
  content?: string;
  onCorrect?: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    setIsEditing(true);
    setCorrectionText(content || "");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setCorrectionText("");
  };

  const submitCorrection = async () => {
    if (!correctionText.trim()) return;
    setSaving(true);
    try {
      await apiClient.post(
        `/api/v1/unified-inbox/conversations/${conversationId}/messages/${messageId}/correct`,
        { correction: correctionText.trim() },
      );
      setIsEditing(false);
      setCorrectionText("");
      if (onCorrect) {
        onCorrect();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || "فشل إرسال التصحيح");
    } finally {
      setSaving(false);
    }
  };

  return {
    isEditing,
    correctionText,
    saving,
    setCorrectionText,
    startEditing,
    cancelEditing,
    submitCorrection,
  };
};
