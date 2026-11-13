import React, { useState } from "react";
import { X, UserCheck, Gift, GraduationCap, DollarSign, Check, AlertCircle } from "lucide-react";
import { DemoDayAttendee } from "./types";

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (data: { packageId?: string; teacherId?: string; amountPaid?: number }) => Promise<void>;
  attendee: DemoDayAttendee | null;
  packages: { id: string; name: string; price: number; hoursCount: number }[];
  teachers: { id: string; name: string }[];
  isEn?: boolean;
}

export function ConvertLeadModal({
  isOpen,
  onClose,
  onConvert,
  attendee,
  packages,
  teachers,
  isEn = false,
}: ConvertLeadModalProps) {
  const [packageId, setPackageId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !attendee) return null;

  const selectedPkg = packages.find((p) => p.id === packageId);

  const handlePackageChange = (id: string) => {
    setPackageId(id);
    const p = packages.find((x) => x.id === id);
    if (p) {
      setAmountPaid(p.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConvert({
        packageId: packageId || undefined,
        teacherId: teacherId || undefined,
        amountPaid: amountPaid ? Number(amountPaid) : 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (isEn ? "Failed to convert lead" : "فشل تحويل العميل المحتمل إلى طالب"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isEn ? "Convert Lead to Official Student" : "تحويل العميل المحتمل إلى طالب رسمي"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {attendee.studentName} ({attendee.phone})
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Lead Summary Card */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-foreground font-semibold">
              <span>{attendee.studentName}</span>
              <span className="font-mono tabular-nums text-muted-foreground text-[11px]">{attendee.phone}</span>
            </div>
            {attendee.guardianName && (
              <div className="text-[11px] text-muted-foreground">
                {isEn ? "Guardian:" : "ولي الأمر:"} {attendee.guardianName}
              </div>
            )}
            {attendee.grade && (
              <div className="text-[11px] text-muted-foreground">
                {isEn ? "Grade:" : "المرحلة:"} {attendee.grade}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-primary" />
              {isEn ? "Session Package (Optional)" : "باقة الحصص الدراسية (اختياري)"}
            </label>
            <select
              value={packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">{isEn ? "-- No package right now --" : "-- بدون باقة حالياً (تسجيل ملف طالب فقط) --"}</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.hoursCount} {isEn ? "hrs" : "ساعة"} - {pkg.price} {isEn ? "EGP" : "ج.م"})
                </option>
              ))}
            </select>
          </div>

          {packageId && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  {isEn ? "Assigned Instructor" : "المدرب أو المعلم المسؤول"}
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">{isEn ? "-- Select Later --" : "-- تحديد المعلم لاحقاً --"}</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  {isEn ? "Amount Paid Now" : "المبلغ المدفوع الآن"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0.00"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-mono tabular-nums font-bold"
                />
                {selectedPkg && (
                  <p className="text-[11px] text-muted-foreground">
                    {isEn ? "Package Price:" : "سعر الباقة الإجمالي:"} {selectedPkg.price} {isEn ? "EGP" : "ج.م"}
                  </p>
                )}
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-border/80 bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
          >
            {isEn ? "Cancel" : "إلغاء"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 active:scale-[0.97] text-primary-foreground transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {isEn ? "Confirm Conversion" : "تأكيد التحويل لطالب"}
          </button>
        </div>
      </div>
    </div>
  );
}
