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
      <div className="bg-card border border-border/80 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <span>تسجيل طالب يدوياً في الدورة</span>
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition text-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              اسم الطالب *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمد عبد الله"
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              رقم الهاتف / واتساب *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010XXXXXXXX"
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              البريد الإلكتروني (اختياري)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              مدة الاشتراك بالأيام (اتركه فارغاً للاشتراك المؤبد)
            </label>
            <input
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="مثال: 90 أو 365"
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs font-mono tabular-nums"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={enrolling}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {enrolling && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>تأكيد التسجيل</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
