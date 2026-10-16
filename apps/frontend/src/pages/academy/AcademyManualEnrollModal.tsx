import { useState, type FormEvent } from "react";
import { UserPlus, Loader2, X } from "lucide-react";

interface AcademyManualEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (student: {
    name: string;
    phone: string;
    email?: string;
    days?: number;
  }) => Promise<void>;
}

export function AcademyManualEnrollModal({
  isOpen,
  onClose,
  onEnroll,
}: AcademyManualEnrollModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    try {
      setEnrolling(true);
      await onEnroll({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        days: days ? Number(days) : undefined,
      });
      setName("");
      setPhone("");
      setEmail("");
      setDays("");
      onClose();
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl text-foreground text-right">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                تسجيل طالب يدوياً في الدورة
              </h3>
              <p className="text-[11px] text-muted-foreground">إضافة صلاحية وصول مباشر بدون دفع إلكتروني</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              اسم الطالب <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمد عبد الله"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              رقم الهاتف / واتساب <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010XXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tabular-nums dir-ltr text-right transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              البريد الإلكتروني <span className="text-muted-foreground font-normal">(اختياري)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono dir-ltr text-right transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              مدة الاشتراك بالأيام <span className="text-muted-foreground font-normal">(اتركه فارغاً للاشتراك المؤبد)</span>
            </label>
            <input
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="مثال: 90 أو 365"
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-input text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tabular-nums transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={enrolling}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 active:scale-[0.98] flex items-center gap-1.5"
            >
              {enrolling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>تأكيد التسجيل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
