import React from "react";

interface UserbotConfig {
  id: string;
  label: string;
}

interface ContactItem {
  id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
}

interface TelegramGroupCreateDialogProps {
  open: boolean;
  formData: {
    userbotConfigId: string;
    title: string;
    about: string;
    isPublic: boolean;
    type: "CHANNEL" | "GROUP";
    users: string[];
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      userbotConfigId: string;
      title: string;
      about: string;
      isPublic: boolean;
      type: "CHANNEL" | "GROUP";
      users: string[];
    }>
  >;
  userbots: UserbotConfig[];
  contacts: ContactItem[];
  loading: boolean;
  onClose: () => void;
  onCreate: () => void;
}

export const TelegramGroupCreateDialog: React.FC<TelegramGroupCreateDialogProps> = ({
  open,
  formData,
  setFormData,
  userbots,
  contacts,
  loading,
  onClose,
  onCreate,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border/80 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
        <div className="border-b border-border/70 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {formData.type === "CHANNEL" ? "إنشاء قناة Telegram جديدة" : "إنشاء مجموعة جديدة"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            إلغاء
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block mb-1 font-medium text-foreground">حساب الـ Userbot المشغّل</label>
            <select
              value={formData.userbotConfigId}
              onChange={(e) =>
                setFormData((p) => ({ ...p, userbotConfigId: e.target.value }))
              }
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              {userbots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium text-foreground">
              {formData.type === "CHANNEL" ? "اسم القناة" : "اسم المجموعة"}
            </label>
            <input
              type="text"
              placeholder={formData.type === "CHANNEL" ? "قناة العروض الحصرية" : "مجموعة الدعم الفني"}
              value={formData.title}
              onChange={(e) =>
                setFormData((p) => ({ ...p, title: e.target.value }))
              }
              className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {formData.type === "CHANNEL" && (
            <>
              <div>
                <label className="block mb-1 font-medium text-foreground">وصف القناة</label>
                <textarea
                  rows={3}
                  placeholder="نبذة عن محتوى وتخصص القناة..."
                  value={formData.about}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, about: e.target.value }))
                  }
                  className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-foreground">نوع الوصول</label>
                <select
                  value={String(formData.isPublic)}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      isPublic: e.target.value === "true",
                    }))
                  }
                  className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="false">قناة خاصة (Private)</option>
                  <option value="true">قناة عامة (Public)</option>
                </select>
              </div>
            </>
          )}

          {formData.type === "GROUP" && (
            <div>
              <label className="block mb-1 font-medium text-foreground">إضافة أعضاء أوليين (اختياري)</label>
              <select
                value={formData.users[0] || ""}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, users: [e.target.value] }))
                }
                className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              >
                <option value="">اختر جهة اتصال أولية...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.telegramId}>
                    {c.firstName} {c.lastName} ({c.telegramId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border/70 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-muted/40 text-foreground hover:bg-muted/70 border border-border/70 transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "جاري الإنشاء..." : "إنشاء الآن"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default TelegramGroupCreateDialog;
