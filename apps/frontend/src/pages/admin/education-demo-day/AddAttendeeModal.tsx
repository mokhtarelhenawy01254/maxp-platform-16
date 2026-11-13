import React, { useState } from "react";
import { X, UserPlus, Check, AlertCircle } from "lucide-react";

interface AddAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (data: any) => Promise<void>;
  demoDayTitle: string;
  isEn?: boolean;
}

export function AddAttendeeModal({
  isOpen,
  onClose,
  onRegister,
  demoDayTitle,
  isEn = false,
}: AddAttendeeModalProps) {
  const [studentName, setStudentName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [grade, setGrade] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !phone.trim()) {
      setError(isEn ? "Student name and phone number are required" : "اسم الطالب ورقم الهاتف مطلوبان");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onRegister({
        studentName: studentName.trim(),
        guardianName: guardianName.trim() || null,
        phone: phone.trim(),
        phone2: phone2.trim() || null,
        email: email.trim() || null,
        age: age ? Number(age) : null,
        grade: grade.trim() || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to register attendee" : "فشل تسجيل الحاضر"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isEn ? "Register Demo Day Attendee" : "تسجيل حاضر في الديمو داي"}
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-xs">
                {demoDayTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isEn ? "Close modal" : "إغلاق النافذة"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                {isEn ? "Student Name" : "اسم الطالب"} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={isEn ? "e.g. Omar Mokhtar" : "مثال: عمر مختار"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Guardian Name (Parent)" : "اسم ولي الأمر"}
              </label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder={isEn ? "e.g. Mokhtar Elhenawy" : "مثال: مختار الهنداوي"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                {isEn ? "Phone (WhatsApp)" : "رقم الهاتف (الواتساب)"} <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                dir="ltr"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Alternative Phone (Optional)" : "رقم هاتف بديل"}
              </label>
              <input
                type="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="01112345678"
                dir="ltr"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Age" : "السن"}
              </label>
              <input
                type="number"
                min="3"
                max="80"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
                placeholder={isEn ? "e.g. 12" : "مثال: 12"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Grade / School Level" : "المرحلة الدراسية"}
              </label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder={isEn ? "e.g. Grade 6 / Preparatory" : "مثال: أولى إعدادي"}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {isEn ? "Email Address (Optional)" : "البريد الإلكتروني (اختياري)"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              dir="ltr"
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {isEn ? "Notes / Source" : "ملاحظات أو مصدر المعرفة"}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isEn ? "e.g. Came via Facebook Ad, interested in Robotics" : "مثال: قادم من إعلان فيسبوك، مهتم بمسار الروبوتيكس"}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-border/80 bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {isEn ? "Cancel" : "إلغاء"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {isEn ? "Confirm Registration" : "تأكيد التسجيل"}
          </button>
        </div>
      </div>
    </div>
  );
}
