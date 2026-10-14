import React, { useState } from "react";
import supportService from "../../services/supportService";
import { X, Send, Paperclip, Loader2, LifeBuoy } from "lucide-react";

interface NewTicketModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({ onClose, onCreated }) => {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("subject", subject);
      fd.append("category", category);
      fd.append("priority", priority);
      fd.append("content", message);
      if (file) fd.append("attachments", file);
      await supportService.createTicket(fd);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || "حدث خطأ أثناء إنشاء التذكرة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border/70 rounded-2xl shadow-xl w-full max-w-lg p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">إنشاء تذكرة دعم جديدة</h2>
              <p className="text-[11px] text-muted-foreground">تواصل مع الفريق الهندسي والدعم التقني</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-foreground">موضوع التذكرة</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              placeholder="مثال: استفسار حول ربط متجر ووكمرس أو خطأ في المزامنة"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">القسم</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="technical">الدعم التقني والبرمجي</option>
                <option value="billing">الفواتير والاشتراكات</option>
                <option value="inquiry">استفسار عام</option>
                <option value="suggestion">اقتراح تطويري</option>
                <option value="complaint">شكوى رسمية</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">درجة الأهمية</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-9 px-2.5 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="low">منخفضة (Low)</option>
                <option value="medium">متوسطة (Medium)</option>
                <option value="high">عالية (High)</option>
                <option value="critical">حرجة وعاجلة (Urgent)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-foreground">تفاصيل المشكلة والرسالة</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full p-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed"
              placeholder="اشرح المشكلة بالتفصيل، مع ذكر رقم الطلب أو الصفحة ذات الصلة..."
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-foreground">المرفقات (اختياري)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-border/80 bg-background text-foreground text-xs font-medium hover:bg-muted transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>إرسال التذكرة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTicketModal;
