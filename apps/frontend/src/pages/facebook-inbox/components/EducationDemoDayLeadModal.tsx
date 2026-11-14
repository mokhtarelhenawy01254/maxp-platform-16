import React, { useEffect, useState } from "react";
import { GraduationCap, Calendar, Clock, MapPin, User, Phone, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { InboxConversation } from "@/types/inbox.types";
import { fetchDemoDays, registerAttendee } from "@/pages/admin/education-demo-day/api";
import type { DemoDayEvent } from "@/pages/admin/education-demo-day/types";

interface EducationDemoDayLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: InboxConversation | null;
  onCreated?: () => void;
  onInsertConfirmation?: (text: string) => void;
}

const AGE_OPTIONS = [
  { value: "6-9", label: "6 - 9 سنوات (Junior)" },
  { value: "10-13", label: "10 - 13 سنة (Intermediate)" },
  { value: "14-17", label: "14 - 17 سنة (Advanced)" },
  { value: "other", label: "مرحلة أخرى / غير محدد" },
];

export const EducationDemoDayLeadModal: React.FC<EducationDemoDayLeadModalProps> = ({
  isOpen,
  onClose,
  conversation,
  onCreated,
  onInsertConfirmation,
}) => {
  const [events, setEvents] = useState<DemoDayEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [registrationType, setRegistrationType] = useState<"demo_day" | "lead_only">("demo_day");
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const [studentName, setStudentName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [ageGroup, setAgeGroup] = useState("10-13");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setStudentName(conversation?.customerName || "");
    setGuardianName(conversation?.customerName || "");
    setPhone(conversation?.customerPhone || "");
    setAgeGroup("10-13");
    setNotes("");
    setRegistrationType("demo_day");

    // Fetch upcoming demo days
    setLoadingEvents(true);
    fetchDemoDays({ status: "ACTIVE" })
      .then((data) => {
        const activeEvents = Array.isArray(data) ? data : [];
        setEvents(activeEvents);
        if (activeEvents.length > 0) {
          setSelectedEventId(activeEvents[0].id);
        } else {
          setRegistrationType("lead_only");
        }
      })
      .catch((err) => {
        console.warn("Failed to load demo days for registration:", err);
      })
      .finally(() => {
        setLoadingEvents(false);
      });
  }, [isOpen, conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim() || !phone.trim()) {
      toast.error("يرجى إدخال اسم الطالب ورقم الهاتف للتواصل");
      return;
    }

    if (registrationType === "demo_day" && !selectedEventId) {
      toast.error("يرجى اختيار فعالية الديمو داي المطلوبة");
      return;
    }

    setSubmitting(true);
    try {
      const selectedEvent = events.find((ev) => ev.id === selectedEventId);
      const eventTargetId = selectedEventId || (events[0]?.id ?? "general");

      const payload = {
        studentName: studentName.trim(),
        guardianName: guardianName.trim() || studentName.trim(),
        phone: phone.trim(),
        age: ageGroup,
        notes: notes.trim()
          ? `${notes.trim()}${registrationType === "lead_only" ? " [طلب تفاصيل ومتابعة Lead]" : ""}`
          : registrationType === "lead_only"
          ? "طلب تفاصيل ومتابعة Lead"
          : "حجز من خلال شات فيسبوك",
        leadSource: "FACEBOOK",
        adId: conversation?.adId || undefined,
        postId: conversation?.postId || undefined,
      };

      await registerAttendee(eventTargetId, payload);

      const eventTitle = selectedEvent?.title || "الديمو داي القادم";
      toast.success(`تم تسجيل ${studentName.trim()} بنجاح كـ Lead في ${eventTitle}`);

      // Insert polite confirmation message into chat composer if available
      if (onInsertConfirmation) {
        const eventSchedule = selectedEvent
          ? `${new Date(selectedEvent.scheduledAt).toLocaleDateString("ar-EG", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })} الساعة ${new Date(selectedEvent.scheduledAt).toLocaleTimeString("ar-EG", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "الجمعة القادم الساعة 4:00 عصراً";

        const confirmationText =
          registrationType === "demo_day"
            ? `تم تسجيل حجز حضرتك في ${eventTitle} (${eventSchedule}) باسم ${studentName.trim()} ورقم ${phone.trim()}، تشرفونا في الموعد إن شاء الله.`
            : `تم تسجيل بيانات حضرتك (${studentName.trim()} - ${phone.trim()})، وسيقوم مسؤول المتابعة بالتواصل معكم هاتفياً لتقديم كافة التفاصيل والعروض.`;

        onInsertConfirmation(confirmationText);
      }

      onCreated?.();
      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "فشل تسجيل الحجز";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEvent = events.find((ev) => ev.id === selectedEventId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-5 bg-card text-foreground" dir="rtl">
        <DialogHeader className="text-right pb-2 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span>حجز ديمو داي / تسجيل عميل محتمل (Lead)</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            تسجيل الحضور في فعاليات الديمو داي أو إضافة العميل للمتابعة التلقائية وتلي سيلز الأكاديمية
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
          {/* Registration Mode Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-lg border border-border/50 text-xs">
            <button
              type="button"
              onClick={() => setRegistrationType("demo_day")}
              className={`py-1.5 px-2.5 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                registrationType === "demo_day"
                  ? "bg-background text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>حجز موعد ديمو داي</span>
            </button>
            <button
              type="button"
              onClick={() => setRegistrationType("lead_only")}
              className={`py-1.5 px-2.5 rounded-md font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                registrationType === "lead_only"
                  ? "bg-background text-foreground shadow-2xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>طلب تفاصيل (Lead فقط)</span>
            </button>
          </div>

          {/* Event Picker (if demo_day mode) */}
          {registrationType === "demo_day" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span>اختر فعالية الديمو داي المتاحة</span>
              </label>

              {loadingEvents ? (
                <div className="flex items-center justify-center p-3 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-border/40">
                  <Loader2 className="w-4 h-4 animate-spin ml-2 text-primary" />
                  <span>جاري تحميل مواعيد الديمو داي...</span>
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-1.5">
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} — {new Date(ev.scheduledAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })} (
                        {ev.locationType === "ONLINE" ? "أونلاين" : "بالفرع"})
                      </option>
                    ))}
                  </select>

                  {selectedEvent && (
                    <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{new Date(selectedEvent.scheduledAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>{selectedEvent.locationType === "ONLINE" ? "أونلاين عبر زووم / تيمز" : selectedEvent.room || "مقر الأكاديمية بالفرع"}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-center rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                  لا توجد فعاليات مجدولة حالياً. سيتم تسجيل العميل كـ Lead والتواصل معه فور جدولة أقرب ديمو.
                </div>
              )}
            </div>
          )}

          {/* Student & Phone Details */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <span>اسم الطالب / الطفل *</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="مثال: يوسف أحمد"
                className="w-full h-8.5 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span>رقم هاتف ولي الأمر (واتساب) *</span>
              </label>
              <input
                type="tel"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full h-8.5 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-right"
              />
            </div>
          </div>

          {/* Age Group */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              المرحلة العمرية للطالب
            </label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full h-8.5 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {AGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">
              ملاحظات أو أسئلة العميل
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: مهتم بتعلم لغات بايثون، يفضل الحضور بالفرع..."
              className="w-full h-8.5 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border/50 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs cursor-pointer"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التسجيل...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تأكيد تسجيل الحجز</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EducationDemoDayLeadModal;
