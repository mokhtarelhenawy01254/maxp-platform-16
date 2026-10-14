import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Upload,
  X,
  AlertCircle,
  Lightbulb,
  Send,
  Loader2,
} from "lucide-react";
import supportService from "../../services/supportService";

interface AttachmentFile {
  file: File;
  preview?: string;
}

export const SuggestionFeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 3;
    const maxSize = 10 * 1024 * 1024;

    if (attachments.length + files.length > maxFiles) {
      setError(`يمكنك إرفاق ${maxFiles} ملفات كحد أقصى`);
      return;
    }

    const validFiles: AttachmentFile[] = [];
    files.forEach((file) => {
      if (file.size > maxSize) {
        setError(`حجم الملف ${file.name} كبير جداً (الحد الأقصى 10 ميجابايت)`);
        return;
      }
      const attachmentFile: AttachmentFile = { file };
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          attachmentFile.preview = ev.target?.result as string;
          setAttachments((prev) => [...prev, attachmentFile]);
        };
        reader.readAsDataURL(file);
      } else {
        validFiles.push(attachmentFile);
      }
    });

    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("يرجى كتابة تفاصيل اقتراحك");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      const subject = "اقتراح: " + content.trim().slice(0, 45) + (content.trim().length > 45 ? "..." : "");
      fd.append("subject", subject);
      fd.append("category", "suggestion");
      fd.append("priority", "medium");
      fd.append("content", content.trim());
      attachments.forEach((att) => fd.append("attachments", att.file));

      const data = await supportService.createTicket(fd);
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || "حدث خطأ أثناء إرسال الاقتراح");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل إرسال الاقتراح");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div dir="rtl" className="h-[calc(100vh-6rem)] flex items-center justify-center p-4">
        <div className="bg-card border border-border/70 rounded-2xl p-8 text-center max-w-md w-full shadow-lg space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Lightbulb className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">وصلنا اقتراحك — شكرًا!</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تم تسجيل اقتراحك بنجاح وسيقوم فريق التطوير بمراجعته بعناية.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer active:scale-[0.98]"
            >
              العودة للوحة التحكم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto space-y-4 py-2 sm:py-4">
      {/* Header Bar */}
      <div className="bg-card border border-border/70 rounded-xl p-4 sm:p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span>رجوع</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-xs font-semibold text-foreground">اقتراحك يهمنا</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center justify-center shrink-0">
            <Lightbulb className="size-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">شاركنا اقتراحك لتطوير المنصة</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              كل ميزة في MaxP بدأت باقتراح من تاجر. اكتب فكرتك أو الميزة التي تحتاجها وسندرسها بجدية.
            </p>
          </div>
        </div>
      </div>

      {/* Main Single-Field Form Chassis */}
      <div className="bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="suggestion-content" className="block text-xs font-semibold text-foreground">
              اكتب اقتراحك بالتفصيل *
            </label>
            <textarea
              id="suggestion-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="صف فكرتك، الميزة المطلوبة، أو كيف يمكن تحسين المنصة لتخدم أعمالك بشكل أفضل..."
              rows={6}
              className="w-full p-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed resize-y"
              required
            />
          </div>

          {/* Optional Attachments Dropzone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                مرفقات توضيحية (اختياري)
              </label>
              <span className="text-[11px] text-muted-foreground">صورة أو سكرين شوت (حتى 3 ملفات)</span>
            </div>

            <div className="border border-dashed border-border/80 rounded-lg p-3 text-center bg-muted/10 hover:bg-muted/20 transition-colors">
              <input
                type="file"
                id="suggestion-attachments"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={attachments.length >= 3}
              />
              <label
                htmlFor="suggestion-attachments"
                className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
              >
                <Upload className="w-4 h-4 text-primary" />
                <span>اضغط لإرفاق سكرين شوت أو ملف توضيحي</span>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="relative group border border-border/70 rounded-lg p-1.5 bg-background flex items-center justify-between text-xs"
                  >
                    <span className="truncate text-[11px] text-muted-foreground max-w-[80%]">
                      {att.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Action Bar */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>إرسال الاقتراح</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuggestionFeedbackPage;
