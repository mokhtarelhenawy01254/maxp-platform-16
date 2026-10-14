import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  LifeBuoy,
  FileText,
  Clock,
  ShieldCheck,
  Send,
  Loader2,
} from "lucide-react";
import supportService from "../../services/supportService";

interface AttachmentFile {
  file: File;
  preview?: string;
}

const CATEGORIES = [
  { value: "technical", label: "مشكلة تقنية أو برمجية" },
  { value: "billing", label: "فواتير واشتراكات الحساب" },
  { value: "inquiry", label: "استفسار عن ميزة أو ربط" },
  { value: "suggestion", label: "اقتراح تطويري" },
  { value: "complaint", label: "شكوى أو بلاغ خلل" },
];

export const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: "",
    category: "technical",
    content: "",
  });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 10 * 1024 * 1024;

    if (attachments.length + files.length > maxFiles) {
      setError(`يمكنك رفع ${maxFiles} ملفات كحد أقصى`);
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
    if (!formData.subject.trim() || !formData.category || !formData.content.trim()) {
      setError("يرجى ملء جميع الحقول الإلزامية");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("subject", formData.subject);
      fd.append("category", formData.category);
      fd.append("content", formData.content);
      attachments.forEach((att) => fd.append("attachments", att.file));

      const data = await supportService.createTicket(fd);
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/support/tickets?ticket=${data.ticket.ticketId}`);
        }, 1500);
      } else {
        setError(data.message || "حدث خطأ في إنشاء التذكرة");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل إرسال تذكرة الدعم");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div dir="rtl" className="h-[calc(100vh-6rem)] flex items-center justify-center p-4">
        <div className="bg-card border border-border/70 rounded-2xl p-8 text-center max-w-md w-full shadow-lg space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h2 className="text-base font-bold text-foreground">تم إنشاء التذكرة بنجاح</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            تم استلام طلبك وتحويله للفريق المختص. جاري نقلك إلى منصة المحادثة...
          </p>
          <div className="pt-2">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/support")}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>مركز الدعم</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">فتح تذكرة جديدة</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-primary" />
            فتح تذكرة دعم فني جديدة (New Support Ticket)
          </h2>
          <p className="text-xs text-muted-foreground">
            أخبرنا عن مشكلتك أو استفسارك وسيقوم الفريق الهندسي بالرد عليك ومتابعة حالتك
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="px-3.5 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>إرسال التذكرة</span>
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>متوسط وقت الرد</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">أقل من 30 دقيقة</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Fast SLA</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>القسم والتصنيف</span>
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">توجيه آلي مباشر</span>
            <span className="text-[10px] font-mono text-muted-foreground">Auto-Routed</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>أمان وحماية المرفقات</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">تشفير تام 256-bit</span>
            <span className="text-[10px] font-mono text-muted-foreground">Secure Vault</span>
          </div>
        </div>
      </div>

      {/* Main Single-Surface Form */}
      <div className="bg-card border border-border/70 rounded-xl p-5 sm:p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="ticket-subject" className="block text-xs font-semibold text-foreground">
              عنوان التذكرة والموضوع *
            </label>
            <input
              id="ticket-subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="اكتب عنواناً واضحاً ومختصراً للمشكلة"
              className="w-full h-9 px-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ticket-category" className="block text-xs font-semibold text-foreground">
              نوع المشكلة أو الاستفسار *
            </label>
            <select
              id="ticket-category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full h-9 px-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ticket-content" className="block text-xs font-semibold text-foreground">
              شرح تفاصيل المشكلة *
            </label>
            <textarea
              id="ticket-content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="اشرح المشكلة بالتفصيل، مع ذكر أرقام الطلبات، الروابط، أو خطوات إعادة حدوث المشكلة..."
              rows={6}
              className="w-full p-3 text-xs rounded-lg border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed"
              required
            />
          </div>

          {/* Upload Dropzone */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground">
              إرفاق لقطات شاشة أو مستندات (اختياري)
            </label>
            <div className="border border-dashed border-border/80 hover:border-primary/60 rounded-xl p-5 text-center transition-colors bg-muted/10">
              <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs font-medium text-foreground mb-0.5">اسحب الملفات هنا أو اضغط للاختيار</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                الحد الأقصى: 5 ملفات (صور PNG, JPG, PDF) حتى 10MB لكل ملف
              </p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="ticket-file-upload"
              />
              <label
                htmlFor="ticket-file-upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-medium text-foreground cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>اختيار الملفات من جهازك</span>
              </label>
            </div>

            {/* Preview of attachments */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/70 bg-card text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {att.preview ? (
                        <img src={att.preview} alt="preview" className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate text-[11px]">{att.file.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {(att.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;
